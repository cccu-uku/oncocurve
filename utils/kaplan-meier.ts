// Hilfsfunktionen für Kaplan-Meier-Analysen

export interface SurvivalDataPoint {
  time: number;
  probability: number; // Überlebenswahrscheinlichkeit (0-1)
  atRisk: number;      // Anzahl Patienten zu Beginn des Intervalls
  events: number;      // Anzahl Ereignisse im Intervall
  censored?: number;   // Anzahl Zensierungen an diesem Zeitpunkt
  // Optional: Metadaten zu Ereignissen an diesem Zeitpunkt
  eventPatientIds?: string[];
  eventIcd10Codes?: string[];
  /**
   * probability ist eine kumulative Inzidenz und steigt von null, statt von
   * eins zu fallen. Nur die Lokalrezidivrate setzt das Merkmal, siehe
   * components/kaplan-meier/boxkurve.ts.
   */
  cumulativeIncidence?: boolean;
}

export interface SurvivalDataPointWithCI extends SurvivalDataPoint {
  upperCI: number; // Obere Konfidenzgrenze (0-1)
  lowerCI: number; // Untere Konfidenzgrenze (0-1)
  stdErr: number;  // Standardfehler auf Überlebensskala (Greenwood)
}

const Z_95 = 1.959963984540054; // 97.5% Quantil der Standardnormal

export type TimeUnit = "months" | "days";

/** Average calendar month length, matching the constant duplicated across
 * dfs.ts / allgemeine-regel.ts / results/page.tsx for days<->months conversions. */
export const DAYS_PER_MONTH = 30.4375;

export function convertTimeUnit(value: number, from: TimeUnit, to: TimeUnit): number {
  if (from === to) return value;
  return from === "days" ? value / DAYS_PER_MONTH : value * DAYS_PER_MONTH;
}

// Month candidates already land on whole years from 12 upward (12, 24, 36,
// 60, 120, ...). Day candidates mirror that: whole weeks/months for short
// cohorts, whole years (365-multiples) once the range gets large.
const MONTH_TICK_CANDIDATES = [1, 3, 6, 12, 24, 36, 60, 120, 240, 360, 600];
const DAY_TICK_CANDIDATES = [7, 14, 30, 90, 180, 365, 730, 1825, 3650, 7300, 14600];

/**
 * Picks a "nice" tick interval so that the resulting tick set has at most
 * ~`targetCount` ticks. Used for both the KM plot x-axis and the at-risk plot
 * so the labels never overlap on long-followed cohorts.
 *
 * Candidate intervals depend on `unit`: months use {1, 3, 6, 12, 24, 36, 60,
 * 120, ...}, days use {7, 14, 30, 90, 180, 365, 730, ...}; both extend with
 * multiples of a full year for very long cohorts.
 *
 * Returns the actual list of tick positions {0, step, 2*step, ..., >= maxTime}.
 */
export function niceTimeTicks(maxTime: number, targetCount = 10, unit: TimeUnit = "months"): number[] {
  if (!isFinite(maxTime) || maxTime <= 0) return [0];
  const candidates = unit === "days" ? DAY_TICK_CANDIDATES : MONTH_TICK_CANDIDATES;
  const yearStep = unit === "days" ? 365 : 12;
  let step = candidates[candidates.length - 1];
  for (const c of candidates) {
    if (Math.ceil(maxTime / c) + 1 <= targetCount) { step = c; break; }
  }
  // If even the largest candidate is too small, round up to keep target count.
  if (Math.ceil(maxTime / step) + 1 > targetCount) {
    step = Math.ceil(maxTime / targetCount / yearStep) * yearStep;
  }
  const ticks: number[] = [];
  const last = Math.ceil(maxTime / step) * step;
  for (let t = 0; t <= last; t += step) ticks.push(t);
  return ticks;
}

/**
 * Feste Marken im Fünfjahresabstand, in Monaten.
 *
 * Für den Vergleich mehrerer Auswertungen untereinander: eine automatisch
 * gewählte Schrittweite ändert sich mit der Kohorte, und zwei Abbildungen
 * nebeneinander tragen dann verschiedene Achsen. Fünf Jahre sind der Abstand,
 * in dem onkologische Nachbeobachtung ohnehin berichtet wird.
 */
export const FIVE_YEAR_TICKS_MONTHS = [0, 60, 120, 180, 240, 300, 360, 420];

/**
 * Dieselben Marken, aber nur so weit, wie die Kohorte reicht, plus die erste
 * Marke dahinter.
 *
 * Ohne diese Begrenzung stünde eine Kurve über fünf Jahre im linken Achtel
 * einer Achse bis fünfunddreissig Jahre, und der Rest bliebe leer. Die Marken
 * selbst bleiben dieselben, es werden nur die hinteren weggelassen.
 *
 * maxTime und das Ergebnis stehen in `unit`. Die Liste ist in Monaten
 * definiert und wird für eine Tageachse umgerechnet und auf ganze Tage
 * gerundet, sonst stünde "1826.25" an der Achse.
 */
