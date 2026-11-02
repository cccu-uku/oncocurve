// Kaplan-Meier Web Worker
// Achtung: Nur plain JS/TS, keine DOM-APIs!


// SurvivalDataPoint analog zu deiner App
type SurvivalDataPoint = {
  time: number;
  probability: number;
  atRisk: number;
  events: number;
  censored?: number;
  patientId?: string;
  icd10?: string;
  tCategory?: string;
  primaryCase?: boolean;
  diagnosisDate?: string;
  vitalDate?: string;
  event?: boolean;
  followupDate?: Date;
  upperCI?: number;
  lowerCI?: number;
  percentile95?: number;
  percentile5?: number;
  /** Kumulative Inzidenz statt Überleben, siehe boxkurve.ts. */
  cumulativeIncidence?: boolean;
};

type Patient = {
  [key: string]: any;
};


// 1:1 aus utils/kaplan-meier.ts übernommen

// Survival-Logik


/**
 * Wie die Aufrufseite die Kurve gerechnet haben will. Beide Angaben stammen aus
 * derselben Quelle: ob für die Kohorte eine Boxregel greift.
 */
type KurvenOptionen = {
  schaetzer: KurvenSchaetzer;
  zeitEinheit: ZeitEinheit;
};

// Aufbereitete, nach Zeit sortierte Kohorte. Beide Wege des Schätzers brauchen
// dieselbe Vorbereitung, deshalb steht sie hier einmal.
function gueltigePatienten(patients: Patient[], zeitEinheit: ZeitEinheit): Patient[] {
  const validPatients = patients
    .map(p => {
      let survivalTime = p.survivalTime;
      if (typeof survivalTime !== "number" || isNaN(survivalTime)) {
        if (p.birthDate && (p.deathDate || p.followupDate)) {
          const birth = new Date(p.birthDate);
          const end = new Date(p.deathDate || p.followupDate);
          if (!isNaN(birth.getTime()) && !isNaN(end.getTime())) {
            survivalTime = (end.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
          }
        }
      }
      return { ...p, survivalTime } as Patient;
    })
    .filter(p =>
      typeof p.survivalTime === "number" &&
      !isNaN(p.survivalTime) &&
      gueltigeZeit(p.survivalTime, zeitEinheit),
    );
  validPatients.sort((a, b) => (a.survivalTime as number) - (b.survivalTime as number));
  return validPatients;
}

// Step-Function und CI/Percentile-Logik
function calculateKaplanMeier(patients: Patient[], zeitEinheit: ZeitEinheit): SurvivalDataPoint[] {
  if (!patients || patients.length === 0) return [];
  const validPatients = gueltigePatienten(patients, zeitEinheit);

  // PERF: single-pass Kaplan-Meier in O(n log n) instead of the previous
  // O(n^2) (which filtered all patients at every event time and froze on large
  // cohorts). Sort once by time; the number at risk at a time is then simply the
  // count of not-yet-processed patients (those with time >= current time).
  const N = validPatients.length;
  if (N === 0) return [];

  // Group consecutive equal times: [start, start+size) share one event time.
  const groups: { time: number; start: number; size: number }[] = [];
  for (let j = 0; j < N; ) {
    const t = validPatients[j].survivalTime as number;
    let k = j + 1;
    while (k < N && (validPatients[k].survivalTime as number) === t) k++;
    groups.push({ time: t, start: j, size: k - j });
    j = k;
  }

  const stepData: SurvivalDataPoint[] = [];
  let survival = 1;
  for (let g = 0; g < groups.length; g++) {
    const { time, start, size } = groups[g];
    const atRisk = N - start; // patients with survivalTime >= time (sorted)
    // events + marker patient within this time group
    let events = 0;
    let markerPatient: Patient | undefined;
    let censMarker: Patient | undefined;
    for (let m = start; m < start + size; m++) {
      const p = validPatients[m];
      if (p.event) {
        events++;
        if (!markerPatient) markerPatient = p;
      } else if (!censMarker && p.followupDate) {
        censMarker = p;
      }
    }
    if (!markerPatient) markerPatient = censMarker;

    // CI/Percentile dummy values (overwritten downstream by computeKaplanMeierCI)
    const upperCI = 0.95 * survival;
    const lowerCI = 0.10 * survival;
    const percentile95 = 0.95 * survival;
    const percentile5 = 0.05 * survival;
    if (atRisk > 0 && events > 0) {
      survival *= (1 - events / atRisk);
    }

    const marker = {
      event: markerPatient ? markerPatient.event : undefined,
      patientId: markerPatient ? markerPatient.id || markerPatient.patientId : undefined,
      icd10: markerPatient ? markerPatient.icd10 || markerPatient.tumorLocation || markerPatient.lokalisation || markerPatient.tumorType : undefined,
      followupDate: markerPatient ? markerPatient.followupDate : undefined,
      vitalDate: markerPatient ? markerPatient.vitalDate || markerPatient.endedatum : undefined,
    };

    // censored at this exact time = the non-event patients in this time group.
    const censored = size - events;

    stepData.push({ time, probability: survival, atRisk, events, censored, upperCI, lowerCI, percentile95, percentile5, ...marker });

    // Horizontal step segment: NO new event, so events MUST be 0 here (otherwise
    // computeKaplanMeierCI, which re-derives S(t) from events/atRisk, would apply
    // the hazard twice). Validated against R/lifelines.
    if (g < groups.length - 1) {
      stepData.push({ time: groups[g + 1].time - 0.01, probability: survival, atRisk, events: 0, censored: 0, upperCI, lowerCI, percentile95, percentile5, ...marker });
    }
  }
  return stepData;
}

/**
 * Kurve nach der Vorschrift einer OncoBox: eine Zeile je Fall statt einer
 * Zeile je Zeitpunkt. Die Markerfelder bleiben dieselben wie oben, damit
 * Diagramm und Tabelle sich zwischen den Verfahren nicht unterscheiden.
 */
function boxKurve(
  patients: Patient[],
  schaetzer: "sequentiell" | "kumulativeInzidenz",
  zeitEinheit: ZeitEinheit,
): SurvivalDataPoint[] {
  const valid = gueltigePatienten(patients, zeitEinheit);
  if (valid.length === 0) return [];
  const punkte = boxKurvenPunkte(
    valid.map(p => ({
      zeit: p.survivalTime as number,
      ereignis: Boolean(p.event),
      konkurrenz: Boolean(p.konkurrenz),
    })),
    schaetzer,
  );
  return punkte.map((punkt, i) => {
    const p = valid[i];
    return {
      ...punkt,
      // Platzhalter wie oben; computeKaplanMeierCI setzt sie später neu.
      upperCI: punkt.probability,
      lowerCI: punkt.probability,
      percentile95: punkt.probability,
      percentile5: punkt.probability,
      event: p.event,
      patientId: p.id || p.patientId,
      icd10: p.icd10 || p.tumorLocation || p.lokalisation || p.tumorType,
      followupDate: p.followupDate,
      vitalDate: p.vitalDate || p.endedatum,
    };
  });
}

/**
 * Welches Verfahren gilt, entscheidet die Aufrufseite und schickt es im
 * Auftrag mit. Ohne Angabe bleibt es bei der üblichen Konvention, die für
 * oBDS, CSV, TXT und Excel richtig ist.
 */
function berechneKurve(patients: Patient[], optionen: KurvenOptionen): SurvivalDataPoint[] {
  if (!patients || patients.length === 0) return [];
  const { schaetzer, zeitEinheit } = optionen;
  if (schaetzer === "sequentiell" || schaetzer === "kumulativeInzidenz") {
    return boxKurve(patients, schaetzer, zeitEinheit);
  }
  return calculateKaplanMeier(patients, zeitEinheit);
}


// --- Helpers for tumorType ICD10 extraction and KM-data check ---
const extractIcd10FromTumorType = (tumorType: any) => {
  if (!tumorType || typeof tumorType !== 'string') return 'Keine Angabe';
  const parts = tumorType.split('-');
  const code = parts[0].trim();
  return code === '' ? 'Keine Angabe' : code;
};

const normalizeTNGroup = (value: any, designator: 'N' | 'M'): string | null => {
  if (!value || typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const upper = trimmed.toUpperCase();
  const match = upper.match(new RegExp(`${designator}[0-9A-Z]*`));
  if (match && match[0]) return match[0];
  const stripped = upper.replace(/^[CPU]\s*/, '');
  const strippedMatch = stripped.match(new RegExp(`${designator}[0-9A-Z]*`));
  if (strippedMatch && strippedMatch[0]) return strippedMatch[0];
  if (/^[0-9A-Z]+$/.test(stripped)) {
    return `${designator}${stripped}`;
  }
  return null;
};

const patientHasKaplanMeierData = (p: any, zeitEinheit: ZeitEinheit) => {
  let survivalTime = p.survivalTime;
  if (typeof survivalTime !== 'number' || isNaN(survivalTime)) {
    if (p.birthDate && (p.deathDate || p.followupDate)) {
      const birth = new Date(p.birthDate);
      const end = new Date(p.deathDate || p.followupDate);
      if (!isNaN(birth.getTime()) && !isNaN(end.getTime())) {
        survivalTime = (end.getTime() - birth.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
      }
    }
  }
  return typeof survivalTime === 'number' && !isNaN(survivalTime) && gueltigeZeit(survivalTime, zeitEinheit);
};

// Use shared color palette for consistency
import KAPLAN_MEIER_COLORS from "./kaplan-meier-colors";
import { normalizeTOneDigit, normalizeTTwoDigit } from "./tnm-normalize";
import { getAgeGroup } from "./age-group";
import { boxKurvenPunkte, gueltigeZeit, type KurvenSchaetzer } from "./boxkurve";
import type { ZeitEinheit } from "./endpunkte/anwenden";
const CURVE_COLORS = KAPLAN_MEIER_COLORS;

const getCurveColor = (idx: number) => CURVE_COLORS[idx % CURVE_COLORS.length];

self.onmessage = function (e) {
  const { patients, stratificationConfig, groupIds, reqId } = e.data;
  // Der Worker kennt keine Übersetzung, deshalb liefert die Aufrufseite den
  // fertig übersetzten Namen für die unstratifizierte Kurve mit; siehe
  // "overallTotal" in Results (locales/de.json, locales/en.json).
  const overallLabel: string = e.data.overallLabel;
  // Ohne Angabe bleibt es bei der üblichen Konvention in Monaten, die für
  // oBDS, CSV, TXT und Excel richtig ist.
  const optionen: KurvenOptionen = {
    schaetzer: e.data.schaetzer ?? "gruppiert",
    zeitEinheit: e.data.zeitEinheit ?? "monate",
  };
  let result = [];
  try {
    if (stratificationConfig && stratificationConfig.criterion && stratificationConfig.groups) {
      const criterion = stratificationConfig.criterion;
      let groups = stratificationConfig.groups;
      // Zentrale Filterung: Nur Gruppen, die im Filter/Plot aktiv sind (z.B. nur selektierte Gruppen)
      if (stratificationConfig.selectedGroupIds && Array.isArray(stratificationConfig.selectedGroupIds)) {
        groups = groups.filter((g: any) => stratificationConfig.selectedGroupIds.includes(g.id));
      }

      // Generic precomputed-groupIds path. The caller hands us a parallel
      // array of group ids (same length as `patients`) and we bucket + run
      // KM here. Used for any criterion whose per-patient classification
      // logic is too domain-specific for this worker to know about (extras
      // columns with custom bins, entityStaging that needs the Wiley rules,
      // etc.). Lets the heavy KM work run off the main thread without the
      // worker needing to import classification logic.
      if (Array.isArray(groupIds) && groupIds.length === patients.length) {
        const buckets = new Map<string, any[]>();
        for (let i = 0; i < patients.length; i++) {
          const gid = groupIds[i];
          if (gid == null) continue;
          const bucket = buckets.get(gid);
          if (bucket) bucket.push(patients[i]);
          else buckets.set(gid, [patients[i]]);
        }
        result = groups.map((group: any, idx: number) => {
          const groupPatients = buckets.get(group.id) ?? [];
          const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
          return {
            id: group.id,
            name: group.name,
            color: group.color || getCurveColor(idx),
            data: curveData,
          };
        });
        self.postMessage({ curves: result, reqId });
        return;
      }

      // Central switch-case for all stratification criteria
      switch (criterion) {
        case "diagnose":
        case "tumorType":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => {
              const source = p.diagnose || p.tumorType || p.tumorLocation || p.lokalisation;
              const code = extractIcd10FromTumorType(source);
              return code === group.id && patientHasKaplanMeierData(p, optionen.zeitEinheit);
            });
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "staging":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => {
              if (!p.staging || p.staging.uicc === undefined || p.staging.uicc === null) return false;
              return String(p.staging.uicc) === String(group.id);
            });
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "grading":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.grading === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "primaerfall":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.primaerfall === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "lokalisation":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.lokalisation === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "tumorid":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => String(p.tumorid) === String(group.id));
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "startdatum":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.startdatum === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "endedatum":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.endedatum === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "tCategoryOneDigit": {
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => normalizeTOneDigit(p.staging?.tOneDigit || p.staging?.tCategory || null) === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        }
        case "tCategoryTwoDigit": {
          const tOf = (p: any) => normalizeTTwoDigit(p.staging?.tTwoDigit || p.staging?.tCategory || null);
          const uniqueT = Array.from(new Set(patients.map(tOf))).filter((t) => t && t !== '');
          result = uniqueT.map((label, idx) => {
            const groupPatients = patients.filter((p: any) => tOf(p) === label);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: label }));
            return { id: label, name: label, color: getCurveColor(idx), data: curveData };
          });
          break;
        }
        case "tPathological":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.staging?.tPathological === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "tPathologicalOneDigit": {
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => normalizeTOneDigit(p.staging?.tPathological || null, "pathological") === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        }
        case "tPathologicalTwoDigit": {
          const tOf = (p: any) => normalizeTTwoDigit(p.staging?.tPathological || null, "pathological");
          const uniqueT = Array.from(new Set(patients.map(tOf))).filter((t) => t && t !== '');
          result = uniqueT.map((label, idx) => {
            const groupPatients = patients.filter((p: any) => tOf(p) === label);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: label }));
            return { id: label, name: label, color: getCurveColor(idx), data: curveData };
          });
          break;
        }
        case "tClinical":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.staging?.tClinical === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "tClinicalOneDigit": {
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => normalizeTOneDigit(p.staging?.tClinical || null, "clinical") === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        }
        case "tClinicalTwoDigit": {
          const tOf = (p: any) => normalizeTTwoDigit(p.staging?.tClinical || null, "clinical");
          const uniqueT = Array.from(new Set(patients.map(tOf))).filter((t) => t && t !== '');
          result = uniqueT.map((label, idx) => {
            const groupPatients = patients.filter((p: any) => tOf(p) === label);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: label }));
            return { id: label, name: label, color: getCurveColor(idx), data: curveData };
          });
          break;
        }
        case "nCategory":
          result = groups.map((group: any, idx: number) => {
            const normalizedGroupId = normalizeTNGroup(group.id, 'N') ?? group.id;
            const legend = normalizedGroupId;
            const groupPatients = patients.filter((p: any) => {
              const patientValue = normalizeTNGroup(
                p.staging?.nCategory ?? p.staging?.tnm?.pN ?? p.staging?.tnm?.cN,
                'N'
              );
              return patientValue === normalizedGroupId;
            });
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: legend, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "mCategory":
          result = groups.map((group: any, idx: number) => {
            const normalizedGroupId = normalizeTNGroup(group.id, 'M') ?? group.id;
            const legend = normalizedGroupId;
            const groupPatients = patients.filter((p: any) => {
              const patientValue = normalizeTNGroup(
                p.staging?.mCategory ?? p.staging?.tnm?.pM ?? p.staging?.tnm?.cM,
                'M'
              );
              return patientValue === normalizedGroupId;
            });
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: legend, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "tumorMainCategory":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.tumorMainCategory === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "tumorSubCategory":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.tumorSubCategory === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "spreadCategory":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.spreadCategory === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "entityStaging":
          // EntityStaging: Kombi aus Entität und Stadium
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => {
              // group.id ist z.B. "Brust__IIIA"
              if (!group.id || !group.id.includes("__")) return false;
              const [entity, stage] = group.id.split("__");
              const patientEntity = p.tumorSubCategory || p.tumorType || "Unbekannt";
              const t = p.staging?.tCategory || p.staging?.tPathological || p.staging?.tClinical;
              const n = p.staging?.nCategory;
              const m = p.staging?.mCategory;
              let method: "klinisch" | "pathologisch" | undefined = undefined;
              if (t?.startsWith("p")) method = "pathologisch";
              else if (t?.startsWith("c")) method = "klinisch";
              // getEntityStaging ist Frontend-Logik, hier ggf. nachbauen oder importieren
              // Für jetzt: Stringvergleich
              return patientEntity === entity && (p.staging?.uicc === stage || t === stage);
            });
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return { id: group.id, name: group.name, color: group.color || getCurveColor(idx), data: curveData };
          });
          break;
        case "diagnosisYear": {
          // Diagnosejahr: Eine Kurve pro Jahr (nicht Jahr-Ranges)
          const getDiagnosisYear = (p: any) => {
            // Try multiple date parsing strategies
            if (!p.diagnosisDate) return null;
            
            // Strategy 1: Direct Date object
            if (p.diagnosisDate && typeof p.diagnosisDate === 'object' && 'getFullYear' in p.diagnosisDate) {
              return p.diagnosisDate.getFullYear();
            }
            
            // Strategy 2: ISO string (from sessionStorage)
            if (typeof p.diagnosisDate === 'string') {
              // Remove timezone info and parse as local date
              const dateStr = p.diagnosisDate.replace(/Z$/, '').split('T')[0];
              if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-').map(Number);
                // Validate year is reasonable
                if (year >= 1900 && year <= 2100) {
                  return year;
                }
              }
              
              // Fallback: try new Date()
              const d = new Date(p.diagnosisDate);
              if (!isNaN(d.getTime())) {
                return d.getFullYear();
              }
            }
            
            return null;
          };
          
          // PERF: parse year ONCE per patient and bucket in a single pass.
          // The previous version called getDiagnosisYear ~(1 + Y) times per
          // patient (once for the year set, once per year inside the
          // filter), which is wasteful — getDiagnosisYear does regex tests
          // and Date construction.
          const yearBuckets = new Map<number, any[]>();
          for (const p of patients) {
            const year = getDiagnosisYear(p);
            if (year === null) continue;
            const bucket = yearBuckets.get(year);
            if (bucket) bucket.push(p);
            else yearBuckets.set(year, [p]);
          }
          const sortedYears = Array.from(yearBuckets.keys()).sort((a, b) => a - b);
          result = sortedYears.map((year, idx) => {
            const yearStr = year.toString();
            const groupPatients = yearBuckets.get(year) ?? [];
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: yearStr }));
            const groupConfig = groups.find((g: any) => g.id === yearStr);
            return {
              id: yearStr,
              name: yearStr,
              color: groupConfig?.color || getCurveColor(idx),
              data: curveData
            };
          });
          break;
        }
        case "none":
        case "overall":
          // Overall curve: all patients
          result = [{
            id: "overall",
            name: overallLabel,
            color: getCurveColor(0),
            data: berechneKurve(patients, optionen).map((d: any) => ({ ...d, group: "overall" }))
          }];
          break;
        case "ageGroup": {
          // Verwende exakt die Gruppen aus StratificationConfig.groups (Frontend), damit die Reihenfolge und Farben übereinstimmen
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => getAgeGroup(p.age) === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return {
              id: group.id,
              name: group.name,
              color: group.color || getCurveColor(idx),
              data: curveData
            };
          });
          break;
        }
        case "staging": {
          // UICC-Gruppen explizit aus stratificationConfig.groups verwenden, robustes Matching
          const normalizeUicc = (val: any) => {
            if (val === undefined || val === null) return '';
            return String(val).replace(/uicc/gi, '').replace(/[^a-zA-Z0-9]/g, '').trim().toUpperCase();
          };
          result = groups.map((group: any, idx: number) => {
            const groupNorm = normalizeUicc(group.id);
            const groupPatients = patients.filter((p: any) => {
              if (!p.staging || p.staging.uicc === undefined || p.staging.uicc === null) return false;
              const valNorm = normalizeUicc(p.staging.uicc);
              return valNorm === groupNorm;
            });
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return {
              id: group.id,
              name: group.name,
              color: group.color || getCurveColor(idx),
              data: curveData
            };
          });
          break;
        }
        case "gender":
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => p.gender === group.id);
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return {
              id: group.id,
              name: group.name,
              color: group.color || getCurveColor(idx),
              data: curveData
            };
          });
          break;
        // TODO: Add all other explicit cases here, matching frontend logic
        default:
          // Fallback: generic group assignment (to be replaced by explicit logic for each criterion)
          result = groups.map((group: any, idx: number) => {
            const groupPatients = patients.filter((p: any) => {
              let val;
              if (criterion.includes('.')) {
                val = (criterion.split('.') as string[]).reduce((acc: any, key: any) => acc && acc[key], p);
              } else {
                val = p[criterion];
              }
              return val === group.id;
            });
            const curveData = berechneKurve(groupPatients, optionen).map((d: any) => ({ ...d, group: group.id }));
            return {
              id: group.id,
              name: group.name,
              color: group.color || getCurveColor(idx),
              data: curveData
            };
          });
          break;
      }
    } else {
      // Overall-Kurve: Alle Patienten
      const data = berechneKurve(patients, optionen).map(d => ({ ...d, group: "overall" }));
      result = [{
        id: "overall",
        name: overallLabel,
  color: getCurveColor(0),
        data
      }];
    }
    self.postMessage({ curves: result, reqId });
  } catch (err) {
    let msg = "Unbekannter Fehler";
    if (err && typeof err === "object" && "message" in err) msg = (err as any).message;
    else msg = String(err);
    self.postMessage({ error: msg, reqId });
  }
};
