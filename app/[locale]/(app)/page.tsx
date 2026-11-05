"use client";

import { mockDataScenarios } from "@/components/kaplan-meier/mock-data-generator";
import { parseOBDSXMLNew } from "@/components/kaplan-meier/obds-parser-new";
import { detectOncoBoxXml, type OncoBoxImportResult, type OncoBoxMeta } from "@/components/kaplan-meier/oncobox-importer";
import { useRouter } from "@/i18n/navigation";
import { UploadValidationModal } from "@/components/upload-validation-modal";
import { computeDatasetHash } from "@/components/kaplan-meier/anomaly-exclusions";
import type { ParseIssue, ExtraColumnsState } from "@/components/kaplan-meier/extra-columns";
import {
	Alert,
	AlertDescription,
	AlertTitle,
	Badge,
	Button,
	Card,
	CardContent,
	CardHeader,
	CardTitle,
	Input,
	Popover,
	PopoverContent,
	PopoverTrigger,
	Progress,
	Tabs,
	TabsContent,
	TabsList,
	TabsTrigger
} from "@/components/ui";
import { AlertCircle, Beaker, Boxes, Database, Download, FileText, Upload, X, BookOpen } from "lucide-react";
import { useTranslations } from "next-intl";
import { TourLayer, startTour, useTourStep } from "@/components/guided-tour";
import { OncoBoxTab } from "@/components/kaplan-meier/oncobox-tab";
import TestdatenAbschnitt from "@/components/kaplan-meier/testdaten/testdaten-abschnitt";
import React, { useCallback, useState } from "react";

interface Patient {
  id: string;
  [key: string]: any;
}

interface SurvivalData {
  time: number;
  probability: number;
  atRisk: number;
  events: number;
}

interface SurvivalCurve {
  id: string;
  name: string;
  data: SurvivalData[];
  color: string;
}

const CURVE_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#ca8a04", // yellow
  "#9333ea", // purple
  "#c2410c", // orange
  "#0891b2", // cyan
  "#be123c", // rose
];

const ONCOBOX_WORKER_TIMEOUT_MS = 60_000;

function runOncoBoxWorker(xml: string): Promise<OncoBoxImportResult> {
  return new Promise((resolve) => {
    const worker = new Worker(
      new URL("@/components/kaplan-meier/oncobox-importer.worker.ts", import.meta.url),
      { type: "module" },
    );
    const finish = (result: OncoBoxImportResult): void => {
      clearTimeout(timer);
      worker.terminate();
      resolve(result);
    };
    const timer = setTimeout(
      () => finish({ patients: [], errors: ["Zeitüberschreitung beim Einlesen"], warnings: [], meta: null }),
      ONCOBOX_WORKER_TIMEOUT_MS,
    );

    worker.onmessage = (event: MessageEvent<OncoBoxImportResult>) => finish(event.data);
    worker.onerror = () =>
      finish({ patients: [], errors: ["Der Worker konnte die Datei nicht verarbeiten"], warnings: [], meta: null });
    worker.postMessage({ xml });
  });
}