export function fixedFiveYearTicks(maxTime: number, unit: TimeUnit = "months"): number[] {
  const inMonaten = unit === "days" ? convertTimeUnit(maxTime, "days", "months") : maxTime;
  const grenze = isFinite(inMonaten) && inMonaten > 0 ? inMonaten : 0;
  const dahinter = FIVE_YEAR_TICKS_MONTHS.findIndex((m) => m >= grenze);
  // Mindestens zwei Marken, sonst hat die Achse keine Ausdehnung.
  const anzahl = dahinter === -1 ? FIVE_YEAR_TICKS_MONTHS.length : Math.max(dahinter + 1, 2);
  const marken = FIVE_YEAR_TICKS_MONTHS.slice(0, anzahl);
  if (unit !== "days") return marken;
  return marken.map((m) => Math.round(convertTimeUnit(m, "months", "days")));
}

/**
 * Left/right bounds for the shared x-axis range of the KM plot and the
 * at-risk plot below it. Both MUST use this so their columns stay aligned.
 *
 * The left edge is padded by half a tick step instead of a fixed constant:
 * a fixed pixel-ish buffer looks fine at the step size it was tuned for, but
 * shrinks to nothing (numbers/text glued to the axis line) once the axis
 * spans a much larger range with a much larger step.
 */
export function xAxisPlotRange(xTicks: number[], maxTick: number): [number, number] {
  if (xTicks.length === 0) return [0, maxTick];
  const step = xTicks.length > 1 ? xTicks[1] - xTicks[0] : (maxTick || 1);
  const buffer = step / 2;
  return [Math.min(0, Math.min(...xTicks) - buffer), maxTick];
}

/**
 * Berechnet die Kaplan-Meier-Konfidenzintervalle (Greenwood-Formel, log-log-Methode, 95%)
 * @param data Survival-Kurve (sortiert nach Zeit)
 * @param alpha Signifikanzniveau (Standard: 0.05 für 95% CI)
 * @returns Survival-Kurve mit upperCI/lowerCI/stdErr
 */
export function computeKaplanMeierCI(
  data: SurvivalDataPoint[],
  alpha = 0.05
): SurvivalDataPointWithCI[] {
  const z = alpha === 0.05 ? Z_95 : invNormalCdfUpperTail(alpha / 2);
  let survival = 1;
  let varSum = 0; // Σ d_i / (n_i * (n_i - d_i)) — Greenwood
  const result: SurvivalDataPointWithCI[] = [];

  for (let i = 0; i < data.length; i++) {
    const { atRisk, events } = data[i];
    // Eine kumulative Inzidenz ist kein Kaplan-Meier-Produkt. Sie hier aus
    // events und atRisk neu zu bilden überschriebe die gerechnete Rate mit
    // einer Überlebenskurve. Greenwood gilt dafür ebenso wenig, deshalb kein
    // Band: eine falsche Spanne wäre schlimmer als keine.
    if (data[i].cumulativeIncidence) {
      result.push({
        ...data[i],
        upperCI: data[i].probability,
        lowerCI: data[i].probability,
        stdErr: 0,
      });
      continue;
    }
    if (atRisk === 0) {
      result.push({ ...data[i], upperCI: survival, lowerCI: survival, stdErr: 0 });
      continue;
    }
    // KM-Schätzer
    const q = 1 - events / atRisk;
    survival = survival * q;
    // Greenwood-Varianz
    if (events > 0 && atRisk - events > 0) {
      varSum += events / (atRisk * (atRisk - events));
    }
    const se = survival * Math.sqrt(varSum);
    // log(-log(S))-Transformation für CI, um S ∈ [0,1] sicherzustellen
    let lower = survival;
    let upper = survival;
    if (survival > 0 && survival < 1 && varSum > 0) {
      const logS = Math.log(survival);
      const seLoglog = Math.sqrt(varSum) / Math.abs(logS);
      const loglog = Math.log(-logS);
      lower = Math.exp(-Math.exp(loglog + z * seLoglog));
      upper = Math.exp(-Math.exp(loglog - z * seLoglog));
    }
    result.push({
      ...data[i],
      probability: survival,
      upperCI: Math.min(Math.max(upper, 0), 1),
      lowerCI: Math.min(Math.max(lower, 0), 1),
      stdErr: se,
    });
  }
  return result;
}

