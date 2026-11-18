// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { parseOBDSXMLNew } from "../obds-parser-new";

// Lebenddatum (Zensurdatum) im oBDS-3-Import: Nachmeldungen mit neuem
// Diagnosedatum (Folgetumor, Fernmetastase) oder Therapiebeginn (SYST, ST, OP)
// belegen, dass die Person zu diesem Zeitpunkt lebte. Meldedatum dagegen nicht.

const DIAG = "2020-01-15";

function meldung(id: string, inner: string, diagnosedatum = DIAG): string {
  return `
        <Meldung Meldung_ID="${id}">
          <Meldedatum>2020-02-01</Meldedatum>
          <Tumorzuordnung Tumor_ID="1">
            <Primaertumor_ICD><Code>C50.4</Code><Version>10 2021 GM</Version></Primaertumor_ICD>
            <Diagnosedatum Datumsgenauigkeit="E">${diagnosedatum}</Diagnosedatum>
          </Tumorzuordnung>
          ${inner}
        </Meldung>`;
}

function obds(meldungen: string[], tod = ""): string {
  return `<?xml version="1.0" encoding="UTF-8" standalone="no"?>
<oBDS xmlns="http://www.basisdatensatz.de/oBDS/XML" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Schema_Version="3.0.5">
  <Meldedatum>2025-01-01</Meldedatum>
  <Menge_Patient>
    <Patient Patient_ID="P1">
      <Patienten_Stammdaten>
        <Geschlecht>W</Geschlecht>
        <Geburtsdatum Datumsgenauigkeit="E">1960-03-15</Geburtsdatum>
      </Patienten_Stammdaten>
      <Menge_Meldung>${meldungen.join("")}
      </Menge_Meldung>${tod}
    </Patient>
  </Menge_Patient>
</oBDS>`;
}

function parseOne(xml: string) {
  const result = parseOBDSXMLNew(xml);
  expect(result.errors).toEqual([]);
  expect(result.patients).toHaveLength(1);
  return result.patients[0];
}

function iso(d: Date | null | undefined): string | null {
  return d ? d.toISOString().slice(0, 10) : null;
}

const erstmeldung = meldung("M1", "");

describe("oBDS-Import: Lebenddatum aus Diagnose- und Therapiedaten", () => {
  it("verwendet SYST/Beginn einer Nachmeldung als Lebenddatum", () => {
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", `<SYST SYST_ID="S1"><Beginn Datumsgenauigkeit="E">2021-01-15</Beginn></SYST>`),
    ]));
    expect(iso(p.followupDate)).toBe("2021-01-15");
    expect(p.survivalTime).toBe(12);
    expect(p.event).toBe(false);
  });

  it("verwendet ein späteres Tumorzuordnung/Diagnosedatum (Folgetumor)", () => {
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", "", "2022-03-10"),
    ]));
    expect(iso(p.followupDate)).toBe("2022-03-10");
  });

  it("erkennt Fernmetastase/Diagnosedatum", () => {
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", `<Diagnose><Menge_FM><Fernmetastase><Diagnosedatum Datumsgenauigkeit="E">2021-06-01</Diagnosedatum><Lokalisation>PUL</Lokalisation></Fernmetastase></Menge_FM></Diagnose>`),
    ]));
    expect(iso(p.followupDate)).toBe("2021-06-01");
  });

  it("erkennt Bestrahlung/Beginn", () => {
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", `<ST ST_ID="ST1"><Menge_Bestrahlung><Bestrahlung><Beginn Datumsgenauigkeit="E">2021-08-20</Beginn></Bestrahlung></Menge_Bestrahlung></ST>`),
    ]));
    expect(iso(p.followupDate)).toBe("2021-08-20");
  });

  it("erkennt OP/Datum", () => {
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", `<OP OP_ID="OP1"><Datum>2020-09-05</Datum></OP>`),
    ]));
    expect(iso(p.followupDate)).toBe("2020-09-05");
  });

  it("ignoriert Fruehere_Tumorerkrankung/Diagnosedatum", () => {
    const p = parseOne(obds([
      meldung("M1", `<Diagnose><Menge_Fruehere_Tumorerkrankung><Fruehere_Tumorerkrankung><ICD><Code>C61</Code></ICD><Diagnosedatum>2024</Diagnosedatum></Fruehere_Tumorerkrankung></Menge_Fruehere_Tumorerkrankung></Diagnose>`),
      meldung("M2", `<SYST SYST_ID="S1"><Beginn Datumsgenauigkeit="E">2021-01-15</Beginn></SYST>`),
    ]));
    expect(iso(p.followupDate)).toBe("2021-01-15");
  });

  it("ignoriert generisches Datum ohne passendes Elternelement (z. B. Zusatzitem, cTNM)", () => {
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", `<cTNM><Datum>2023-05-05</Datum></cTNM><Menge_Zusatzitem><Zusatzitem><Datum>2024-01-01</Datum><Art>X</Art><Wert>1</Wert></Zusatzitem></Menge_Zusatzitem><SYST SYST_ID="S1"><Beginn Datumsgenauigkeit="E">2021-01-15</Beginn></SYST>`),
    ]));
    expect(iso(p.followupDate)).toBe("2021-01-15");
  });

  it("Meldedatum allein ergibt kein Lebenddatum", () => {
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", `<Meldedatum>2023-07-01</Meldedatum>`),
    ]));
    expect(p.followupDate).toBeNull();
  });

  it("ignoriert Datumsgenauigkeit=\"V\"", () => {
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", `<SYST SYST_ID="S1"><Beginn Datumsgenauigkeit="T">2021-01-15</Beginn></SYST>`),
      meldung("M3", `<SYST SYST_ID="S2"><Beginn Datumsgenauigkeit="V">2023-06-15</Beginn></SYST>`),
    ]));
    expect(iso(p.followupDate)).toBe("2021-01-15");
  });

  it("ignoriert Platzhalterdatum 1900 und Zukunftsdatum", () => {
    const zukunft = `${new Date().getFullYear() + 1}-06-15`;
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", `<SYST SYST_ID="S1"><Beginn Datumsgenauigkeit="E">2021-01-15</Beginn></SYST>`),
      meldung("M3", `<SYST SYST_ID="S2"><Beginn Datumsgenauigkeit="E">${zukunft}</Beginn></SYST><OP OP_ID="OP1"><Datum>1900-07-01</Datum></OP>`),
    ]));
    expect(iso(p.followupDate)).toBe("2021-01-15");
  });

  it("Verstorben: Sterbedatum bleibt maßgeblich, event = true", () => {
    const p = parseOne(obds([
      erstmeldung,
      meldung("M2", `<SYST SYST_ID="S1"><Beginn Datumsgenauigkeit="E">2021-01-15</Beginn></SYST>`),
    ], `<Tod><Sterbedatum>2022-01-15</Sterbedatum></Tod>`));
    expect(iso(p.followupDate)).toBe("2022-01-15");
    expect(p.event).toBe(true);
    expect(p.survivalTime).toBe(24);
  });

  it("nur das eigene Diagnosedatum → kein Follow-up", () => {
    const p = parseOne(obds([erstmeldung]));
    expect(p.followupDate).toBeNull();
    expect(p.survivalTime).toBe(0);
  });
});
