"""Generate sample-obds.xml for ONCOcurve in the current parser format."""

patients = [
    # id, gender, born, icd, diag, endpoint, is_dead, cT, cN, cM, uicc, grading
    (1,  "W", "1960-03-15", "C50.4", "2019-02-10", "2022-08-12", True,  "T2", "N1", "M0", "IIB",   "G2"),
    (2,  "W", "1964-07-22", "C50.9", "2020-05-20", "2024-10-15", False, "T1", "N0", "M0", "IA",    "G1"),
    (3,  "M", "1958-11-08", "C50.9", "2018-08-14", "2021-03-05", True,  "T3", "N2", "M1", "IV",    "G3"),
    (4,  "W", "1970-02-25", "C50.2", "2021-01-10", "2024-08-20", False, "T1", "N0", "M0", "IA",    "G1"),
    (5,  "W", "1956-09-04", "C50.8", "2019-06-18", "2024-11-10", False, "T2", "N0", "M0", "IIA",   "G2"),
    (6,  "W", "1952-12-30", "C50.5", "2017-10-22", "2021-05-18", True,  "T4", "N2", "M1", "IV",    "G3"),
    (7,  "W", "1967-04-11", "C50.4", "2020-03-15", "2024-07-20", False, "T2", "N1", "M0", "IIB",   "G2"),
    (8,  "W", "1972-06-28", "C50.9", "2021-09-05", "2024-12-10", False, "T1", "N0", "M0", "IA",    "G1"),
    (9,  "M", "1957-08-19", "C34.1", "2018-11-10", "2020-12-15", True,  "T3", "N2", "M0", "IIIB",  "G3"),
    (10, "W", "1963-03-14", "C34.3", "2019-07-25", "2024-09-10", False, "T2", "N0", "M0", "IB",    "G2"),
    (11, "M", "1950-01-06", "C34.8", "2017-04-20", "2019-08-30", True,  "T4", "N3", "M1", "IV",    "G3"),
    (12, "W", "1968-10-12", "C34.1", "2022-02-14", "2024-11-20", False, "T1", "N0", "M0", "IA",    "G1"),
    (13, "M", "1954-06-07", "C18.7", "2018-05-30", "2022-01-10", True,  "T3", "N1", "M0", "IIIA",  "G2"),
    (14, "W", "1962-09-23", "C18.2", "2020-03-18", "2023-10-20", False, "T2", "N0", "M0", "IIA",   "G2"),
    (15, "M", "1968-11-15", "C18.4", "2021-07-12", "2024-12-20", False, "T3", "N0", "M0", "IIB",   "G2"),
    (16, "W", "1946-03-01", "C18.7", "2016-09-08", "2020-06-15", True,  "T4", "N2", "M1", "IV",    "G3"),
    (17, "M", "1950-07-19", "C61",   "2018-03-25", "2024-08-15", False, "T2", "N0", "M0", "II",    "G2"),
    (18, "M", "1956-11-28", "C61",   "2019-12-10", "2024-10-25", False, "T1", "N0", "M0", "I",     "G1"),
    (19, "M", "1942-04-05", "C61",   "2017-06-12", "2022-03-20", True,  "T3", "N1", "M1", "IV",    "G3"),
    (20, "M", "1962-02-14", "C61",   "2021-04-22", "2024-09-15", False, "T2", "N0", "M0", "II",    "G1"),
    (21, "W", "1958-08-20", "C20",   "2019-11-15", "2024-07-10", False, "T2", "N0", "M0", "I",     "G2"),
    (22, "M", "1953-05-18", "C20",   "2018-02-28", "2021-09-12", True,  "T3", "N2", "M0", "IIIB",  "G3"),
    (23, "W", "1969-01-30", "C20",   "2022-01-18", "2024-12-05", False, "T1", "N0", "M0", "I",     "G1"),
    (24, "M", "1948-11-09", "C83.3", "2017-08-15", "2021-04-30", True,  "T2", "N0", "M0", "II",    "G3"),
    (25, "W", "1960-06-22", "C83.3", "2020-09-08", "2024-11-25", False, "T1", "N0", "M0", "I",     "G2"),
]

