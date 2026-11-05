/* global process, console */
// Sammelt die Lizenzen der ausgelieferten npm-Pakete (dependencies samt
// Unterabhängigkeiten, ohne devDependencies) in einer Textdatei.
// Aufruf:  node scripts/third-party-licenses.mjs [Ausgabedatei] [Standalone-node_modules]
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * @typedef {{ datei: string, text: string }} Lizenztext
 * @typedef {{ name: string, version: string, lizenz: string, repository: string, texte: Lizenztext[], bibliotheken: Record<string, string> }} Paket
 */

const LIZENZDATEI = /^(license|licence|copying|notice)/i;

/** @param {string} datei @returns {any} */
function liesJson(datei) {
  return JSON.parse(readFileSync(datei, "utf8"));
}

/**
 * Sucht ein Paket wie Node: erst im verschachtelten node_modules, dann aufwärts.
 * @param {string} name @param {string} von @returns {string | null}
 */
function finde(name, von) {
  for (let dir = von; ; dir = path.dirname(dir)) {
    if (path.basename(dir) !== "node_modules") {
      const kandidat = path.join(dir, "node_modules", name);
      if (existsSync(path.join(kandidat, "package.json"))) return kandidat;
    }
    if (path.dirname(dir) === dir) return null;
  }
}

/** @param {any} json @returns {string} */
function lizenzVon(json) {
  const roh = json.license ?? json.licenses;
  if (Array.isArray(roh)) return roh.map((l) => (typeof l === "string" ? l : l.type)).join(", ");
  if (roh && typeof roh === "object") return String(roh.type);
  return roh ? String(roh) : "unbekannt";
}

/** @param {any} json @returns {string} */
function repositoryVon(json) {
  const r = json.repository;
  const url = typeof r === "string" ? r : (r?.url ?? "");
  return url.replace(/^git\+/, "");
}

/**
 * @param {string} ordner @param {any} json @returns {Paket}
 */
function liesPaket(ordner, json) {
  const texte = readdirSync(ordner, { withFileTypes: true })
    .filter((e) => e.isFile() && LIZENZDATEI.test(e.name))
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((e) => ({ datei: e.name, text: readFileSync(path.join(ordner, e.name), "utf8").replace(/\r\n/g, "\n").trim() }));
  // sharp-libvips nennt die gebündelten Bibliotheken samt Versionen in versions.json
  const versionen = path.join(ordner, "versions.json");
  const bibliotheken = existsSync(versionen) ? liesJson(versionen) : {};
  return {
    name: json.name,
    version: json.version,
    lizenz: lizenzVon(json),
    repository: repositoryVon(json),
    texte,
    bibliotheken,
  };
}

/** Feste Reihenfolge nach Codepunkten, unabhängig von der Systemsprache. */
const ordinal = (/** @type {string} */ a, /** @type {string} */ b) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Liest alle Pakete eines node_modules-Ordners samt verschachtelter node_modules.
 * @param {string} nm @param {(ordner: string, json: any) => void} aufnehmen
 */
function durchsuche(nm, aufnehmen) {
  for (const e of readdirSync(nm, { withFileTypes: true })) {
    if (!e.isDirectory() || e.name.startsWith(".")) continue;
    const ordner = path.join(nm, e.name);
    if (e.name.startsWith("@")) {
      durchsuche(ordner, aufnehmen);
      continue;
    }
    if (existsSync(path.join(ordner, "package.json"))) aufnehmen(ordner, liesJson(path.join(ordner, "package.json")));
    const tief = path.join(ordner, "node_modules");
    if (existsSync(tief)) durchsuche(tief, aufnehmen);
  }
}

/**
 * Alle Pakete, die mit der Anwendung ausgeliefert werden, alphabetisch und ohne Doppelte.
 * @param {string} wurzel Projektordner mit package.json und node_modules
 * @param {string} [standalone] node_modules des Standalone-Builds, dessen Pakete zusätzlich aufgenommen werden
 * @returns {Paket[]}
 */
