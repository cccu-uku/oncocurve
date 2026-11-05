const PREFIX = "kma-anomaly-exclusions:";

export function exclusionsKey(datasetHash: string): string {
  return `${PREFIX}${datasetHash}`;
}

// Non-cryptographic stable hash (FNV-1a 32-bit hex). Identifying a dataset
// across reloads, not authentication; collisions are extremely unlikely
// for the small number of files a single session sees.
export function computeDatasetHash(
  fileName: string,
  fileSize: number,
  uploadedAt: string,
): string {
  const input = `${fileName}|${fileSize}|${uploadedAt}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(16).padStart(8, "0");
}

export function loadExclusions(datasetHash: string): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(exclusionsKey(datasetHash));
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

export function saveExclusions(datasetHash: string, ids: Set<string>): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(exclusionsKey(datasetHash), JSON.stringify([...ids]));
  } catch {
    /* sessionStorage quota or disabled - silent skip */
  }
}
