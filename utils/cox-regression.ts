// Cox-Regression (Proportional-Hazards) — Efron (Default) oder Breslow-Ties, Wald-CIs

export type TiesMethod = 'efron' | 'breslow';

export interface CoxResult {
  group: string;
  n: number;
  events: number;
  // Koeffizienten-Skala (log HR-Skala)
  coefficient: number;         // log(HR); 0 für Referenzgruppe
  standardError: number;       // 0 für Referenzgruppe
  zValue: number;              // 0 für Referenzgruppe
  // HR-Skala
  hazardRatio: number;
  ciLower: number;
  ciUpper: number;
  pValue: number;
  /**
   * True when this group has no events at all. The hazard ratio is then not
   * estimable (complete separation: the true HR is 0, so the coefficient
   * diverges and the optimiser stops at an arbitrary point). The numeric
   * fields are left as computed, but consumers must not present them as a
   * result.
   */
  notEstimable: boolean;
}

export interface CoxTestResult {
  chiSquared: number;
  df: number;
  pValue: number;
}

export interface CoxModelStats {
  logLikelihood: number;       // partielle Log-Likelihood bei β̂
  logLikelihoodNull: number;   // partielle Log-Likelihood bei β=0
  aic: number;                 // AIC = -2·logL + 2·p
  concordance: number;         // Harrell's C
  concordanceSE: number;       // SE (Noether-Approximation)
  likelihoodRatioTest: CoxTestResult;
  waldTest: CoxTestResult;
  scoreTest: CoxTestResult;    // auch "score log-rank test"
  nObservations: number;
  nEvents: number;
  tiesMethod: TiesMethod;
  iterations: number;
  converged: boolean;
}

export interface CoxSummary {
  referenceGroup: string;
  results: CoxResult[];
  modelStats: CoxModelStats;
  diagnostics?: CoxDiagnostics;
}

export interface CoxPatient {
  survivalTime: number; // in Monaten
  event: boolean;       // true = Ereignis, false = zensiert
  group: string;
}

export interface CoxOptions {
  reference?: string;
  ties?: TiesMethod;
}

const Z_95 = 1.959963984540054;

/**
 * Ein Kontrast ist nicht schätzbar, wenn sein Konfidenzintervall numerisch
 * nicht mehr trägt: die untere Grenze auf null unterlaufen, die obere ins
 * Unendliche gelaufen, oder einer der Werte gar keine Zahl.
 *
 * Das ist die Signatur vollständiger Trennung. Der Koeffizient läuft davon,
 * der Standardfehler wächst mit, und heraus kommt ein Hazard Ratio in
 * Milliardenhöhe mit dem Intervall von null bis unendlich und p = 1. Diese
 * Zahl ist kein Schätzwert, sondern die Stelle, an der das Verfahren
 * abgebrochen hat, und darf nicht wie ein Ergebnis aussehen.
 *
 * Die Grenzen selbst sind das Kriterium, keine gewählte Schranke: exp()
 * unterläuft erst unterhalb von etwa -745 auf null und überläuft erst
 * oberhalb von etwa 710, was mit einem brauchbaren Standardfehler nicht
 * vorkommt.
 */
function konfidenzintervallTraegtNicht(hr: number, ciL: number, ciU: number): boolean {
  return !isFinite(hr) || !isFinite(ciL) || !isFinite(ciU) || ciL <= 0;
}

/**
 * Führt eine Cox-Regression mit kategorialer Gruppenvariable durch.
 * @param patients  Beobachtungen (time, event, group)
 * @param optsOrReference  entweder ein Options-Objekt oder (rückwärtskompatibel) ein Referenzgruppen-String
 */