/**
 * Interpoliert die Kaplan-Meier-Kurve an fixen Zeitpunkten.
 * Step-Function-Semantik: S(t) = S(letztes Event vor oder gleich t).
 * Liefert survival, CI, at risk, kumulative Events/Zensierungen.
 */
export interface KMTimepoint {
  time: number;
  survival: number;
  stdErr: number;
  ciLower95: number;
  ciUpper95: number;
  nAtRisk: number;
  nEventsCumulative: number;
  nCensoredCumulative: number;
}

export function computeKMAtTimepoints(
  data: SurvivalDataPointWithCI[],
  timepoints: number[]
): KMTimepoint[] {
  if (!data.length) return timepoints.map(t => ({
    time: t, survival: NaN, stdErr: NaN,
    ciLower95: NaN, ciUpper95: NaN,
    nAtRisk: 0, nEventsCumulative: 0, nCensoredCumulative: 0,
  }));

  // Aggregiere kumulative Events/Zensierungen aus der Step-Funktion
  // Hinweis: Die Eingabedaten hier sind pro Patient (events=0/1) und pro Event-Zeit.
  let cumEvents = 0;
  let cumCensored = 0;
  const withCum = data.map(d => {
    cumEvents += d.events;
    const censoredHere = Math.max(0, 1 - d.events); // per-Patient-Semantik: 0/1
    cumCensored += censoredHere;
    return { ...d, cumEvents, cumCensored };
  });

  return timepoints.map(t => {
    // Letzter Datenpunkt mit time ≤ t
    let idx = -1;
    for (let i = 0; i < withCum.length; i++) {
      if (withCum[i].time <= t) idx = i;
      else break;
    }
    if (idx < 0) {
      // Vor erstem Event — S(t) = 1
      const nAtRisk0 = withCum[0]?.atRisk ?? 0;
      return {
        time: t, survival: 1, stdErr: 0,
        ciLower95: 1, ciUpper95: 1,
        nAtRisk: nAtRisk0, nEventsCumulative: 0, nCensoredCumulative: 0,
      };
    }
    const p = withCum[idx];
    return {
      time: t,
      survival: p.probability,
      stdErr: p.stdErr,
      ciLower95: p.lowerCI,
      ciUpper95: p.upperCI,
      nAtRisk: p.atRisk,
      nEventsCumulative: p.cumEvents,
      nCensoredCumulative: p.cumCensored,
    };
  });
}

/**
 * Berechnet das p-Quantil der KM-Kurve (z.B. p=0.5 → Median) mit 95%-CI.
 * CI nach Brookmeyer-Crowley: {t : (S(t) - p)^2 ≤ z² · Var(S(t))}.
 * @returns { time, ciLower, ciUpper, reached }
 */
export interface KMPercentile {
  p: number;
  time: number | null;   // null wenn nicht erreicht
  ciLower: number | null;
  ciUpper: number | null;
  reached: boolean;
}

export function computeKMPercentile(
  data: SurvivalDataPointWithCI[],
  p: number
): KMPercentile {
  // Eine kumulative Inzidenz startet bei null und steigt. Die Suche nach dem
  // ersten Wert unter p träfe dort den allerersten Punkt und meldete ihn als
  // Median. Eine Rate hat kein Überlebensquantil, deshalb "nicht erreicht".
  if (data[0]?.cumulativeIncidence) {
    return { p, time: null, ciLower: null, ciUpper: null, reached: false };
  }
  // time = erster Zeitpunkt mit S(t) ≤ p
  const hit = data.find(d => d.probability <= p);
  const time = hit ? hit.time : null;

  // CI: Brookmeyer-Crowley
  // Finde alle Zeitpunkte, an denen die Hypothese S(t) = p nicht verworfen wird.
  // Teststatistik: (S(t) - p)² / Var(S(t)) ≤ z²
  // CI = [min solcher Zeiten, max solcher Zeiten]
  const z2 = Z_95 * Z_95;
  let ciLowerTime: number | null = null;
  let ciUpperTime: number | null = null;
  for (const d of data) {
    if (d.stdErr <= 0) continue;
    const stat = (d.probability - p) ** 2 / (d.stdErr * d.stdErr);
    if (stat <= z2) {
      if (ciLowerTime === null) ciLowerTime = d.time;
      ciUpperTime = d.time;
    }
  }

  return {
    p,
    time,
    ciLower: ciLowerTime,
    ciUpper: ciUpperTime,
    reached: time !== null,
  };
}

/**
 * Reverse-Kaplan-Meier für median follow-up.
 * Man tauscht Event und Zensierung: S*(t) = KM((time, 1-event)).
 * Der Median dieser "Zensierungs-Überlebensfunktion" ist der
 * konventionelle median follow-up (Schemper/Smith 1996).
 */
