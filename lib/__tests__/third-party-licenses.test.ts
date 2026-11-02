import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { sammleLizenzen } from "../../scripts/third-party-licenses.mjs";

let wurzel: string;

function paket(ordner: string, json: Record<string, unknown>, dateien: Record<string, string> = {}): void {
  mkdirSync(ordner, { recursive: true });
  writeFileSync(path.join(ordner, "package.json"), JSON.stringify(json));
  for (const [name, inhalt] of Object.entries(dateien)) writeFileSync(path.join(ordner, name), inhalt);
}

beforeEach(() => {
  wurzel = mkdtempSync(path.join(tmpdir(), "tpl-"));
  paket(wurzel, {
    name: "app",
    version: "1.0.0",
    dependencies: { a: "1" },
    devDependencies: { c: "1" },
  });
  const nm = path.join(wurzel, "node_modules");
  paket(path.join(nm, "a"), { name: "a", version: "1.0.0", license: "MIT", dependencies: { b: "1" } });
  paket(path.join(nm, "b"), { name: "b", version: "1.0.0", license: "ISC" }, { LICENSE: "Text von b 1.0.0" });
  paket(path.join(nm, "c"), { name: "c", version: "1.0.0", license: "MIT" });
});

afterEach(() => rmSync(wurzel, { recursive: true, force: true }));

describe("sammleLizenzen", () => {
  it("folgt den Abhängigkeiten und lässt devDependencies weg", () => {
    expect(sammleLizenzen(wurzel).map((p) => `${p.name}@${p.version}`)).toEqual(["a@1.0.0", "b@1.0.0"]);
  });

  it("liest Lizenzdateien und vermerkt fehlende", () => {
    const [a, b] = sammleLizenzen(wurzel);
    expect(a.texte).toEqual([]);
    expect(b.texte[0].text).toBe("Text von b 1.0.0");
    expect(b.lizenz).toBe("ISC");
  });

  it("bevorzugt das verschachtelte node_modules", () => {
    paket(
      path.join(wurzel, "node_modules", "a", "node_modules", "b"),
      { name: "b", version: "2.0.0", license: "MIT" },
      { "licence.md": "Text von b 2.0.0" },
    );
    const b = sammleLizenzen(wurzel).find((p) => p.name === "b");
    expect(b?.version).toBe("2.0.0");
    expect(b?.texte[0].text).toBe("Text von b 2.0.0");
  });

  it("überspringt nicht installierte optionale Pakete", () => {
    paket(path.join(wurzel, "node_modules", "a"), {
      name: "a",
      version: "1.0.0",
      license: "MIT",
      optionalDependencies: { fehlt: "1" },
    });
    expect(sammleLizenzen(wurzel).map((p) => p.name)).toEqual(["a"]);
  });
});

describe("sammleLizenzen mit Standalone-Ordner", () => {
  it("nimmt Pakete auf, die nur dort liegen, auch verschachtelt und mit Scope", () => {
    const sa = mkdtempSync(path.join(tmpdir(), "tpl-sa-"));
    try {
      paket(path.join(sa, "nur-hier"), { name: "nur-hier", version: "3.0.0", license: "MIT" }, { LICENSE: "Text nur-hier" });
      paket(path.join(sa, "nur-hier", "node_modules", "tief"), { name: "tief", version: "1.0.0", license: "MIT" });
      paket(path.join(sa, "@s", "x"), { name: "@s/x", version: "1.0.0", license: "MIT" });
      paket(path.join(sa, "b"), { name: "b", version: "1.0.0", license: "ISC" });
      const namen = sammleLizenzen(wurzel, sa).map((p) => `${p.name}@${p.version}`);
      expect(namen).toEqual(["@s/x@1.0.0", "a@1.0.0", "b@1.0.0", "nur-hier@3.0.0", "tief@1.0.0"]);
    } finally {
      rmSync(sa, { recursive: true, force: true });
    }
  });
});
