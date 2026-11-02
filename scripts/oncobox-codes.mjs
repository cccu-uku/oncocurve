// Liest die Aufzählungen samt Dokumentation aus den 2.0-Prüfschemata und
// schreibt sie als Codetabelle. Von Hand ausführen, wenn ein neues Schema
// dazukommt:  node scripts/oncobox-codes.mjs
import { readFileSync, writeFileSync } from "node:fs";

const SCHEMAS = [
  "data/oncobox-schemas/brust-2.xsd",
  "data/oncobox-schemas/darm-2.xsd",
  "data/oncobox-schemas/lunge-2.xsd",
];

const OUTPUT = "components/kaplan-meier/oncobox/codes.generated.ts";

const SIMPLE_TYPE = /<xs:simpleType name="([^"]+)">([\s\S]*?)<\/xs:simpleType>/g;
const ENUMERATION = /<xs:enumeration value="([^"]*)">([\s\S]*?)<\/xs:enumeration>/g;
const DOC_DE = /<xs:documentation xml:lang="de">([\s\S]*?)<\/xs:documentation>/;
const DOC_EN = /<xs:documentation xml:lang="en">([\s\S]*?)<\/xs:documentation>/;

function decode(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .trim();
}

const codes = {};

for (const path of SCHEMAS) {
  const xsd = readFileSync(path, "utf8");
  for (const [, typeName, body] of xsd.matchAll(SIMPLE_TYPE)) {
    const entries = {};
    for (const [, value, inner] of body.matchAll(ENUMERATION)) {
      const de = inner.match(DOC_DE);
      const en = inner.match(DOC_EN);
      if (!de && !en) continue;
      entries[value] = { de: decode(de?.[1] ?? ""), en: decode(en?.[1] ?? "") };
    }
    if (Object.keys(entries).length > 0) codes[typeName] = { ...codes[typeName], ...entries };
  }
}

const header = `// Erzeugt von scripts/oncobox-codes.mjs aus den Prüfschemata der
// OncoBox-Familie 2.0. Nicht von Hand ändern.

export interface CodeLabel {
  de: string;
  en: string;
}

export const ONCOBOX_CODES: Record<string, Record<string, CodeLabel>> =\n`;

writeFileSync(OUTPUT, header + JSON.stringify(codes, null, 2) + ";\n", "utf8");
console.log(`${Object.keys(codes).length} Codetabellen nach ${OUTPUT} geschrieben`);