export interface ReverseKMFollowUp {
  median: number | null;
  ciLower: number | null;
  ciUpper: number | null;
  reached: boolean;
}

export function computeReverseKMFollowUp(
  patients: Array<{ time: number; event: boolean }>
): ReverseKMFollowUp {
  if (!patients.length) return { median: null, ciLower: null, ciUpper: null, reached: false };
  // Pro Patient: time, events = (1 - event) → Zensierte werden zu "Events"
  const sorted = patients
    .filter(p => typeof p.time === 'number' && !isNaN(p.time) && p.time > 0)
    .slice()
    .sort((a, b) => a.time - b.time);

  let atRisk = sorted.length;
  const points: SurvivalDataPoint[] = sorted.map(p => {
    const rec: SurvivalDataPoint = {
      time: p.time,
      probability: 1, // wird in computeKaplanMeierCI neu gesetzt
      atRisk,
      events: p.event ? 0 : 1, // umgedreht
    };
    atRisk--;
    return rec;
  });
  const withCI = computeKaplanMeierCI(points);
  const median = computeKMPercentile(withCI, 0.5);
  return {
    median: median.time,
    ciLower: median.ciLower,
    ciUpper: median.ciUpper,
    reached: median.reached,
  };
}

// ============================================================================
// Log-Rank-Test
// ============================================================================

export interface LogRankPerGroup {
  group: string;
  observed: number;
  expected: number;
  variance: number;                      // Diagonalvarianz V[i,i]
  oMinusESqOverE: number;                // (O-E)²/E
  oMinusESqOverV: number;                // (O-E)²/V[i,i]
}

export interface LogRankResult {
  chiSquared: number;
  df: number;
  pValue: number;
  nGroups: number;
  perGroup: LogRankPerGroup[];
  method: LogRankMethod;
}

export type LogRankMethod = "logRank" | "wilcoxon" | "petoPeto" | "taroneWare";

/**
 * Weighted log-rank family test for 2 or more groups.
 * Test statistic: U^T V^{-1} U with U_i = sum_j w_j (d_ij - n_ij d_j / n_j) and
 * V_ij weighted analogously with w_j^2. df = K-1.
 *
 * Weight w_j at event time t_j depends on `method`:
 *   - "logRank"   : w = 1                   (Mantel-Haenszel; default)
 *   - "wilcoxon"  : w = n(t_j)              (Gehan-Breslow)
 *   - "petoPeto"  : w = S~(t_{j-})          (modified Kaplan-Meier estimator
 *                                            of the pooled curve, Peto-Prentice)
 *   - "taroneWare": w = sqrt(n(t_j))
 *
 * @param curves     Array of survival curves (each sorted by time)
 * @param groupNames Optional: group names; defaults to "1", "2", …
 * @param options    Optional: { method }; default { method: "logRank" }
 */
interface CleanRow { time: number; atRisk: number; events: number; censored: number }

/**
 * Collapse the worker's display-oriented step rows (two per event time: a real
 * row plus a horizontal-segment row with the SAME atRisk) into clean per-time
 * rows with the correct at-risk and summed events. Consecutive rows with equal
 * atRisk are exactly the (real, horizontal) pairs, because the at-risk count
 * strictly decreases between two distinct real observation times. Inputs that
 * are already clean (one row per time, distinct atRisk) pass through unchanged.
 */
function cleanCurve(curve: Array<{ time: number; atRisk: number; events?: number; censored?: number }>): CleanRow[] {
  const sorted = [...curve].sort((a, b) => a.time - b.time);
  const out: CleanRow[] = [];
  for (const d of sorted) {
    const last = out[out.length - 1];
    if (last && last.atRisk === d.atRisk) {
      last.events += d.events || 0;
      last.censored += d.censored || 0;
      last.time = Math.min(last.time, d.time);
    } else {
      out.push({ time: d.time, atRisk: d.atRisk, events: d.events || 0, censored: d.censored || 0 });
    }
  }
  return out;
}

export interface AtRiskColumn {
  atRisk: number;   // patients still at risk at the tick (#{observed time >= tick})
  events: number;   // events in [tick, nextTick)
  censored: number; // censorings in [tick, nextTick)
}

/**
 * Number at risk / events / censored at each x-tick, read directly from a
 * survival curve's concrete counts. Every value is a real count produced by the
 * KM computation from the patients (atRisk, events and censored per time), not
 * an inferred or reconstructed number. The curve may be the worker's display
 * data (two staircase rows per event time with identical atRisk); cleanCurve
 * collapses those pairs first so the duplicated rows never inflate the numbers.
 * At-risk at tick t = the atRisk of the first clean row with time >= t (0 once
 * past the last observation); events/censored are summed over [t, nextTick).
 */