export function sammleLizenzen(wurzel, standalone) {
  /** @type {Map<string, Paket>} */
  const gefunden = new Map();
  const besucht = new Set();
  /** @param {string} ordner @param {any} json */
  const folge = (ordner, json) => {
    const namen = Object.keys({ ...json.dependencies, ...json.optionalDependencies });
    for (const name of namen) {
      const ziel = finde(name, ordner);
      if (!ziel || besucht.has(ziel)) continue;
      besucht.add(ziel);
      const zielJson = liesJson(path.join(ziel, "package.json"));
      gefunden.set(`${zielJson.name}@${zielJson.version}`, liesPaket(ziel, zielJson));
      folge(ziel, zielJson);
    }
  };
  folge(wurzel, { dependencies: liesJson(path.join(wurzel, "package.json")).dependencies });
  if (standalone) {
    durchsuche(standalone, (ordner, json) => {
      if (json.name && json.version && !gefunden.has(`${json.name}@${json.version}`)) {
        gefunden.set(`${json.name}@${json.version}`, liesPaket(ordner, json));
      }
    });
  }
  return [...gefunden.values()].sort((a, b) => ordinal(`${a.name}@${a.version}`, `${b.name}@${b.version}`));
}

/** @param {Paket[]} pakete @param {string} version @returns {string} */
function formatiere(pakete, version) {
  const trenner = "=".repeat(78);
  const kopf = [
    `ONCOcurve ${version} enthält die folgenden Komponenten Dritter und liefert sie aus.`,
    "Die Lizenz von ONCOcurve selbst steht in LICENSE (AGPL-3.0), weitere Inhalte",
    "Dritter (UI-Komponenten, Schrift, Daten) stehen in NOTICE.",
    "Einige Hilfspakete sind in Next.js selbst gebündelt (next/dist/compiled) und fallen",
    "dort unter die Lizenzen des Pakets next.",
    "",
    "Basisimage",
    "----------",
    "Das Docker-Image basiert auf dem offiziellen Image node:26-alpine. Node.js steht",
    "unter der MIT-Lizenz (https://github.com/nodejs/node/blob/main/LICENSE). Die",
    "Alpine-Linux-Pakete stehen unter ihren jeweiligen Lizenzen, im Image abrufbar",
    "mit `apk info -L` bzw. unter https://pkgs.alpinelinux.org.",
  ];
  const vips = pakete.filter((p) => p.name.startsWith("@img/sharp-libvips-"));
  for (const p of vips) {
    const v = p.bibliotheken.vips ?? p.version;
    kopf.push(
      "",
      "libvips",
      "-------",
      `${p.name}@${p.version} enthält libvips ${v} unter LGPL-3.0-or-later.`,
      "libvips ist dynamisch gelinkt (lib/libvips-cpp.so* im Paket) und kann durch einen",
      "kompatiblen Build ersetzt werden. Quellcode: https://github.com/libvips/libvips",
      `(Tag v${v}). Die vollständigen Lizenztexte (LGPL-3.0 und die darin`,
      "referenzierte GPL-3.0) folgen am Ende dieser Datei.",
      "",
      "Im Paket gebündelte Bibliotheken:",
      ...Object.entries(p.bibliotheken).map(([n, ver]) => `  ${n} ${ver}`),
    );
  }
  const abschnitte = pakete.map((p) => {
    const zeilen = [trenner, `${p.name}@${p.version}`, `Lizenz: ${p.lizenz}`];
    if (p.repository) zeilen.push(`Repository: ${p.repository}`);
    if (p.texte.length === 0) {
      zeilen.push("", `Keine Lizenzdatei im Paket enthalten, Lizenz laut package.json: ${p.lizenz}`);
    }
    for (const t of p.texte) zeilen.push("", `--- ${t.datei} ---`, t.text);
    return zeilen.join("\n");
  });
  const texte = vips.length === 0 ? [] : [
    ["GNU Lesser General Public License 3.0", "LGPL-3.0.txt"],
    ["GNU General Public License 3.0", "GPL-3.0.txt"],
  ].map(([titel, datei]) => [
    trenner,
    titel,
    "",
    readFileSync(new URL(`../licenses/${datei}`, import.meta.url), "utf8").replace(/\r\n/g, "\n").trim(),
  ].join("\n"));
  return [kopf.join("\n"), ...abschnitte, ...texte].join("\n\n") + "\n";
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const ziel = process.argv[2] ?? "THIRD_PARTY_LICENSES.txt";
  const wurzel = process.cwd();
  const pakete = sammleLizenzen(wurzel, process.argv[3]);
  writeFileSync(ziel, formatiere(pakete, liesJson(path.join(wurzel, "package.json")).version), "utf8");
  console.log(`${pakete.length} Pakete nach ${ziel} geschrieben`);
}