export function runCoxRegression(
  patients: CoxPatient[],
  optsOrReference?: CoxOptions | string,
): CoxSummary | null {
  const options: CoxOptions = typeof optsOrReference === 'string'
    ? { reference: optsOrReference }
    : (optsOrReference || {});
  const ties: TiesMethod = options.ties ?? 'efron';

  const groups = Array.from(new Set(patients.map(p => p.group)));
  if (groups.length < 2) return null;
  const ref = options.reference && groups.includes(options.reference) ? options.reference : groups[0];
  const otherGroups = groups.filter(g => g !== ref);
  const p = otherGroups.length;
  if (p === 0) return null;

  interface Obs { time: number; event: number; x: number[] }
  const data: Obs[] = patients
    .map(pt => ({
      time: pt.survivalTime,
      event: pt.event ? 1 : 0,
      x: otherGroups.map(g => (pt.group === g ? 1 : 0)),
    }))
    .sort((a, b) => a.time - b.time);

  const nObservations = data.length;
  const nEvents = data.reduce((s, d) => s + d.event, 0);

  // Eindeutige Event-Zeiten
  const eventTimes = Array.from(new Set(data.filter(d => d.event === 1).map(d => d.time))).sort((a, b) => a - b);

  // Score + Information an gegebenem β berechnen, gleichzeitig Log-Likelihood-Beitrag
  // Gibt { U, H, logL } zurück.
  const computeScoreInfo = (beta: number[]): { U: number[]; H: number[][]; logL: number } => {
    const U = Array(p).fill(0) as number[];
    const H = Array.from({ length: p }, () => Array(p).fill(0)) as number[][];
    let logL = 0;

    // PERF: data is sorted ascending by time. Walk event times from latest to
    // earliest and grow the risk set incrementally, so each observation is
    // summed once per call -> O(n*p^2) per iteration instead of O(n^2). S0/S1/S2
    // accumulate across iterations of the descending loop; at event time t they
    // equal the sums over {time >= t}. The Efron/Breslow update below is
    // unchanged and does not mutate S1/S2.
    let lo = data.length;
    let S0 = 0;
    const S1 = Array(p).fill(0) as number[];
    const S2 = Array.from({ length: p }, () => Array(p).fill(0)) as number[][];
    for (let ti = eventTimes.length - 1; ti >= 0; ti--) {
      const t = eventTimes[ti];
      while (lo > 0 && data[lo - 1].time >= t) {
        lo--;
        const r = data[lo];
        const w = Math.exp(dot(beta, r.x));
        S0 += w;
        addInPlace(S1, scale(r.x, w));
        addMatInPlace(S2, outer(r.x, r.x, w));
      }

      // events at exactly t are the contiguous time===t block at the front of
      // the risk set [lo, ...)
      let B0 = 0;
      const B1 = Array(p).fill(0) as number[];
      const B2 = Array.from({ length: p }, () => Array(p).fill(0)) as number[][];
      const sumXevents = Array(p).fill(0) as number[];
      let D = 0;
      for (let m = lo; m < data.length && data[m].time === t; m++) {
        const dObs = data[m];
        if (dObs.event !== 1) continue;
        const w = Math.exp(dot(beta, dObs.x));
        B0 += w;
        addInPlace(B1, scale(dObs.x, w));
        addMatInPlace(B2, outer(dObs.x, dObs.x, w));
        addInPlace(sumXevents, dObs.x);
        D++;
      }
      if (D === 0) continue;

      const betaSumX = dot(beta, sumXevents);

      if (ties === 'breslow' || D <= 1) {
        const safeS0 = Math.max(S0, 1e-32);
        const xBar = scale(S1, 1 / safeS0);
        // Score: Σ x_d - D·x̄
        addInPlace(U, sub(sumXevents, scale(xBar, D)));
        // Information: D·(S2/S0 - x̄x̄ᵀ)
        const V = subMat(scaleMat(S2, 1 / safeS0), outer(xBar, xBar));
        addMatInPlace(H, scaleMat(V, D));
        // logL-Beitrag: Σ β·x_d - D·log(S0)
        logL += betaSumX - D * Math.log(safeS0);
      } else {
        // Efron
        for (let k = 0; k < D; k++) {
          const frac = k / D;
          const S0k = Math.max(S0 - frac * B0, 1e-32);
          const S1k = sub(S1, scale(B1, frac));
          const S2k = subMat(S2, scaleMat(B2, frac));
          const xBark = scale(S1k, 1 / S0k);
          // Score für dieses k: (Σ_d x_d)/D - x̄_k
          // Über alle k summiert + dann Σ_d x_d addiert? — Äquivalente Form: Score = Σ_d x_d - Σ_k x̄_k
          subInPlace(U, xBark);
          // Information pro k
          const Vk = subMat(scaleMat(S2k, 1 / S0k), outer(xBark, xBark));
          addMatInPlace(H, Vk);
          // logL pro k: (β·Σ_d x_d)/D - log(S0k)
          logL += betaSumX / D - Math.log(S0k);
        }
        // Fertig: Score hat -Σ_k x̄_k; wir müssen noch +Σ_d x_d draufgeben
        addInPlace(U, sumXevents);
      }
    }
    return { U, H, logL };
  };

  // Newton-Raphson
  let beta = Array(p).fill(0) as number[];
  const maxIter = 50;
  const tol = 1e-7;
  const ridge = 1e-8;
  let iter = 0;
  let converged = false;

  for (iter = 0; iter < maxIter; iter++) {
    const { U, H } = computeScoreInfo(beta);
    // Ridge-Regularisierung
    for (let i = 0; i < p; i++) H[i][i] += ridge;

    const Hinv = invertSymmetric(H);
    if (!Hinv) break;
    const delta = matVec(Hinv, U);

    const normDelta = Math.sqrt(dot(delta, delta));
    beta = add(beta, delta);
    if (normDelta < tol) {
      converged = true;
      iter++;
      break;
    }
  }

  // Finale Werte bei β̂ — Information ohne Ridge, für SE/Wald
  const { H: InfoBeta, logL: logLBeta } = computeScoreInfo(beta);
  // Ridge nur für Invertierung, SE aber aus Original-Information
  const InfoBetaRidge = InfoBeta.map(row => row.slice());
  for (let i = 0; i < p; i++) InfoBetaRidge[i][i] += ridge;
  const InfoInv = invertSymmetric(InfoBetaRidge);
  const se = InfoInv ? InfoInv.map((row, i) => Math.sqrt(Math.max(row[i], 0))) : Array(p).fill(NaN);

  // Log-Likelihood bei β=0 und Score/Info bei β=0 (für LR-/Score-Test)
  const betaZero = Array(p).fill(0) as number[];
  const { U: U0, H: H0, logL: logLNull } = computeScoreInfo(betaZero);

  // LR-Test: 2·(logL(β̂) - logL(0))
  const lrChi2 = 2 * (logLBeta - logLNull);
  const lrDf = p;

  // Wald-Test: β̂ᵀ · Info(β̂) · β̂
  let waldChi2 = 0;
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) waldChi2 += beta[i] * InfoBeta[i][j] * beta[j];
  }
  const waldDf = p;

  // Score-Test ("score log-rank"): U(0)ᵀ · Info(0)⁻¹ · U(0)
  const H0Ridge = H0.map(row => row.slice());
  for (let i = 0; i < p; i++) H0Ridge[i][i] += ridge;
  const H0Inv = invertSymmetric(H0Ridge);
  let scoreChi2 = 0;
  if (H0Inv) {
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) scoreChi2 += U0[i] * H0Inv[i][j] * U0[j];
    }
  }
  const scoreDf = p;

  // AIC
  const aic = -2 * logLBeta + 2 * p;

  // Harrell's C auf Basis der linearen Prädiktoren η = β̂·x
  const { concordance, concordanceSE } = concordanceIndex(
    data.map(d => ({ time: d.time, event: d.event, eta: dot(beta, d.x) })),
  );

  // Ergebnisse je Gruppe (Referenz zuerst)
  const byGroup = new Map<string, { n: number; events: number }>();
  for (const g of groups) byGroup.set(g, { n: 0, events: 0 });
  for (const pt of patients) {
    const agg = byGroup.get(pt.group)!; agg.n += 1; if (pt.event) agg.events += 1;
  }

  const results: CoxResult[] = [];
  results.push({
    group: ref,
    n: byGroup.get(ref)!.n,
    events: byGroup.get(ref)!.events,
    coefficient: 0,
    standardError: 0,
    zValue: 0,
    hazardRatio: 1,
    ciLower: 1,
    ciUpper: 1,
    pValue: 1,
    notEstimable: false,
  });
  for (let j = 0; j < otherGroups.length; j++) {
    const g = otherGroups[j];
    const b = beta[j];
    const s = se[j] || NaN;
    const z = isFinite(s) && s > 0 ? b / s : 0;
    const hr = Math.exp(b);
    const ciL = Math.exp(b - Z_95 * s);
    const ciU = Math.exp(b + Z_95 * s);
    const pval = isFinite(s) && s > 0 ? 2 * (1 - normalCdf(Math.abs(z))) : 1;
    const agg = byGroup.get(g)!;
    results.push({
      group: g,
      n: agg.n,
      events: agg.events,
      coefficient: b,
      standardError: s,
      zValue: z,
      hazardRatio: hr,
      ciLower: ciL,
      ciUpper: ciU,
      pValue: pval,
      notEstimable: agg.events === 0 || konfidenzintervallTraegtNicht(hr, ciL, ciU),
    });
  }

  // Schoenfeld-Residualdiagnostik (beibehalten aus Ursprungs-Implementierung)
  const logTimes: number[] = [];
  const residualsPerCoeff: number[][] = Array.from({ length: p }, () => []);
  // Same incremental risk set as computeScoreInfo (O(n) instead of O(n^2)).
  // Descending order only flips the overall sequence; the residual<->logTime
  // pairing is preserved, so the Pearson correlation below is unchanged.
  {
    let lo = data.length;
    let S0 = 0; const S1 = Array(p).fill(0) as number[];
    for (let ti = eventTimes.length - 1; ti >= 0; ti--) {
      const t = eventTimes[ti];
      while (lo > 0 && data[lo - 1].time >= t) {
        lo--;
        const r = data[lo];
        const w = Math.exp(dot(beta, r.x));
        S0 += w; addInPlace(S1, scale(r.x, w));
      }
      const xBar = scale(S1, 1 / Math.max(S0, 1e-32));
      for (let m = lo; m < data.length && data[m].time === t; m++) {
        const dObs = data[m];
        if (dObs.event !== 1) continue;
        const rVec = sub(dObs.x, xBar);
        for (let j = 0; j < p; j++) residualsPerCoeff[j].push(rVec[j]);
        logTimes.push(Math.log(Math.max(t, 1e-6)));
      }
    }
  }
  const perCoefficient: CoxPHTestResult[] = [];
  const pvals: number[] = [];
  for (let j = 0; j < p; j++) {
    const rho = pearsonCorrelation(residualsPerCoeff[j], logTimes);
    const n = Math.min(residualsPerCoeff[j].length, logTimes.length);
    const z = Math.abs(fisherZ(rho)) * Math.sqrt(Math.max(n - 3, 1));
    const pj = 2 * (1 - normalCdf(z));
    perCoefficient.push({ name: otherGroups[j], rho, pValue: pj });
    pvals.push(Math.max(Math.min(pj, 1), 1e-16));
  }
  const chi2Global = -2 * pvals.reduce((s, v) => s + Math.log(v), 0);
  const dfGlobal = 2 * p;
  const globalP = chi2SurvivalFunction(chi2Global, dfGlobal);
  const diagnostics: CoxDiagnostics = { perCoefficient, globalPValue: globalP };

  const modelStats: CoxModelStats = {
    logLikelihood: logLBeta,
    logLikelihoodNull: logLNull,
    aic,
    concordance,
    concordanceSE,
    likelihoodRatioTest: {
      chiSquared: lrChi2,
      df: lrDf,
      pValue: clampP(chi2SurvivalFunction(lrChi2, lrDf)),
    },
    waldTest: {
      chiSquared: waldChi2,
      df: waldDf,
      pValue: clampP(chi2SurvivalFunction(waldChi2, waldDf)),
    },
    scoreTest: {
      chiSquared: scoreChi2,
      df: scoreDf,
      pValue: clampP(chi2SurvivalFunction(scoreChi2, scoreDf)),
    },
    nObservations,
    nEvents,
    tiesMethod: ties,
    iterations: iter,
    converged,
  };

  return { referenceGroup: ref, results, modelStats, diagnostics };
}