export function atRiskTable(
  curveData: Array<{ time: number; atRisk: number; events?: number; censored?: number }>,
  ticks: number[],
): AtRiskColumn[] {
  const clean = cleanCurve(curveData);
  const atRiskAt = (t: number): number => {
    for (const row of clean) if (row.time >= t - 1e-9) return row.atRisk;
    return 0;
  };
  const sumIn = (lo: number, hi: number, key: "events" | "censored"): number => {
    let sum = 0;
    for (const row of clean) {
      if (row.time >= lo - 1e-9 && row.time < hi - 1e-9) sum += row[key];
    }
    return sum;
  };
  return ticks.map((t, i) => {
    const next = i + 1 < ticks.length ? ticks[i + 1] : Infinity;
    return {
      atRisk: atRiskAt(t),
      events: sumIn(t, next, "events"),
      censored: sumIn(t, next, "censored"),
    };
  });
}

export function logRankTest(
  curves: SurvivalDataPoint[][],
  groupNames?: string[],
  options?: { method?: LogRankMethod }
): LogRankResult | null {
  if (!curves || curves.length < 2) return null;
  const K = curves.length;
  const method: LogRankMethod = options?.method ?? "logRank";
  const names = groupNames && groupNames.length === K
    ? groupNames
    : Array.from({ length: K }, (_, i) => String(i + 1));

  // The worker emits two step rows per event time (a real row plus a horizontal-
  // segment row carrying the SAME atRisk). Collapse them into clean per-time
  // rows so the at-risk pooling below is correct. cleanCurve merges consecutive
  // equal-atRisk rows — between two distinct real observation times the at-risk
  // count must strictly decrease, so equal-atRisk neighbours are exactly such
  // (real, horizontal) pairs.
  const clean = curves.map(cleanCurve);

  // At-risk in a group at pooled time t = #{obs with time >= t} = the atRisk of
  // the first clean row with time >= t (rows ascending). The previous code used
  // an EXACT time match, so a group counted as 0-at-risk whenever its own event
  // grid did not coincide with another group's event time — corrupting O/E/
  // variance and badly skewing the p-value on real (non-coincident) data.
  // Monotone per-group pointers into the (ascending) clean rows. The pooled
  // times below are visited in ascending order, so each pointer only moves
  // forward -> the whole pooling is O(n) instead of O(n^2) (previously a linear
  // scan per event time, which dominated runtime on large cohorts). ptr[k] is
  // the first row of group k with time >= the current pooled time t.

  const allTimes = Array.from(
    new Set(clean.flatMap(rows => rows.map(r => r.time)))
  ).sort((a, b) => a - b);

  const O = Array(K).fill(0) as number[];
  const E = Array(K).fill(0) as number[];
  // Kovarianzmatrix V (K × K); für Test brauchen wir (K-1)×(K-1)-Hauptminor
  const V = Array.from({ length: K }, () => Array(K).fill(0)) as number[][];

  // Peto-Peto needs the modified pooled survival estimate at t-, applied as
  // weight before updating with current event. S_tilde uses (n+1) in the
  // denominator instead of n (Prentice modification, robust at the boundary).
  let petoS = 1;
  const ptr = new Array(K).fill(0) as number[];

  for (const t of allTimes) {
    const n = new Array(K) as number[];
    const d = new Array(K) as number[];
    for (let k = 0; k < K; k++) {
      const rows = clean[k];
      while (ptr[k] < rows.length && rows[ptr[k]].time < t - 1e-9) ptr[k]++;
      const row = ptr[k] < rows.length ? rows[ptr[k]] : undefined;
      // at risk = first row with time >= t; events only when that row IS time t
      n[k] = row ? row.atRisk : 0;
      d[k] = row && Math.abs(row.time - t) < 1e-9 ? row.events : 0;
    }
    const nSum = n.reduce((a, b) => a + b, 0);
    const dSum = d.reduce((a, b) => a + b, 0);
    if (nSum === 0 || dSum === 0) continue;

    let w = 1;
    switch (method) {
      case "logRank":    w = 1; break;
      case "wilcoxon":   w = nSum; break;
      case "taroneWare": w = Math.sqrt(nSum); break;
      case "petoPeto":   w = petoS; break;  // use S~(t-) before updating
    }

    // O, E per Gruppe (weighted)
    for (let i = 0; i < K; i++) {
      O[i] += w * d[i];
      E[i] += w * n[i] * (dSum / nSum);
    }

    // Kovarianzmatrix-Beitrag (hypergeometrisch, mit Gewicht w²):
    if (nSum > 1) {
      const common = (w * w) * dSum * (nSum - dSum) / (nSum * nSum * (nSum - 1));
      for (let i = 0; i < K; i++) {
        for (let j = 0; j < K; j++) {
          const term = common * (i === j ? n[i] * (nSum - n[i]) : -n[i] * n[j]);
          V[i][j] += term;
        }
      }
    }

    // Update Peto-Peto pooled estimate AFTER using S(t-)
    if (method === "petoPeto") {
      petoS = petoS * (1 - dSum / (nSum + 1));
    }
  }

  // Diagonalvarianzen für den per-group-Report
  const perGroup: LogRankPerGroup[] = names.map((name, i) => {
    const Oi = O[i];
    const Ei = E[i];
    const Vii = V[i][i];
    return {
      group: name,
      observed: Oi,
      expected: Ei,
      variance: Vii,
      oMinusESqOverE: Ei > 0 ? (Oi - Ei) ** 2 / Ei : 0,
      oMinusESqOverV: Vii > 0 ? (Oi - Ei) ** 2 / Vii : 0,
    };
  });

  // Teststatistik: U^T V^{-1} U mit U = O - E (auf Gruppen 1..K-1 beschränkt)
  const Uk = Array.from({ length: K - 1 }, (_, i) => O[i] - E[i]);
  const Vk = Array.from({ length: K - 1 }, (_, i) =>
    Array.from({ length: K - 1 }, (__, j) => V[i][j])
  );
  const VkInv = invertSymmetric(Vk);
  let chi2 = 0;
  if (VkInv) {
    for (let i = 0; i < K - 1; i++) {
      for (let j = 0; j < K - 1; j++) {
        chi2 += Uk[i] * VkInv[i][j] * Uk[j];
      }
    }
  } else {
    // Fallback: Summe (O-E)²/E (Pearson-Approximation)
    for (let i = 0; i < K; i++) {
      if (E[i] > 0) chi2 += (O[i] - E[i]) ** 2 / E[i];
    }
  }

  const df = K - 1;
  const pValue = chi2SurvivalFunction(chi2, df);

  return {
    method,
    chiSquared: chi2,
    df,
    pValue: Math.max(0, Math.min(1, pValue)),
    nGroups: K,
    perGroup,
  };
}

