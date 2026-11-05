import { XMLParser } from "fast-xml-parser";

// Elemente, die laut Prüfschema mehrfach vorkommen dürfen. Ohne diese Liste
// liefert fast-xml-parser bei genau einem Vorkommen ein Objekt statt einer
// Liste, und der Kern müsste jedes Mal beide Fälle unterscheiden.
const REPEATING_TAGS = new Set([
  "Patient",
  "Fall",
  "Case",
  "FollowUp",
  "Follow_Up",
  "Fernmetastase",
  "Wert",
]);

const BYTE_ORDER_MARK = /^﻿/;

export type XmlNode = Record<string, unknown>;

const parser = new XMLParser({
  ignoreAttributes: true,
  parseTagValue: false,
  trimValues: true,
  isArray: (name: string): boolean => REPEATING_TAGS.has(name),
});

export function parseXml(xml: string): XmlNode {
  return parser.parse(xml.replace(BYTE_ORDER_MARK, "")) as XmlNode;
}

export function readRootName(doc: XmlNode): string | null {
  return Object.keys(doc).find((key) => key !== "?xml") ?? null;
}

function step(node: unknown, segment: string): unknown {
  const current = Array.isArray(node) ? node[0] : node;
  if (current === null || typeof current !== "object") return undefined;
  return (current as XmlNode)[segment];
}

function walk(node: unknown, path: string): unknown {
  let current: unknown = node;
  for (const segment of path.split("/")) {
    current = step(current, segment);
    if (current === undefined) return undefined;
  }
  return current;
}

export function get(node: unknown, path: string): string | null {
  const found = walk(node, path);
  const value = Array.isArray(found) ? found[0] : found;
  if (typeof value !== "string") return null;
  return value.length > 0 ? value : null;
}

export function getAll(node: unknown, path: string): XmlNode[] {
  const found = walk(node, path);
  if (Array.isArray(found)) return found as XmlNode[];
  if (found !== null && typeof found === "object") return [found as XmlNode];
  return [];
}