export default function Page() {
  const t = useTranslations("KaplanMeier");
  const tTour = useTranslations("Tour");
  const tOncoBox = useTranslations("OncoBox");
  const router = useRouter();
  const hasNavigatedRef = React.useRef(false);

  // Tour: keep the right tab open for the current step (upload vs test data).
  const [activeTab, setActiveTab] = React.useState("upload");
  const tourStep = useTourStep();
  React.useEffect(() => {
    const sel = tourStep?.step.selector;
    if (sel === '[data-tour="test-cards"]') setActiveTab("testdata");
    else if (sel === '[data-tour="upload-area"]') setActiveTab("upload");
  }, [tourStep]);
  
  const [selectedUploadFile, setSelectedUploadFile] = useState<File | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [oncoBoxMeta, setOncoBoxMeta] = React.useState<OncoBoxMeta | null>(null);
  const [error, setError] = useState<string | null>(null);
  // "read" ist der Regelfall: die Datei ließ sich nicht auswerten.
  // "unsupported" heißt, sie wurde gelesen und erkannt, ist aber noch nicht
  // unterstützt. Beides braucht einen anderen Rahmen.
  const [errorKind, setErrorKind] = useState<"read" | "unsupported">("read");
  const [pendingValidationIssues, setPendingValidationIssues] = useState<ParseIssue[] | null>(null);
  const [pendingPatients, setPendingPatients] = useState<Patient[] | null>(null);
  const [pendingExtraColumns, setPendingExtraColumns] = useState<ExtraColumnsState | null>(null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [pendingSource, setPendingSource] = useState<"csv" | "xlsx" | null>(null);


  // Cleanup sessionStorage beim Laden der Upload-Seite
  React.useEffect(() => {
    sessionStorage.removeItem("km-patients");
    sessionStorage.removeItem("km-from-upload");
    sessionStorage.removeItem("km-suppress-next-spinner");
    sessionStorage.removeItem("km-curves-cache");
    sessionStorage.removeItem("km-filters");
    sessionStorage.removeItem("km-stratification-config");
    // Endpunkt und Zentrumstyp gehören zur alten Datei: bleiben sie stehen,
    // startet die nächste Kohorte mit einem Endpunkt, den sie nicht hergibt,
    // und im Zertifizierungsmodus einer Datei, die gar keiner ist.
    sessionStorage.removeItem("km-endpunkt");
    sessionStorage.removeItem("km-zentrumstyp");
    
    // Clear in-memory cache
    if (typeof window !== "undefined") {
      (window as any).__kmPatientsCache = null;
    }
    
  }, []);
  


  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const getUploadKind = (file: File): "xml" | "csv" | "xlsx" | null => {
    const lowerName = file.name.toLowerCase();
    if (file.type === "text/xml" || lowerName.endsWith(".xml")) return "xml";
    if (lowerName.endsWith(".xlsx") || file.type === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return "xlsx";
    if (
      file.type === "text/csv" ||
      file.type === "text/plain" ||
      lowerName.endsWith(".csv") ||
      lowerName.endsWith(".txt")
    ) {
      return "csv";
    }
    return null;
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    const acceptedFile = files.find(file => getUploadKind(file) !== null);
    
    if (acceptedFile) {
      setSelectedUploadFile(acceptedFile);
      setError(null); setErrorKind("read");
    } else {
      setError(t("errors.invalidXml"));
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const kind = getUploadKind(file);
      if (kind) {
        setSelectedUploadFile(file);
        setError(null); setErrorKind("read");
        // Reset navigation flag when selecting new file
        hasNavigatedRef.current = false;
      } else {
        setError(t("errors.invalidXml"));
      }
    }
  }, []);

  // Process XML file when selected
  React.useEffect(() => {
    if (!selectedUploadFile) return;
    const kind = getUploadKind(selectedUploadFile);
    if (kind === "xml") {
      processXMLFile(selectedUploadFile);
    }
  }, [selectedUploadFile]);

  // Process CSV/TXT file when selected
  React.useEffect(() => {
    if (!selectedUploadFile) return;
    const kind = getUploadKind(selectedUploadFile);
    if (kind === "csv") {
      processCSVFile(selectedUploadFile);
    }
  }, [selectedUploadFile]);

  // Process XLSX file when selected
  React.useEffect(() => {
    if (!selectedUploadFile) return;
    const kind = getUploadKind(selectedUploadFile);
    if (kind === "xlsx") {
      processXLSXFile(selectedUploadFile);
    }
  }, [selectedUploadFile]);

  // Persist the dataset hash and proceed. Anomaly detection itself runs on
  // the results page (in the AnomalyPanel) - it is intentionally NOT run here
  // so a detection error can never block navigation. All anomaly classes,
  // including logic errors, surface in the results-page panel where the user
  // can exclude individual patients.
  const proceedOrBlock = (
    _parsedPatients: Patient[],
    metadata: { name: string; size: number; uploadedAt: string },
    doSave: () => void,
  ): boolean => {
    doSave();
    try {
      sessionStorage.setItem(
        "km-dataset-hash",
        computeDatasetHash(metadata.name, metadata.size, metadata.uploadedAt),
      );
    } catch {}
    return true;
  };

  const finalizeUpload = (
    parsedPatients: Patient[],
    extraColumns: ExtraColumnsState | null,
    file: File,
    source: "csv" | "xlsx"
  ) => {
    const uploadedAt = new Date().toISOString();
    const ok = proceedOrBlock(
      parsedPatients,
      { name: file.name, size: file.size, uploadedAt },
      () => {
        if (typeof window !== "undefined") {
          (window as any).__kmPatientsCache = parsedPatients;
        }
        try {
          // Small writes happen immediately — needed by the results-page mount.
          sessionStorage.setItem("km-from-upload", "1");
          sessionStorage.setItem("km-file-meta", JSON.stringify({
            name: file.name,
            size: file.size,
            source,
            uploadedAt,
            nPatients: parsedPatients.length,
          }));
          sessionStorage.setItem(
            "km-extra-columns",
            JSON.stringify(extraColumns ?? { columns: {}, warnings: [] })
          );
          // BIG write deferred to a background tick. JSON.stringify on a few
          // thousand patient objects + sessionStorage.setItem on a multi-MB
          // string blocks the main thread for hundreds of ms — that was the
          // perceived "loading takes forever" lag.
          // The results page reads __kmPatientsCache first; sessionStorage is
          // only the reload-safety net, so writing it after navigation is fine.
          setTimeout(() => {
            try {
              const json = JSON.stringify(parsedPatients);
              if (json.length <= 4_500_000) {
                sessionStorage.setItem("km-patients", json);
              }
            } catch {}
          }, 0);
        } catch {}
        setPatients(parsedPatients);
        setIsProcessing(false);
        hasNavigatedRef.current = true;
      },
    );
    if (ok) router.push("/results");
  };

  const processXLSXFile = async (file: File) => {
    setIsProcessing(true);
    setError(null); setErrorKind("read");
    hasNavigatedRef.current = false;

    const buffer = await file.arrayBuffer();

    try {
      const worker = new Worker(
        new URL("@/components/kaplan-meier/xlsx-parser.worker.ts", import.meta.url),
        { type: "module" }
      );

      const workerResult = await new Promise<{ patients: Patient[]; errors: string[]; warnings: string[]; extraColumns?: ExtraColumnsState; issues?: ParseIssue[] }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error("xlsxTimeout"));
        }, 60_000);
        worker.onmessage = (e) => {
          clearTimeout(timeout);
          worker.terminate();
          resolve(e.data);
        };
        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(err);
        };
        worker.postMessage({ buffer }, [buffer]);
      });

      if (workerResult.patients.length > 0) {
        if (workerResult.issues && workerResult.issues.length > 0) {
          const hasBlocking = workerResult.issues.some(i => i.level === "required" || i.level === "recommended");
          if (hasBlocking) {
            setPendingValidationIssues(workerResult.issues);
            setPendingPatients(workerResult.patients);
            setPendingExtraColumns(workerResult.extraColumns ?? null);
            setPendingFile(file);
            setPendingSource("xlsx");
            setIsProcessing(false);
            return;
          }
        }
        finalizeUpload(workerResult.patients, workerResult.extraColumns ?? null, file, "xlsx");
        return;
      }

      // Worker returned no patients → main-thread fallback
      const { parseXLSX } = await import("@/components/kaplan-meier/xlsx-parser");
      const buffer2 = await file.arrayBuffer();
      const fallback = await parseXLSX(buffer2);
      if (fallback.patients.length === 0) {
        const msg = fallback.errors.length > 0
          ? t("errors.xlsxParsing", { errors: fallback.errors.join(", ") })
          : t("errors.xlsxNoValidData");
        setError(msg);
        setIsProcessing(false);
        return;
      }
      if (fallback.issues && fallback.issues.length > 0) {
        const hasBlocking = fallback.issues.some(i => i.level === "required" || i.level === "recommended");
        if (hasBlocking) {
          setPendingValidationIssues(fallback.issues);
          setPendingPatients(fallback.patients);
          setPendingExtraColumns(fallback.extraColumns ?? null);
          setPendingFile(file);
          setPendingSource("xlsx");
          setIsProcessing(false);
          return;
        }
      }
      finalizeUpload(fallback.patients, fallback.extraColumns ?? null, file, "xlsx");
    } catch (err) {
      setError(t("errors.xlsxProcessing", { message: err instanceof Error ? err.message : t("errors.unknown") }));
      setIsProcessing(false);
    }
  };

  const processCSVFile = async (file: File) => {
    setIsProcessing(true);
    setError(null); setErrorKind("read");
    hasNavigatedRef.current = false;

    const handleResult = (result: { patients: Patient[]; errors: string[]; warnings: string[]; extraColumns?: ExtraColumnsState; issues?: ParseIssue[] }) => {
      if (result.issues && result.issues.length > 0) {
        const hasBlocking = result.issues.some(i => i.level === "required" || i.level === "recommended");
        if (hasBlocking) {
          setPendingValidationIssues(result.issues);
          setPendingPatients(result.patients);
          setPendingExtraColumns(result.extraColumns ?? null);
          setPendingFile(file);
          setPendingSource("csv");
          setIsProcessing(false);
          return;
        }
      }
      finalizeUpload(result.patients, result.extraColumns ?? null, file, "csv");
    };

    try {
      const text = await file.text();

      // Primary path: parse in Web Worker
      const worker = new Worker(
        new URL("@/components/kaplan-meier/csv-parser.worker.ts", import.meta.url),
        { type: "module" }
      );

      const workerResult = await new Promise<{ patients: Patient[]; errors: string[]; warnings: string[]; extraColumns?: ExtraColumnsState; issues?: ParseIssue[] }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          worker.terminate();
          reject(new Error(t("errors.csvTimeout")));
        }, 30000);

        worker.onmessage = (e) => {
          clearTimeout(timeout);
          worker.terminate();
          resolve(e.data);
        };

        worker.onerror = (err) => {
          clearTimeout(timeout);
          worker.terminate();
          reject(err);
        };

        worker.postMessage({ csv: text });
      });

      const shouldFallback = workerResult.patients.length === 0;

      if (!shouldFallback) {
        handleResult(workerResult);
        return;
      }

      // Fallback: parse synchron im Main-Thread, falls Worker nichts liefert (z.B. TXT/$ Format)
      const { parseCSV } = await import("@/components/kaplan-meier/csv-parser");
      const fallbackResult = parseCSV(text);

      if (fallbackResult.patients.length === 0) {
        const msg = fallbackResult.errors.length > 0
          ? t("errors.csvParsing", { errors: fallbackResult.errors.join(", ") })
          : t("errors.csvNoValidData");
        setError(msg);
        setIsProcessing(false);
        return;
      }

      handleResult(fallbackResult);
    } catch (err) {
      setError(t("errors.csvProcessing", { message: err instanceof Error ? err.message : t("errors.unknown") }));
      setIsProcessing(false);
    }
  };

  const calculateKaplanMeier = (patients: Patient[]): SurvivalData[] => {
    if (patients.length === 0) return [];
    
    const events = patients.map(p => ({
      time: p.survivalTime,
      event: p.event,
    })).sort((a, b) => a.time - b.time);

    const result: SurvivalData[] = [];
    let atRisk = patients.length;
    let probability = 1.0;

    for (let i = 0; i < events.length; i++) {
      const currentTime = events[i].time;
      
      // Count events at this time point
      let eventsAtTime = 0;
      let j = i;
      while (j < events.length && events[j].time === currentTime) {
        if (events[j].event) eventsAtTime++;
        j++;
      }

      if (eventsAtTime > 0) {
        probability *= (atRisk - eventsAtTime) / atRisk;
        result.push({
          time: currentTime,
          probability,
          atRisk,
          events: eventsAtTime,
        });
      }

      // Update at-risk count
      while (i < events.length && events[i].time === currentTime) {
        atRisk--;
        i++;
      }
      i--; // Adjust for the outer loop increment
    }

    return result;
  };



  const processXMLFile = async (file: File) => {
    setIsProcessing(true);
    setError(null); setErrorKind("read");
    
    // Reset navigation flag
    hasNavigatedRef.current = false;
    
    try {
      const text = await file.text();
      
      const oncoBoxDetected = detectOncoBoxXml(text);

      let parseResult: { patients: Patient[]; errors: string[]; warnings: string[] };

      if (oncoBoxDetected) {
        const imported = await runOncoBoxWorker(text);
        if (imported.errors.length > 0) {
          // Eine erkannte, aber noch nicht unterstuetzte Box ist kein
          // Lesefehler. Der Hinweis auf Dateiformat und Zeichencodierung wuerde
          // hier in die Irre fuehren, deshalb ein eigener Rahmen.
          setErrorKind(imported.unsupported ? "unsupported" : "read");
          setError(imported.errors.join(" "));
          setIsProcessing(false);
          return;
        }
        setOncoBoxMeta(imported.meta);
        parseResult = { patients: imported.patients as Patient[], errors: [], warnings: imported.warnings };
      } else {
        parseResult = parseOBDSXMLNew(text);
      }
      
      
      if (parseResult.errors && parseResult.errors.length > 0) {
        setError(t("errors.xmlParsing", { errors: parseResult.errors.join(", ") }));
        setIsProcessing(false);
        return;
      }
      
      
      if (!parseResult.patients || parseResult.patients.length === 0) {
        setError(t("errors.xmlNoValidData"));
        setIsProcessing(false);
        return;
      }
      
      
      // Anomaly check + guarded save
      const uploadedAt = new Date().toISOString();
      const ok = proceedOrBlock(
        parseResult.patients,
        { name: file.name, size: file.size, uploadedAt },
        () => {
          // In-Memory Fallback
          if (typeof window !== "undefined") {
            (window as any).__kmPatientsCache = parseResult.patients;
          }

          // Save to sessionStorage (guarded)
          try {
            const json = JSON.stringify(parseResult.patients);
            if (json.length <= 4_500_000) {
              sessionStorage.setItem("km-patients", json);
              sessionStorage.setItem("km-from-upload", "1");
            }
            sessionStorage.setItem("km-file-meta", JSON.stringify({
              name: file.name,
              size: file.size,
              source: "xml",
              uploadedAt,
              nPatients: parseResult.patients.length,
            }));
            sessionStorage.setItem("km-extra-columns", JSON.stringify({ columns: {}, warnings: [] }));
          } catch {}

          // Update state
          setPatients(parseResult.patients);
          setIsProcessing(false);
          hasNavigatedRef.current = true;
        },
      );

      if (ok) {
        // Navigate directly
        router.push("/results");
      }

    } catch (err) {
      setError(t("errors.xmlProcessing", { message: err instanceof Error ? err.message : t("errors.unknown") }));
      setIsProcessing(false);
    }
  };

  const loadAnomalyDemo = async () => {
    setIsProcessing(true);
    setError(null); setErrorKind("read");
    hasNavigatedRef.current = false;
    try {
      const response = await fetch("/sample-anomalies.csv");
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], "sample-anomalies.csv", { type: "text/csv" });
      await processCSVFile(file);
    } catch (err) {
      setError(t("errors.xmlProcessing", { message: err instanceof Error ? err.message : t("errors.unknown") }));
      setIsProcessing(false);
    }
  };

  const loadMetabric = async () => {
    setIsProcessing(true);
    setError(null); setErrorKind("read");
    hasNavigatedRef.current = false;
    try {
      const response = await fetch("/sample-metabric.csv");
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], "sample-metabric.csv", { type: "text/csv" });
      await processCSVFile(file);
    } catch (err) {
      setError(t("errors.xmlProcessing", { message: err instanceof Error ? err.message : t("errors.unknown") }));
      setIsProcessing(false);
    }
  };

  const loadTcga = async () => {
    setIsProcessing(true);
    setError(null); setErrorKind("read");
    hasNavigatedRef.current = false;
    try {
      const response = await fetch("/sample-tcga.csv");
      if (!response.ok) throw new Error(`Fetch failed: ${response.status}`);
      const blob = await response.blob();
      const file = new File([blob], "sample-tcga.csv", { type: "text/csv" });
      await processCSVFile(file);
    } catch (err) {
      setError(t("errors.xmlProcessing", { message: err instanceof Error ? err.message : t("errors.unknown") }));
      setIsProcessing(false);
    }
  };

  const loadMockData = async (scenario: keyof typeof mockDataScenarios) => {
    setIsProcessing(true);
    setError(null); setErrorKind("read");
    
    // Reset navigation flag
    hasNavigatedRef.current = false;
    
    try {
      // Load pre-generated JSON data from API endpoint
      const response = await fetch(`/api/mock-data/${scenario}`);
      
      if (!response.ok) {
        throw new Error(t("errors.mockDataHttp", { statusText: response.statusText }));
      }
      
      const mockPatients = await response.json();
      
      
      const mockJson = JSON.stringify(mockPatients);
      const uploadedAt = new Date().toISOString();
      const ok = proceedOrBlock(
        Array.isArray(mockPatients) ? mockPatients : [],
        { name: `mock-${scenario}`, size: mockJson.length, uploadedAt },
        () => {
          // In-Memory Fallback
          if (typeof window !== "undefined") {
            (window as any).__kmPatientsCache = mockPatients;
          }

          // Save to sessionStorage (guarded)
          try {
            if (mockJson.length <= 4_500_000) {
              sessionStorage.setItem("km-patients", mockJson);
              sessionStorage.setItem("km-from-upload", "1");
            }
            sessionStorage.setItem("km-file-meta", JSON.stringify({
              name: `mock-${scenario}`,
              size: mockJson.length,
              source: "mock",
              uploadedAt,
              nPatients: Array.isArray(mockPatients) ? mockPatients.length : 0,
            }));
            sessionStorage.setItem("km-extra-columns", JSON.stringify({ columns: {}, warnings: [] }));
          } catch {}

          setPatients(mockPatients);
          setIsProcessing(false);
          hasNavigatedRef.current = true;
        },
      );

      if (ok) {
        // Navigate directly
        router.push("/results");
      }
    } catch (err) {
      setError(t("errors.mockDataLoad", { message: err instanceof Error ? err.message : t("errors.unknown") }));
      setIsProcessing(false);
    }
  };

  // Die Kacheln kennen nur ihren Schlüssel. Die drei Sonderfälle laden
  // fertige Dateien aus public/, alle übrigen erzeugen ihre Kohorte hier.
  const ladeTestdaten = (key: string) => {
    if (key === "anomalyDemo") return loadAnomalyDemo();
    if (key === "metabric") return loadMetabric();
    if (key === "tcga") return loadTcga();
    return loadMockData(key as keyof typeof mockDataScenarios);
  };

  const analyzeAndShowResults = () => {
    if (patients.length === 0) {
      setError(t("errors.noDataForAnalysis"));
      return;
    }

    try {
      let metaName = `analyze-${patients.length}`;
      let metaSize = 0;
      let metaUploadedAt = new Date().toISOString();
      try {
        const rawMeta = sessionStorage.getItem("km-file-meta");
        if (rawMeta) {
          const m = JSON.parse(rawMeta);
          if (m && typeof m.name === "string") metaName = m.name;
          if (m && typeof m.size === "number") metaSize = m.size;
          if (m && typeof m.uploadedAt === "string") metaUploadedAt = m.uploadedAt;
        }
      } catch {}

      const ok = proceedOrBlock(
        patients,
        { name: metaName, size: metaSize, uploadedAt: metaUploadedAt },
        () => {
          try {
            const json = JSON.stringify(patients);
            if (json.length <= 4_500_000) {
              sessionStorage.setItem("km-patients", json);
              sessionStorage.setItem("km-from-upload", "1");
            } else {
              if (typeof window !== "undefined") {
                (window as any).__kmPatientsCache = patients;
              }
            }
          } catch {
            if (typeof window !== "undefined") {
              (window as any).__kmPatientsCache = patients;
            }
          }
        },
      );

      if (ok) router.push("/results");
    } catch {
      setError(t("errors.saveFailed"));
    }
  };

  // Auto-navigate to results when patients are loaded and processing is done
  React.useEffect(() => {

    // Check if we should navigate
    const shouldNavigate = patients.length > 0 && !isProcessing && !hasNavigatedRef.current;

    if (shouldNavigate) {
      let metaName = `auto-${patients.length}`;
      let metaSize = 0;
      let metaUploadedAt = new Date().toISOString();
      try {
        const rawMeta = sessionStorage.getItem("km-file-meta");
        if (rawMeta) {
          const m = JSON.parse(rawMeta);
          if (m && typeof m.name === "string") metaName = m.name;
          if (m && typeof m.size === "number") metaSize = m.size;
          if (m && typeof m.uploadedAt === "string") metaUploadedAt = m.uploadedAt;
        }
      } catch {}

      const ok = proceedOrBlock(
        patients,
        { name: metaName, size: metaSize, uploadedAt: metaUploadedAt },
        () => {
          hasNavigatedRef.current = true;

          // Check sessionStorage (guarded) and fallback to in-memory cache for large payloads
          const stored = sessionStorage.getItem("km-patients");
          if (!stored) {
            try {
              const json = JSON.stringify(patients);
              // Guard ~4.5MB to avoid quota issues
              if (json.length <= 4_500_000) {
                sessionStorage.setItem("km-patients", json);
              } else {
                if (typeof window !== "undefined") {
                  (window as any).__kmPatientsCache = patients;
                }
              }
            } catch {
              if (typeof window !== "undefined") {
                (window as any).__kmPatientsCache = patients;
              }
            }
          }
        },
      );

      if (ok) {
        // Navigate
        setTimeout(() => {
          router.push("/results");
        }, 100); // Small delay to ensure state is committed
      }
    }
  }, [patients.length, isProcessing, router]);

  return (
   <div className="container mx-auto p-6 space-y-8">
	<div className="text-center">
		<div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-2">
		<h1 className="text-4xl font-bold m-0">{t("title")}</h1>
		</div>

		<p className="text-muted-foreground max-w-3xl mx-auto">
		{t("description")}
		</p>
		<div className="mt-4">
			<Popover>
				<PopoverTrigger asChild>
					<Button variant="default" className="gap-2 border-2 border-primary bg-primary text-white hover:bg-primary/90 hover:text-white">
						<BookOpen className="h-4 w-4" />
						{tTour("start")}
					</Button>
				</PopoverTrigger>
				<PopoverContent align="center" className="w-72 p-1">
					<button
						type="button"
						onClick={() => startTour("quick")}
						className="w-full text-left rounded-md px-3 py-2 hover:bg-muted"
					>
						<div className="font-medium">{tTour("chooser.quick.label")}</div>
						<div className="text-xs text-muted-foreground">{tTour("chooser.quick.sub")}</div>
					</button>
					<button
						type="button"
						onClick={() => startTour("full")}
						className="w-full text-left rounded-md px-3 py-2 hover:bg-muted"
					>
						<div className="font-medium">{tTour("chooser.full.label")}</div>
						<div className="text-xs text-muted-foreground">{tTour("chooser.full.sub")}</div>
					</button>
				</PopoverContent>
			</Popover>
		</div>
	</div>

      {/* Upload-Fehler-Banner: erscheint wenn eine Datei nicht gelesen werden konnte. */}
      {error && (
        <Alert variant={errorKind === "unsupported" ? "default" : "destructive"} className="relative">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>
            {errorKind === "unsupported"
              ? t("errors.boxNotSupportedTitle")
              : t("errors.uploadFailedTitle")}
          </AlertTitle>
          <AlertDescription>
            <p className="mb-2 font-medium">{error}</p>
            {errorKind === "unsupported" ? (
              <p className="text-sm">{t("errors.boxNotSupportedHint")}</p>
            ) : (
              <>
                <p className="text-sm">{t("errors.uploadFailedHint")}</p>
                <ul className="list-disc pl-5 mt-1 text-sm space-y-0.5">
                  <li>{t("errors.uploadFailedReasons.format")}</li>
                  <li>{t("errors.uploadFailedReasons.headers")}</li>
                  <li>{t("errors.uploadFailedReasons.required")}</li>
                  <li>{t("errors.uploadFailedReasons.encoding")}</li>
                  <li>{t("errors.uploadFailedReasons.empty")}</li>
                </ul>
              </>
            )}
          </AlertDescription>
          <button
            type="button"
            onClick={() => setError(null)}
            className="absolute top-2 right-2 p-1 rounded hover:bg-destructive/10"
            aria-label={t("errors.uploadFailedDismiss")}
          >
            <X className="h-4 w-4" />
          </button>
        </Alert>
      )}

      {/* Data Input Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            {t("upload.title")}
          </TabsTrigger>
          <TabsTrigger value="oncobox" className="flex items-center gap-2">
            <Boxes className="h-4 w-4" />
            {tOncoBox("tabTitle")}
          </TabsTrigger>
          <TabsTrigger value="testdata" className="flex items-center gap-2">
            <Beaker className="h-4 w-4" />
            {t("testData.title")}
          </TabsTrigger>
        </TabsList>

        {/* Upload Tab */}
        <TabsContent value="upload">
          <Card>
            <CardHeader>
              
            </CardHeader>
            <CardContent>
              <div
                data-tour="upload-area"
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors cursor-pointer ${
                  isDragOver
                    ? "border-primary bg-primary/5"
                    : "border-gray-300 hover:border-primary"
                }`}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => document.getElementById("file-input")?.click()}
              >
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  {selectedUploadFile ? t("fileSelected") : t("uploadDescription")}
                </p>
                {selectedUploadFile && (
                  <div className="mt-4">
                    <Badge variant="secondary" className="text-sm">
                      {selectedUploadFile.name} ({(selectedUploadFile.size / 1024).toFixed(1)} KB)
                    </Badge>
                  </div>
                )}
                <Input
                  id="file-input"
                  type="file"
                  accept=".xml,.csv,.txt,.xlsx"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("upload.sampleXmlPrompt")}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = '/sample-obds.xml';
                      a.download = 'sample-obds.xml';
                      a.click();
                    }}
                    className="text-primary hover:text-primary/80"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("upload.sampleXmlDownload")}
                  </Button>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("upload.sampleCsvPrompt")}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = '/sample-patients.csv';
                      a.download = 'sample-patients.csv';
                      a.click();
                    }}
                    className="text-primary hover:text-primary/80"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("upload.sampleCsvDownload")}
                  </Button>
                </div>
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-2">
                    {t("upload.sampleTxtPrompt")}
                  </p>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      const a = document.createElement('a');
                      a.href = '/sample-kaplanmeier.txt';
                      a.download = 'sample-kaplanmeier.txt';
                      a.click();
                    }}
                    className="text-primary hover:text-primary/80"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {t("upload.sampleTxtDownload")}
                  </Button>
                </div>
              </div>

              {isProcessing && (
                <div className="mt-4">
                  <Progress value={50} className="w-full" />
                </div>
              )}

              {/* Hinweis: Datenverarbeitung clientseitig */}
              <Alert className="mt-4 text-center">
                <AlertDescription className="text-center font-bold">
                  <p className="w-full text-center font-bold">{t("upload.clientSideNotice")}</p>
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* OncoBox Tab */}
        <TabsContent value="oncobox">
          <OncoBoxTab
            meta={oncoBoxMeta}
            onFileSelected={(file) => setSelectedUploadFile(file)}
            onError={(err) =>
              setError(t("errors.xmlProcessing", { message: err instanceof Error ? err.message : t("errors.unknown") }))
            }
          />
        </TabsContent>

        {/* Test Data Tab */}
        <TabsContent value="testdata">
          <Card data-tour="test-cards">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Beaker className="h-5 w-5" />
                {t("testData.title")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-muted-foreground">
                  {t("testData.description")}
                </p>
                
                <TestdatenAbschnitt isProcessing={isProcessing} onLoad={ladeTestdaten} />

                <div className="border-t pt-4">
                  <p className="text-sm text-muted-foreground text-center">
                    {t.rich("testData.tip", { strong: (chunks) => <strong>{chunks}</strong> })}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

            {/* Data Status */}
      {patients.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              {t("dataStatus.title")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">{patients.length}</div>
                <div className="text-sm text-muted-foreground">{t("dataStatus.patientsLoaded")}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {patients.filter(p => p.event).length}
                </div>
                <div className="text-sm text-muted-foreground">{t("dataStatus.events")}</div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="text-2xl font-bold">
                  {Math.round(patients.reduce((sum, p) => sum + p.survivalTime, 0) / patients.length)}
                </div>
                <div className="text-sm text-muted-foreground">{t("dataStatus.avgFollowUp")}</div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <UploadValidationModal
        issues={pendingValidationIssues}
        onProceed={() => {
          if (pendingPatients && pendingFile && pendingSource) {
            finalizeUpload(pendingPatients, pendingExtraColumns, pendingFile, pendingSource);
          }
          setPendingValidationIssues(null);
          setPendingPatients(null);
          setPendingExtraColumns(null);
          setPendingFile(null);
          setPendingSource(null);
        }}
        onCancel={() => {
          setPendingValidationIssues(null);
          setPendingPatients(null);
          setPendingExtraColumns(null);
          setPendingFile(null);
          setPendingSource(null);
        }}
        onClose={() => {
          setPendingValidationIssues(null);
          setPendingPatients(null);
          setPendingExtraColumns(null);
          setPendingFile(null);
          setPendingSource(null);
        }}
      />

      <TourLayer page="upload" onCrossForward={() => { void loadMetabric(); }} />
    </div>
  );
}