// ============================================================================
// Harrell's C-Index
// ============================================================================

interface CIRow { time: number; event: number; eta: number }

/**
 * Harrell's C-Index, O(n log n) via Fenwick (BIT) on discretised η-ranks.
 *
 * For each event row at time t, count how many rows with strictly larger time
 * (the "seen" set) have lower / equal / higher η than the event row. This
 * yields concordant / tied / discordant counts and the comparable total.
 *
 * Returns exactly the same numbers as the O(n²) naive algorithm. Verified by
 * the parity test in utils/__tests__/concordance.test.ts.
 */
function concordanceIndex(rows: CIRow[]): { concordance: number; concordanceSE: number } {
  const n = rows.length;
  if (n < 2) return { concordance: NaN, concordanceSE: NaN };

  // Discretise distinct η values into 1..R ranks (1-indexed for the BIT).
  const uniqueEtas = [...new Set(rows.map(r => r.eta))].sort((a, b) => a - b);
  const etaRank = new Map<number, number>();
  uniqueEtas.forEach((v, i) => etaRank.set(v, i + 1));
  const R = uniqueEtas.length;

  // Iterate by descending time. The BIT holds counts of rows already seen,
  // which are exactly those with strictly larger time than the row being
  // processed. Same-time rows are batched: we read from the BIT first, then
  // add the whole batch, so within-batch pairs (same time) never contribute.
  const sorted = [...rows].sort((a, b) => b.time - a.time);

  const tree = new Int32Array(R + 1);
  const bitAdd = (i: number, v: number) => { for (; i <= R; i += i & -i) tree[i] += v; };
  const bitPrefix = (i: number) => { let s = 0; for (; i > 0; i -= i & -i) s += tree[i]; return s; };

  let concordant = 0;
  let discordant = 0;
  let tiedRisk = 0;
  let comparable = 0;

  let i = 0;
  while (i < n) {
    // Group rows by equal time.
    let j = i;
    while (j < n && sorted[j].time === sorted[i].time) j++;

    const seen = bitPrefix(R); // total rows currently in tree = rows with strictly larger time
    for (let k = i; k < j; k++) {
      const row = sorted[k];
      if (row.event !== 1) continue;
      const myRank = etaRank.get(row.eta) as number;
      // Concordant = seen rows with η < mine (lower risk, longer time = correct prediction).
      // Higher η = higher risk → an event row should have HIGHER η than censored / later rows.
      const lower = bitPrefix(myRank - 1);
      const atRank = bitPrefix(myRank) - lower;
      const higher = seen - lower - atRank;
      comparable += seen;
      concordant += lower;
      discordant += higher;
      tiedRisk += atRank;
    }
    // Now expose this batch to subsequent (earlier-time) rows.
    for (let k = i; k < j; k++) {
      bitAdd(etaRank.get(sorted[k].eta) as number, 1);
    }
    i = j;
  }

  if (comparable === 0) return { concordance: NaN, concordanceSE: NaN };
  const c = (concordant + 0.5 * tiedRisk) / comparable;
  // Noether-Approximation
  const se = Math.sqrt((c * (1 - c)) / comparable);
  return { concordance: c, concordanceSE: se };
}

