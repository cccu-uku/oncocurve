import { describe, expect, it } from "vitest";
import { ONCOBOX_CODES } from "../oncobox/codes.generated";
import { BRUST_1_PROFILE } from "../oncobox/profiles/brust-1";
import { DARM_1_PROFILE } from "../oncobox/profiles/darm-1";
import { FAMILY_2_PROFILE } from "../oncobox/profiles/family-2";
import { toVitalStatus } from "../oncobox/vital-status";

describe("toVitalStatus", () => {
  it("deutet L als lebend", () => {
    expect(toVitalStatus("L", FAMILY_2_PROFILE)).toBe("alive");
  });

  it("deutet T als verstorben", () => {
    expect(toVitalStatus("T", FAMILY_2_PROFILE)).toBe("dead");
  });

  // Brust 1.0 unterscheidet die Todesursache in der zweiten Stelle.
  it.each(["T", "TN", "TX"])("deutet %s in Brust 1.0 als verstorben", (raw) => {
    expect(toVitalStatus(raw, BRUST_1_PROFILE)).toBe("dead");
  });

  // Darm 1.0 codiert dasselbe im Feld Verstorben als Zahl.
  it("deutet 0 in Darm 1.0 als lebend", () => {
    expect(toVitalStatus("0", DARM_1_PROFILE)).toBe("alive");
  });

  it.each(["1", "2", "3"])("deutet %s in Darm 1.0 als verstorben", (raw) => {
    expect(toVitalStatus(raw, DARM_1_PROFILE)).toBe("dead");
  });

  // Die Wertelisten gelten je Box. Ein Brust-Code darf in Darm nichts bedeuten
  // und umgekehrt, sonst wäre der Präfixvergleich nur umbenannt.
  it("wertet Codes nicht boxfremd", () => {
    expect(toVitalStatus("T", DARM_1_PROFILE)).toBeNull();
    expect(toVitalStatus("1", BRUST_1_PROFILE)).toBeNull();
  });

  it("liefert null für unbekannte und fehlende Werte", () => {
    expect(toVitalStatus("X", FAMILY_2_PROFILE)).toBeNull();
    expect(toVitalStatus(null, FAMILY_2_PROFILE)).toBeNull();
  });

  // Regression gegen den früheren Präfixvergleich: TN und TX sind in
  // Familie 2.0 keine Todescodes, dort ist nur das nackte T definiert.
  it("fasst in Familie 2.0 kein T-Präfix mit", () => {
    expect(toVitalStatus("TN", FAMILY_2_PROFILE)).toBeNull();
  });

  // Regression: der alte Importer ließ unbekannte Werte auf "nicht leer"
  // zurückfallen und zählte lebende Patientinnen als Ereignis.
  it("macht aus dem Wort lebend kein Ereignis", () => {
    expect(toVitalStatus("lebend", FAMILY_2_PROFILE)).toBeNull();
  });
});

describe("erzeugte Codetabellen", () => {
  it("enthält den dokumentierten Vitalstatus", () => {
    expect(ONCOBOX_CODES.vitalstatus_einzeltyp.L.de).toBe("Lebend");
    expect(ONCOBOX_CODES.vitalstatus_einzeltyp.T.de).toBe("Verstorben");
  });

  // Beim Abtippen von Hand ginge genau das schief: N heißt No Change,
  // das Rezidiv ist R.
  it("hält die Verlaufscodes fest", () => {
    const local = ONCOBOX_CODES.verlauf_lokaler_tumorstatus_einzeltyp;
    expect(local.N.de).toContain("No Change");
    expect(local.R.de).toBe("Lokalrezidiv");
    expect(local.K.de).toBe("Kein Tumor nachweisbar");
  });
});