lines = []
lines.append('<?xml version="1.0" encoding="UTF-8" standalone="no"?>')
lines.append('<oBDS xmlns="http://www.basisdatensatz.de/oBDS/XML" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" Schema_Version="3.0.1" xsi:schemaLocation="http://www.basisdatensatz.de/oBDS/XML https://basisdatensatz.de/xml/oBDS_v3.0.1.xsd">')
lines.append('  <Absender Absender_ID="1" Software_ID="1" Software_Version="1">')
lines.append('    <Bezeichnung>ONCOcurve Beispieldaten</Bezeichnung>')
lines.append('    <Ansprechpartner>Test Absender</Ansprechpartner>')
lines.append('    <Anschrift>Teststrasse 1</Anschrift>')
lines.append('    <Telefon>+49 (0)69 123456</Telefon>')
lines.append('    <EMail>test@example.org</EMail>')
lines.append('  </Absender>')
lines.append('  <Meldedatum>2025-01-01</Meldedatum>')
lines.append('  <Menge_Patient>')

for pid, gender, born, icd, diag, endpoint, is_dead, ct, cn, cm, uicc, grading in patients:
    lines.append(f'    <Patient Patient_ID="{pid}">')
    lines.append( '      <Patienten_Stammdaten>')
    lines.append(f'        <Geschlecht>{gender}</Geschlecht>')
    lines.append(f'        <Geburtsdatum Datumsgenauigkeit="E">{born}</Geburtsdatum>')
    lines.append( '      </Patienten_Stammdaten>')
    lines.append( '      <Menge_Meldung>')
    lines.append(f'        <Meldung Meldung_ID="SYS_{pid}">')
    lines.append(f'          <Tumorzuordnung Tumor_ID="{pid}">')
    lines.append( '            <Primaertumor_ICD>')
    lines.append(f'              <Code>{icd}</Code>')
    lines.append( '              <Version>10 2021 GM</Version>')
    lines.append( '            </Primaertumor_ICD>')
    lines.append(f'            <Diagnosedatum Datumsgenauigkeit="E">{diag}</Diagnosedatum>')
    lines.append( '          </Tumorzuordnung>')
    lines.append( '          <cTNM>')
    lines.append( '            <c_p_u_Praefix_T>c</c_p_u_Praefix_T>')
    lines.append(f'            <T>{ct}</T>')
    lines.append( '            <c_p_u_Praefix_N>c</c_p_u_Praefix_N>')
    lines.append(f'            <N>{cn}</N>')
    lines.append( '            <c_p_u_Praefix_M>c</c_p_u_Praefix_M>')
    lines.append(f'            <M>{cm}</M>')
    if uicc != "-":
        lines.append(f'            <UICC_Stadium>{uicc}</UICC_Stadium>')
    lines.append( '          </cTNM>')
    lines.append( '          <Histologie>')
    lines.append(f'            <Grading>{grading}</Grading>')
    lines.append( '          </Histologie>')
    if not is_dead:
        lines.append( '          <Verlauf>')
        lines.append( '            <Verlauf_Typ>')
        lines.append(f'              <Untersuchungsdatum_Verlauf>{endpoint}</Untersuchungsdatum_Verlauf>')
        lines.append( '            </Verlauf_Typ>')
        lines.append( '          </Verlauf>')
    lines.append( '        </Meldung>')
    lines.append( '      </Menge_Meldung>')
    if is_dead:
        lines.append( '      <Tod>')
        lines.append(f'        <Sterbedatum>{endpoint}</Sterbedatum>')
        lines.append( '      </Tod>')
    lines.append( '    </Patient>')

lines.append('  </Menge_Patient>')
lines.append('</oBDS>')

out = '\n'.join(lines)
with open('public/sample-obds.xml', 'w', encoding='utf-8') as f:
    f.write(out)
print(f'Done. {len(patients)} patients, {len(lines)} lines written to public/sample-obds.xml')