// ============================================================================
// Vektor-/Matrix-Helfer
// ============================================================================

function dot(a: number[], b: number[]): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
}
function add(a: number[], b: number[]): number[] { return a.map((v, i) => v + b[i]); }
function sub(a: number[], b: number[]): number[] { return a.map((v, i) => v - b[i]); }
function scale(a: number[], k: number): number[] { return a.map(v => v * k); }
function addInPlace(a: number[], b: number[]) { for (let i = 0; i < a.length; i++) a[i] += b[i]; }
function subInPlace(a: number[], b: number[]) { for (let i = 0; i < a.length; i++) a[i] -= b[i]; }
function outer(x: number[], y: number[], w = 1): number[][] {
  const m = x.length; const n = y.length;
  const M = Array.from({ length: m }, () => Array(n).fill(0));
  for (let i = 0; i < m; i++) for (let j = 0; j < n; j++) M[i][j] = w * x[i] * y[j];
  return M;
}
function addMatInPlace(A: number[][], B: number[][]) { for (let i = 0; i < A.length; i++) for (let j = 0; j < A[i].length; j++) A[i][j] += B[i][j]; }
function scaleMat(A: number[][], k: number): number[][] { return A.map(row => row.map(v => v * k)); }
function subMat(A: number[][], B: number[][]): number[][] { return A.map((row, i) => row.map((v, j) => v - B[i][j])); }
function matVec(A: number[][], x: number[]): number[] {
  const y = Array(A.length).fill(0);
  for (let i = 0; i < A.length; i++) {
    let s = 0;
    for (let j = 0; j < x.length; j++) s += A[i][j] * x[j];
    y[i] = s;
  }
  return y;
}

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