export interface PairwiseLogRankRow {
  groupA: string;
  groupB: string;
  chiSquared: number;
  /** Uncorrected p-value of this single comparison. */
  pValue: number;
  /** Holm-corrected across all computed comparisons. */
  pValueAdjusted: number;
}

/** True when a curve records at least one event. */
function hasEvents(curve: SurvivalDataPoint[]): boolean {
  return curve.some(d => (d.events || 0) > 0);
}

/**
 * All pairwise comparisons between the given groups, with Holm-corrected
 * p-values. Each pair reuses `logRankTest` on exactly those two curves, so the
 * weighting variant and every numerical detail stay identical to the global
 * test.
 *
 * Which pairs are computed:
 *   - Curves with no data points are skipped; there is nothing to compare.
 *   - A group WITHOUT events is kept. Comparing it against a group with events
 *     is well defined and is usually the most informative row in the table
 *     (50 vs 50 patients, 25 events against none, gives chi2 ~ 11, p ~ 0.0009).
 *     Note this differs from the global test, which drops such groups.
 *   - A pair where BOTH groups are event-free is dropped: the pooled data has
 *     no event at all, the statistic degenerates to chi2 = 0, p = 1, and
 *     keeping it would only inflate m and make Holm needlessly conservative.
 *
 * Holm: sort the raw p-values ascending, scale the i-th (0-based) by (m - i),
 * then take a running maximum so the corrected values stay monotone. m counts
 * the comparisons actually computed, not k(k-1)/2.
 *
 * Returned rows are sorted by raw p-value ascending, matching the order Holm
 * works in and putting the clearest differences first.
 */
export function pairwiseLogRank(
  curves: SurvivalDataPoint[][],
  groupNames: string[],
  options?: { method?: LogRankMethod },
): PairwiseLogRankRow[] {
  if (!curves || curves.length < 2) return [];

  const rows: Array<Omit<PairwiseLogRankRow, "pValueAdjusted">> = [];
  for (let i = 0; i < curves.length; i++) {
    for (let j = i + 1; j < curves.length; j++) {
      const a = curves[i];
      const b = curves[j];
      if (!a?.length || !b?.length) continue;
      if (!hasEvents(a) && !hasEvents(b)) continue;
      const result = logRankTest([a, b], [groupNames[i], groupNames[j]], options);
      if (!result) continue;
      rows.push({
        groupA: groupNames[i],
        groupB: groupNames[j],
        chiSquared: result.chiSquared,
        pValue: result.pValue,
      });
    }
  }

  rows.sort((x, y) => x.pValue - y.pValue);

  const m = rows.length;
  let running = 0;
  return rows.map((row, index) => {
    running = Math.max(running, Math.min(1, (m - index) * row.pValue));
    return { ...row, pValueAdjusted: running };
  });
}

