import { describe, expect, it } from "vitest";
import { parseCases } from "../oncobox/parse-cases";
import { BRUST_1_PROFILE } from "../oncobox/profiles/brust-1";
import { DARM_1_PROFILE } from "../oncobox/profiles/darm-1";

const BRUST_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Patienten>
  <Patient>
    <Stammdaten><PatientID>1</PatientID><Geschlecht>W</Geschlecht><Alter>62</Alter><Synchron>N</Synchron></Stammdaten>
    <Fall>
      <Fallinfos><Zentrumsfall>ZF</Zentrumsfall><Primärtumor>P</Primärtumor><Vorerkrankungen>J</Vorerkrankungen><Organ>BZ</Organ><FallNummer>1</FallNummer></Fallinfos>
      <Diagnose><DatumDiagnose>2019-01-10</DatumDiagnose><TumordiagnoseICD10>C50.4</TumordiagnoseICD10></Diagnose>
      <PostoperativeHistologieStaging><pT>pT1c</pT><pN>pN0</pN><pM>M0</pM><PSRLokalNachAllenOPs>R1</PSRLokalNachAllenOPs></PostoperativeHistologieStaging>
      <FollowUp><DatumFollowUp>2020-01-10</DatumFollowUp><Vitalstatus>L</Vitalstatus><TumorstatusLokal>K</TumorstatusLokal><LymphknotenRezidiv>K</LymphknotenRezidiv><Fernmetastasen>K</Fernmetastasen><TumorstatusGesamt>VR</TumorstatusGesamt><Zweittumor>N</Zweittumor></FollowUp>
      <Abschluss><Sterbedatum></Sterbedatum></Abschluss>
    </Fall>
  </Patient>
</Patienten>`;

const DARM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<Patienten>
  <Patient>
    <Stammdaten><PatientID>1</PatientID><Geschlecht>M</Geschlecht><GeburtsJahr>1955</GeburtsJahr></Stammdaten>
    <Fall>
      <Anamnese><RelevanteKrebsvorerkrankungen>1</RelevanteKrebsvorerkrankungen></Anamnese>
      <Fallinfos><Zentrumsfall>1</Zentrumsfall><Organ>DZ</Organ><FallNummer>1</FallNummer></Fallinfos>
      <Diagnose><DatumErstdiagnosePrimaertumor>2019-02-01</DatumErstdiagnosePrimaertumor><ICDOLokalisation>C18.7</ICDOLokalisation><UICCStadium>4</UICCStadium><SynchroneBehandlungKolorektalerPrimaertumoren>0</SynchroneBehandlungKolorektalerPrimaertumoren></Diagnose>
      <ChirurgischePrimaertherapie><DatumOperativeTumorentfernung>2019-02-20</DatumOperativeTumorentfernung></ChirurgischePrimaertherapie>
      <PostoperativeHistologieStaging><pT>pT3</pT><pN>pN1</pN><postM>M1a</postM><PSRLokalNachAllenOPs>R0</PSRLokalNachAllenOPs><PSRGesamtNachPrimaertherapie>R2</PSRGesamtNachPrimaertherapie></PostoperativeHistologieStaging>
      <FollowUp><DatumFollowUp>2019-03-01</DatumFollowUp><Verstorben>0</Verstorben><LokoregionaeresRezidiv>2</LokoregionaeresRezidiv><LymphknotenRezidiv>0</LymphknotenRezidiv><Fernmetastasen>0</Fernmetastasen><Zweittumor>0</Zweittumor></FollowUp>
    </Fall>
  </Patient>
</Patienten>`;

describe("Ausschlussfelder der OncoBoxen", () => {
  it("liest die Brust-1.0-Felder", () => {
    const { cases } = parseCases(BRUST_XML, BRUST_1_PROFILE);
    expect(cases).toHaveLength(1);
    expect(cases[0].ausschlussFelder.residualstatusLokal).toBe("R1");
    expect(cases[0].ausschlussFelder.krebsvorerkrankung).toBe("J");
    // Felder, die diese Box nicht führt, bleiben null statt zu raten.
    expect(cases[0].ausschlussFelder.uiccStadium).toBeNull();
    expect(cases[0].ausschlussFelder.opDatum).toBeNull();
  });

  it("liest die Darm-1.0-Felder", () => {
    const { cases } = parseCases(DARM_XML, DARM_1_PROFILE);
    expect(cases).toHaveLength(1);
    expect(cases[0].ausschlussFelder.uiccStadium).toBe("4");
    expect(cases[0].ausschlussFelder.krebsvorerkrankung).toBe("1");
    expect(cases[0].ausschlussFelder.synchronerPrimaertumor).toBe("0");
    expect(cases[0].ausschlussFelder.residualstatusGesamt).toBe("R2");
    expect(cases[0].ausschlussFelder.opDatum).toBe("2019-02-20");
  });

  // Der Wert 2 heißt bei Darm "unbekannt". toBoolean macht daraus false und
  // unterschlägt damit den Unterschied zu 0. Die Kategorien von Darm brauchen
  // ihn, also liegt der Rohwert daneben.
  it("behält den Rohwert des Zweittumorfelds", () => {
    const { cases } = parseCases(DARM_XML, DARM_1_PROFILE);
    expect(cases[0].followUps[0].secondTumor).toBe(false);
    expect(cases[0].followUps[0].secondTumorRaw).toBe("0");
  });
});