function normalCdf(z: number): number { return 0.5 * (1 + erf(z / Math.sqrt(2))); }
function erf(x: number): number {
  const sign = x >= 0 ? 1 : -1;
  x = Math.abs(x);
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429;
  const p = 0.3275911; const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}

function pearsonCorrelation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n === 0) return 0;
  let sa = 0, sb = 0, saa = 0, sbb = 0, sab = 0;
  for (let i = 0; i < n; i++) { sa += a[i]; sb += b[i]; }
  const ma = sa / n, mb = sb / n;
  for (let i = 0; i < n; i++) { const xa = a[i] - ma, xb = b[i] - mb; saa += xa * xa; sbb += xb * xb; sab += xa * xb; }
  const denom = Math.sqrt(saa * sbb);
  if (denom === 0) return 0;
  return Math.max(-1, Math.min(1, sab / denom));
}
function fisherZ(r: number): number { return 0.5 * Math.log((1 + r) / Math.max(1e-12, 1 - r)); }

// Chi²-Verteilungsfunktion — gleiche Implementierung wie in utils/kaplan-meier.ts
function chi2Cdf(x: number, k: number): number {
  if (x <= 0) return 0;
  if (k <= 0) return 0;
  return regularizedLowerGamma(k / 2, x / 2);
}
function regularizedLowerGamma(s: number, x: number): number {
  if (x <= 0) return 0;
  if (x < s + 1) {
    let term = 1 / s;
    let sum = term;
    for (let n = 1; n < 1000; n++) {
      term *= x / (s + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-14) break;
    }
    return sum * Math.exp(-x + s * Math.log(x) - logGamma(s));
  } else {
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
// Local twin of the same-named function in utils/kaplan-meier.ts, kept here
// because this file already duplicates chi2Cdf/regularizedLowerGamma instead
// of importing them, to stay self-contained.
// This exists because 1 - chi2Cdf(x, k) underflows to exactly 0 once the CDF
// rounds to 1 in double precision: a highly significant Cox model (chi2 well
// above 100) would otherwise report p = 0 instead of a tiny nonzero value.
// The upper tail Q is already computed directly by the continued-fraction
// branch below; returning it unchanged avoids that cancellation.
function chi2SurvivalFunction(x: number, k: number): number {
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
function logGamma(x: number): number {
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7,
  ];
  if (x < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * x)) - logGamma(1 - x);
  x -= 1;
  let a = c[0];
  const t = x + g + 0.5;
  for (let i = 1; i < g + 2; i++) a += c[i] / (x + i);
  return 0.5 * Math.log(2 * Math.PI) + (x + 0.5) * Math.log(t) - t + Math.log(a);
}

function clampP(p: number): number { return Math.max(0, Math.min(1, p)); }

export interface CoxPHTestResult { name: string; rho: number; pValue: number }
export interface CoxDiagnostics { perCoefficient: CoxPHTestResult[]; globalPValue: number }