// ============================================================================
// Numerische Hilfsfunktionen
// ============================================================================

function normalCdf(z: number): number {
  return 0.5 * (1 + erf(z / Math.sqrt(2)));
}

function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

// Chi²-Verteilungsfunktion — Regularized lower incomplete gamma, gültig für df bis ~200.
function chi2Cdf(x: number, k: number): number {
  if (x <= 0) return 0;
  if (k <= 0) return 0;
  return regularizedLowerGamma(k / 2, x / 2);
}

// P(s, x) = γ(s, x) / Γ(s)
function regularizedLowerGamma(s: number, x: number): number {
  if (x <= 0) return 0;
  if (x < s + 1) {
    // Reihenentwicklung
    let term = 1 / s;
    let sum = term;
    for (let n = 1; n < 1000; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  } else {
    // Kettenbruch (Lentz) für Q, dann 1 - Q
    let b = x + 1 - s;
    let c = 1 / 1e-300;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - s);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    const Q = h * Math.exp(-x + s * Math.log(x) - logGamma(s));
    return 1 - Q;
  }
}

// P(X > x) for a chi-squared distribution with k degrees of freedom.
// This exists because computing the upper tail as 1 - chi2Cdf(x, k) underflows
// to exactly 0 once the CDF rounds to 1 in double precision. Measured case: a
// log-rank chi2 of 136.56039877329482 with df = 2 produced a reported p-value
// of 0 in this app, while R gives 2.2e-30 for the same statistic. The upper
// tail Q is already computed directly by the continued-fraction branch below;
// returning it unchanged (instead of 1 - (1 - Q)) avoids that cancellation.
export function chi2SurvivalFunction(x: number, k: number): number {
  if (x <= 0) return 1;
  if (k <= 0) return 1;
  return regularizedUpperGamma(k / 2, x / 2);
}

// Q(s, x) = Gamma(s, x) / Gamma(s) = 1 - P(s, x)
// Mirrors the branch structure and convergence criteria of
// regularizedLowerGamma above, so the numerics stay consistent between the two.
function regularizedUpperGamma(s: number, x: number): number {
  if (x <= 0) return 1;
  if (x < s + 1) {
    // Series branch: compute P directly (harmless here, P is not close to 1
    // in this regime) and complement.
    let term = 1 / s;
    let sum = term;
    for (let n = 1; n < 1000; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    const P = sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
    return 1 - P;
  } else {
    // Continued fraction (Lentz) for Q directly, no round trip through P.
    let b = x + 1 - s;
    let c = 1 / 1e-300;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 1000; i++) {
      const an = -i * (i - s);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-300) d = 1e-300;
      c = b + an / c;
      if (Math.abs(c) < 1e-300) c = 1e-300;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-14) break;
    }
    return h * Math.exp(-x + s * Math.log(x) - logGamma(s));
  }
}

// log(Γ(x)) nach Lanczos
function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  if (x < 0.5) {
    // Reflexion
    return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  }
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

// Inverse Standardnormal (für Upper-Tail-α → z-Quantil), Beasley-Springer-Moro
function invNormalCdfUpperTail(alpha: number): number {
  // z so dass P(Z > z) = alpha → z = Φ^{-1}(1 - alpha)
  const p = 1 - alpha;
  // Acklam-Approximation
  const a = [-3.969683028665376e+01, 2.209460984245205e+02, -2.759285104469687e+02, 1.383577518672690e+02, -3.066479806614716e+01, 2.506628277459239e+00];
  const b = [-5.447609879822406e+01, 1.615858368580409e+02, -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01];
  const cc = [-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e+00, -2.549732539343734e+00, 4.374664141464968e+00, 2.938163982698783e+00];
  const dd = [7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e+00, 3.754408661907416e+00];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q, r;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((cc[0] * q + cc[1]) * q + cc[2]) * q + cc[3]) * q + cc[4]) * q + cc[5]) /
      ((((dd[0] * q + dd[1]) * q + dd[2]) * q + dd[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((cc[0] * q + cc[1]) * q + cc[2]) * q + cc[3]) * q + cc[4]) * q + cc[5]) /
      ((((dd[0] * q + dd[1]) * q + dd[2]) * q + dd[3]) * q + 1);
  }
}

// Symmetrische Matrix invertieren via Gauss-Jordan (kleine Dimensionen)
function invertSymmetric(A: number[][]): number[][] | null {
  const n = A.length;
  if (n === 0) return null;
  const M = A.map(row => row.slice());
  const I = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (__, j) => (i === j ? 1 : 0)));
  for (let i = 0; i < n; i++) {
    let piv = i;
    for (let r = i + 1; r < n; r++) if (Math.abs(M[r][i]) > Math.abs(M[piv][i])) piv = r;
    if (Math.abs(M[piv][i]) < 1e-12) return null;
    if (piv !== i) {
      const tmp = M[i]; M[i] = M[piv]; M[piv] = tmp;
      const tmpI = I[i]; I[i] = I[piv]; I[piv] = tmpI;
    }
    const diag = M[i][i];
    for (let j = 0; j < n; j++) { M[i][j] /= diag; I[i][j] /= diag; }
    for (let r = 0; r < n; r++) if (r !== i) {
      const f = M[r][i];
      for (let j = 0; j < n; j++) { M[r][j] -= f * M[i][j]; I[r][j] -= f * I[i][j]; }
    }
  }
  return I;
}

// Re-export für externe Nutzung (z.B. Cox-Diagnostik könnte es noch brauchen)
export { normalCdf };

export interface SchaetzerFall {
  /** Zeit bis Ereignis oder Zensierung. Einheit egal, aber einheitlich. */
  zeit: number;
  ereignis: boolean;
}

export interface SchaetzerPunkt {
  zeit: number;
  wahrscheinlichkeit: number;
  /** Risikomenge zu Beginn dieser Zeile. */
  unterRisiko: number;
  ereignis: boolean;
}

/**
 * Schätzer der OncoBox-Spezifikationen, wörtlich nach deren Formel:
 *
 *   rᵢ = N − i + 1
 *   Lᵢ = (rᵢ − δᵢ) / rᵢ
 *   P(t) = ∏ Lᵢ für alle Tᵢ < t
 *
 * Die Risikomenge sinkt je Zeile um genau eins. Gleiche Zeiten werden
 * nacheinander abgearbeitet, nicht zusammengefasst. Das weicht von der
 * üblichen Konvention ab und liefert bei Bindungen andere Werte; genau so
 * steht es in den Spezifikationen von Brust, Darm und Prostata 1.0, und
 * genau so rechnete die Ergebnisseite schon vorher.
 */
export function sequentiellerSchaetzer(faelle: SchaetzerFall[]): SchaetzerPunkt[] {
  if (faelle.length === 0) return [];
  const sortiert = faelle.slice().sort((a, b) => a.zeit - b.zeit);
  const punkte: SchaetzerPunkt[] = [];
  let unterRisiko = sortiert.length;
  let wahrscheinlichkeit = 1;
  for (const fall of sortiert) {
    if (fall.ereignis) wahrscheinlichkeit *= (unterRisiko - 1) / unterRisiko;
    punkte.push({ zeit: fall.zeit, wahrscheinlichkeit, unterRisiko, ereignis: fall.ereignis });
    unterRisiko -= 1;
  }
  return punkte;
}

/**
 * Schätzer der üblichen Konvention: gleiche Zeiten gemeinsam abgearbeitet,
 * die Risikomenge sinkt am Ende jeder Zeitgruppe um deren ganze Grösse statt
 * zeilenweise um eins. Gilt für oBDS, CSV, TXT und Excel, siehe
 * KurvenSchaetzer "gruppiert" in components/kaplan-meier/boxkurve.ts, und
 * entspricht der Kurve, die der Worker für diese Quellen zeichnet.
 *
 * Bei Bindungen weicht das Ergebnis vom sequentiellen Schätzer ab: eine
 * Zensierung, die vor einem Ereignis derselben Zeit steht, senkt dort die
 * Risikomenge des Ereignisses nicht, während sie beim sequentiellen Schätzer
 * schon abgezogen ist.
 */
export function gruppierterSchaetzer(faelle: SchaetzerFall[]): SchaetzerPunkt[] {
  if (faelle.length === 0) return [];
  const sortiert = faelle.slice().sort((a, b) => a.zeit - b.zeit);
  const punkte: SchaetzerPunkt[] = [];
  let unterRisiko = sortiert.length;
  let wahrscheinlichkeit = 1;
  let i = 0;
  while (i < sortiert.length) {
    const zeit = sortiert[i].zeit;
    let j = i;
    let ereignisse = 0;
    while (j < sortiert.length && sortiert[j].zeit === zeit) {
      if (sortiert[j].ereignis) ereignisse += 1;
      j += 1;
    }
    if (ereignisse > 0) wahrscheinlichkeit *= (unterRisiko - ereignisse) / unterRisiko;
    punkte.push({ zeit, wahrscheinlichkeit, unterRisiko, ereignis: ereignisse > 0 });
    unterRisiko -= (j - i);
    i = j;
  }
  return punkte;
}
