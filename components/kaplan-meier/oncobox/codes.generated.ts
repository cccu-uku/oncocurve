// Erzeugt von scripts/oncobox-codes.mjs aus den Prüfschemata der
// OncoBox-Familie 2.0. Nicht von Hand ändern.

export interface CodeLabel {
  de: string;
  en: string;
}

export const ONCOBOX_CODES: Record<string, Record<string, CodeLabel>> =
{
  "geschlecht_einzeltyp": {
    "W": {
      "de": "Weiblich",
      "en": "Female"
    },
    "M": {
      "de": "Männlich",
      "en": "Male"
    },
    "D": {
      "de": "Divers",
      "en": "Diverse"
    },
    "X": {
      "de": "Keine Angabe / unbestimmt",
      "en": "Not specified / undetermined"
    }
  },
  "versicherungsform_einzeltyp": {
    "G": {
      "de": "Gesetzlich",
      "en": "Statutory"
    },
    "P": {
      "de": "Privat",
      "en": "Private"
    },
    "SZ": {
      "de": "Selbstzahler",
      "en": "Self-payer"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    }
  },
  "tod_tumorbedingt_einzeltyp": {
    "J": {
      "de": "Ja, die Person ist an einer Tumorerkrankung oder Folge einer Tumorerkrankung (einschließlich Behandlungskomplikation) verstorben",
      "en": "Yes, the person died of a tumour disease or consequence of a tumour disease (including treatment complication)"
    },
    "N": {
      "de": "Nein, die Person ist nicht an einer Tumorerkrankung oder Folge einer Tumorerkrankung (einschließlich Behandlungskomplikation) verstorben",
      "en": "No, the person did not die of a tumour disease or consequence of a tumour disease (including treatment complication)"
    }
  },
  "todesursache_icd_version_einzeltyp": {
    "10": {
      "de": "ICD-10",
      "en": "ICD-10"
    },
    "11": {
      "de": "ICD-11",
      "en": "ICD-11"
    }
  },
  "falldokumentation_einzeltyp": {
    "O": {
      "de": "Offen - i.O.",
      "en": "Open - ok"
    },
    "OmK": {
      "de": "Offen - Korrekturbedarf",
      "en": "Open - need for correction"
    },
    "A": {
      "de": "Abgeschlossen",
      "en": "Closed"
    }
  },
  "krebsvorerkrankungen_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "komorbiditaetenvordiagnose_einzeltyp": {
    "N": {
      "de": "Keine Komorbiditäten",
      "en": "No comorbidities"
    },
    "AID": {
      "de": "Aids/HIV",
      "en": "AIDS/HIV"
    },
    "ALK": {
      "de": "Alkoholabusus",
      "en": "Alcohol abuse"
    },
    "AN": {
      "de": "Anämie oder andere Blutkrankheit",
      "en": "Anaemia or other blood disease"
    },
    "BHD": {
      "de": "Bluthochdruck",
      "en": "Hypertension"
    },
    "CVD-I": {
      "de": "Covid - leicht/moderat/schwer",
      "en": "Covid - mild/moderate/severe"
    },
    "CVD-II": {
      "de": "Covid - kritisch (Beatmung u./o. Organversagen/-unterstützung u./o. Katecholamintherapie)",
      "en": "Covid - critical (ventilation and/or organ failure/support and/or catecholamine therapy)"
    },
    "DEM": {
      "de": "Demenz",
      "en": "Dementia"
    },
    "DEP": {
      "de": "Depressionen",
      "en": "Depression"
    },
    "DIA-C": {
      "de": "Diabetes (mit chronischen Implikationen)",
      "en": "Diabetes (with chronic implications)"
    },
    "DIA-NC": {
      "de": "Diabetes (ohne chronische Implikationen)",
      "en": "Diabetes (without chronic implications)"
    },
    "DRO": {
      "de": "Drogenabusus",
      "en": "Drug abuse"
    },
    "HSL": {
      "de": "Halbseitenlähmung",
      "en": "Hemiplegia"
    },
    "HI": {
      "de": "Herzinfarkt",
      "en": "Heart attack"
    },
    "HIS": {
      "de": "Herzinsuffizienz",
      "en": "Heart failure"
    },
    "HKV": {
      "de": "Herzklappenvitium",
      "en": "Heart valve vitium"
    },
    "HL": {
      "de": "Hyperlipidämie",
      "en": "Hyperlipidaemia"
    },
    "HRS": {
      "de": "Herzrhythmusstörungen",
      "en": "Cardiac arrhythmia"
    },
    "KHK": {
      "de": "Koronare Herzkrankheit",
      "en": "Coronary heart disease"
    },
    "LEB-MIL": {
      "de": "Lebererkrankung (mild)",
      "en": "Liver disease (mild)"
    },
    "LEB-MOD": {
      "de": "Lebererkrankung (moderat)",
      "en": "Liver disease (moderate)"
    },
    "LEB-SCH": {
      "de": "Lebererkrankung (schwer)",
      "en": "Liver disease (severe)"
    },
    "LUN-C": {
      "de": "Lungenerkrankung (mit chronischen Implikationen)",
      "en": "Lung disease (with chronic implications)"
    },
    "LUN-OC": {
      "de": "Lungenerkrankung (ohne chronische Implikationen)",
      "en": "Lung disease (without chronic implications)"
    },
    "MGS": {
      "de": "Magengeschwür",
      "en": "Gastric ulcer"
    },
    "NE": {
      "de": "Nervenerkrankungen",
      "en": "Nervous disorders"
    },
    "NL": {
      "de": "Nierenleiden",
      "en": "Kidney disease"
    },
    "PE": {
      "de": "Psychatrische Erkrankung (schwerwiegend)",
      "en": "Psychiatric disease (severe)"
    },
    "pHYP": {
      "de": "Pulmonale Hypertonie",
      "en": "Pulmonary hypertension"
    },
    "QSL": {
      "de": "Querschnittslähmung",
      "en": "Paraplegia"
    },
    "RK": {
      "de": "Rheumatologische Erkrankung/Arthritis",
      "en": "Rheumatological disease/arthritis"
    },
    "SA": {
      "de": "Schlaganfall/cerebrovaskuläre Insuffizienz",
      "en": "Stroke/cerebrovascular insufficiency"
    },
    "pAVK": {
      "de": "Periphere arterielle Verschlusskrankheit",
      "en": "Peripheral arterial occlusive disease"
    },
    "S": {
      "de": "Sonstige Komorbiditäten",
      "en": "Other comorbidities"
    }
  },
  "raucherstatus_einzeltyp": {
    "N": {
      "de": "Nie-Raucher",
      "en": "Never-smoker"
    },
    "Ex": {
      "de": "Ex-Raucher",
      "en": "Ex-smoker"
    },
    "G": {
      "de": "Gelegenheitsraucher",
      "en": "Occasional smoker"
    },
    "R": {
      "de": "(Starker) Raucher",
      "en": "(Heavy) smoker"
    }
  },
  "praetherapeutischer_menopausenstatus_einzeltyp": {
    "1": {
      "de": "Prämenopausal",
      "en": "Premenopausal"
    },
    "3": {
      "de": "Postmenopausal",
      "en": "Postmenopausal"
    }
  },
  "brca1_keimbahn_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "NB": {
      "de": "Nicht beurteilbar",
      "en": "Not assessable"
    },
    "NU": {
      "de": "Nicht untersucht",
      "en": "Not investigated"
    }
  },
  "brca2_keimbahn_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "NB": {
      "de": "Nicht beurteilbar",
      "en": "Not assessable"
    },
    "NU": {
      "de": "Nicht untersucht",
      "en": "Not investigated"
    }
  },
  "palb2_keimbahn_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "NB": {
      "de": "Nicht beurteilbar",
      "en": "Not assessable"
    },
    "NU": {
      "de": "Nicht untersucht",
      "en": "Not investigated"
    }
  },
  "seitenlokalisation_einzeltyp": {
    "L": {
      "de": "Links",
      "en": "Left"
    },
    "R": {
      "de": "Rechts",
      "en": "Right"
    },
    "B": {
      "de": "Beidseitig",
      "en": "Two-sided"
    },
    "M": {
      "de": "Mittellinie/Mittig",
      "en": "Midline/Centre"
    },
    "T": {
      "de": "Trifft nicht zu",
      "en": "Does not apply"
    }
  },
  "version_einzeltyp": {
    "10": {
      "de": "ICD-10",
      "en": "ICD-10"
    },
    "11": {
      "de": "ICD-11",
      "en": "ICD-11"
    }
  },
  "icd_10_einzeltyp": {
    "N": {
      "de": "Kein Primärtumor/Lokalrezidiv",
      "en": "No primary tumour/local recurrence"
    },
    "C50.0": {
      "de": "Brustwarze und Warzenhof",
      "en": "Nipple and areola"
    },
    "C50.1": {
      "de": "Zentraler Drüsenkörper der Brustdrüse",
      "en": "Central portion of breast"
    },
    "C50.2": {
      "de": "Oberer innerer Quadrant der Brustdrüse",
      "en": "Upper-inner quadrant of breast"
    },
    "C50.3": {
      "de": "Unterer innerer Quadrant der Brustdrüse",
      "en": "Lower-inner quadrant of breast"
    },
    "C50.4": {
      "de": "Oberer äußerer Quadrant der Brustdrüse",
      "en": "Upper-outer quadrant of breast"
    },
    "C50.5": {
      "de": "Unterer äußerer Quadrant der Brustdrüse",
      "en": "Lower-outer quadrant of breast"
    },
    "C50.6": {
      "de": "Recessus axillaris der Brustdrüse",
      "en": "Axillary tail of breast"
    },
    "C50.8": {
      "de": "Brustdrüse, mehrere Teilbereiche überlappend",
      "en": "Overlapping lesion of breast"
    },
    "C50.9": {
      "de": "Brustdrüse, nicht näher bezeichnet",
      "en": "Breast, unspecified"
    },
    "C77.3": {
      "de": "Axilläre Lymphknoten und Lymphknoten der oberen Extremität",
      "en": "Axillary lymph nodes and lymph nodes of the upper extremity"
    },
    "D05.1": {
      "de": "Carcinoma in situ der Milchgänge",
      "en": "Intraductal carcinoma in situ"
    },
    "D05.7": {
      "de": "Sonstiges Carcinom in situ der Brustdrüse",
      "en": "Other carcinoma in situ of breast"
    },
    "D05.9": {
      "de": "Carcinom in situ der Brustdrüse, nicht näher bezeichnet",
      "en": "Carcinoma in situ of breast, unspecified"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    },
    "C18.0": {
      "de": "Zäkum",
      "en": "Cecum"
    },
    "C18.1": {
      "de": "Appendix",
      "en": "Appendix"
    },
    "C18.2": {
      "de": "Colon ascendens",
      "en": "Colon ascendens"
    },
    "C18.3": {
      "de": "Flexura coli dextra",
      "en": "Flexura coli dextra"
    },
    "C18.4": {
      "de": "Colon transversum",
      "en": "Colon transversum"
    },
    "C18.5": {
      "de": "Flexura coli sinistra",
      "en": "Flexura coli sinistra"
    },
    "C18.6": {
      "de": "Colon descendens",
      "en": "Colon descendens"
    },
    "C18.7": {
      "de": "Colon sigmoideum",
      "en": "Colon sigmoideum"
    },
    "C18.8": {
      "de": "Kolon, mehrere Teilbereiche überlappend",
      "en": "Colon, multiple segments overlapping"
    },
    "C18.9": {
      "de": "Kolon, nicht näher bezeichnet",
      "en": "Colon, unspecified"
    },
    "C20": {
      "de": "Rektum",
      "en": "Rectum"
    },
    "C34.0": {
      "de": "Hauptbronchus",
      "en": "Main bronchus"
    },
    "C34.1": {
      "de": "Lungenoberlappen",
      "en": "Upper lobe, bronchus or lung"
    },
    "C34.2": {
      "de": "Lungenmittellappen",
      "en": "Middle lobe, bronchus or lung"
    },
    "C34.3": {
      "de": "Lungenunterlappen",
      "en": "Lower lobe, bronchus or lung"
    },
    "C34.8": {
      "de": "Lunge, mehrere Teilbereiche überlappend",
      "en": "Overlapping lesion of bronchus and lung"
    },
    "C34.9": {
      "de": "Lunge o.n.A",
      "en": "Bronchus or lung, unspecified"
    },
    "C77.1": {
      "de": "Intrathorakaler Lymphknoten",
      "en": "Intrathoracic lymph node"
    }
  },
  "icd_11_einzeltyp": {
    "N": {
      "de": "Kein Primärtumor/Lokalrezidiv",
      "en": "No primary tumour/local recurrence"
    },
    "2C60": {
      "de": "'Karzinom der Brustdrüse, spezialisierter Typ",
      "en": "Carcinoma of breast, specialised type"
    },
    "2C61": {
      "de": "Invasives Karzinom der Brustdrüse",
      "en": "Invasive carcinoma of breast"
    },
    "2C61.0": {
      "de": "Invasives duktales Karzinom der Brustdrüse",
      "en": "Invasive ductal carcinoma of breast"
    },
    "2C61.1": {
      "de": "Invasives lobuläres Karzinom der Brustdrüse",
      "en": "Invasive lobular carcinoma of breast"
    },
    "2C61.2": {
      "de": "Invasives pleomorphes lobuläres Karzinom der Brustdrüse",
      "en": "Invasive pleomorphic lobular carcinoma of breast"
    },
    "2C61.3": {
      "de": "Invasives Karzinom der Brustdrüse mit gemischten duktalen und lobulären Eigenschaften",
      "en": "Invasive carcinoma of breast with mixed ductal and lobular features"
    },
    "2C61.4": {
      "de": "Invasives Karzinom der Brustdrüse, nicht identifizierbarer Typ",
      "en": "Invasive carcinoma of breast, unidentifiable type"
    },
    "2C62": {
      "de": "Inflammatorisches Karzinom der Brustdrüse",
      "en": "Inflammatory carcinoma of breast"
    },
    "2C63": {
      "de": "Bösartiger Phylloidestumor der Brustdrüse",
      "en": "Malignant phyllodes tumour of breast"
    },
    "2C64": {
      "de": "Solides papilläres Karzinom der Brustdrüse mit Nachweis einer Invasion",
      "en": "Solid papillary carcinoma of breast with evidence of invasion"
    },
    "2C65": {
      "de": "Hereditäres Brust- und Ovarialkrebssyndrom",
      "en": "Hereditary breast and ovarian cancer syndrome"
    },
    "2C6Y": {
      "de": "Sonstige näher bezeichnete bösartige Neubildungen der Mamma",
      "en": "Other specified malignant neoplasms of breast"
    },
    "2C6Z": {
      "de": "Bösartige Neubildungen der Mamma, nicht näher bezeichnet",
      "en": "Malignant neoplasms of breast, unspecified"
    },
    "2D60.3": {
      "de": "Axilläre Lymphknoten",
      "en": "Axillary lymph nodes"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    },
    "XA6J68": {
      "de": "Zäkum",
      "en": "Cecum"
    },
    "2B81": {
      "de": "Appendix",
      "en": "Appendix"
    },
    "XA3AL5": {
      "de": "Colon ascendens",
      "en": "Colon ascendens"
    },
    "XA95L3": {
      "de": "Flexura coli dextra",
      "en": "Flexura coli dextra"
    },
    "2B90.2": {
      "de": "Colon transversum",
      "en": "Colon transversum"
    },
    "XA1PY9": {
      "de": "Flexura coli sinistra",
      "en": "Flexura coli sinistra"
    },
    "XA2G13": {
      "de": "Colon descendens",
      "en": "Colon descendens"
    },
    "2B90.3": {
      "de": "Colon sigmoideum",
      "en": "Colon sigmoideum"
    },
    "2B90.Z": {
      "de": "Kolon, nicht näher bezeichnet",
      "en": "Colon, unspecified"
    },
    "XA4KU2": {
      "de": "Rektum",
      "en": "Rectum"
    },
    "XA9TC5": {
      "de": "Hauptbronchus",
      "en": "Main bronchus"
    },
    "XA9HN5": {
      "de": "Lungenoberlappen",
      "en": "Upper lobe of lung"
    },
    "XA1N36": {
      "de": "Lungenmittellappen",
      "en": "Middle lobe of lung"
    },
    "XA7L34": {
      "de": "Lungenunterlappen",
      "en": "Lower lobe of lung"
    },
    "2D60.1": {
      "de": "Intrathorakaler Lymphknoten",
      "en": "Intrathoracic lymph node"
    }
  },
  "synchronebehandlung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "allgemeiner_leistungszustand_einzeltyp": {
    "0": {
      "de": "Normale, uneingeschränkte Aktivität wie vor der Erkrankung (90 – 100 % nach Karnofsky)",
      "en": "Normal, unrestricted activity as prior to the disease (90 - 100 % according to Karnofsky)"
    },
    "1": {
      "de": "Einschränkung bei körperlicher Anstrengung, aber gehfähig; leichte körperliche Arbeit bzw. Arbeit im Sitzen (z. B. leichte Hausarbeit oder Büroarbeit) möglich (70 – 80 % nach Karnofsky)",
      "en": "Restricted physical activity, but able to walk; light physical work or work while sitting (e.g. light housework or office work) possible (70 - 80 % according to Karnofsky)"
    },
    "2": {
      "de": "Gehfähig, Selbstversorgung möglich, aber nicht arbeitsfähig; kann mehr als 50 % der Wachzeit aufstehen (50 – 60 % nach Karnofsky)",
      "en": "Able to walk, self-care possible but not able to work; can stand up more than 50 % of the time awake (50 - 60 % according to Karnofsky)"
    },
    "3": {
      "de": "Nur begrenzte Selbstversorgung möglich; ist 50 % oder mehr der Wachzeit an Bett oder Stuhl gebunden (30 – 40 % nach Karnofsky)",
      "en": "Only limited self-care possible; is confined to bed or chair for 50% or more of waking hours (30 - 40% according to Karnofsky)"
    },
    "4": {
      "de": "Völlig pflegebedürftig, keinerlei Selbstversorgung möglich; völlig an Bett oder Stuhl gebunden (10 – 20 % nach Karnofsky)",
      "en": "Totally dependent, no self-care possible; totally confined to bed or chair (10 - 20 % according to Karnofsky)"
    }
  },
  "praeth_t_c_p_einzeltyp": {
    "c": {
      "de": "Klinisch",
      "en": "Clinical"
    },
    "p": {
      "de": "Pathologisch",
      "en": "Pathological"
    }
  },
  "praeth_t_einzeltyp": {
    "TX": {
      "de": "TX",
      "en": "TX"
    },
    "T0": {
      "de": "T0",
      "en": "T0"
    },
    "Tis": {
      "de": "Tis",
      "en": "Tis"
    },
    "LCIS": {
      "de": "Tis (LCIS)",
      "en": "Tis (LCIS)"
    },
    "DCIS": {
      "de": "Tis (DCIS)",
      "en": "Tis (DCIS)"
    },
    "Paget": {
      "de": "Tis (Paget)",
      "en": "Tis (Paget)"
    },
    "T1": {
      "de": "T1",
      "en": "T1"
    },
    "T1mi": {
      "de": "T1(mi)",
      "en": "T1(mi)"
    },
    "T1a": {
      "de": "T1a",
      "en": "T1a"
    },
    "T1b": {
      "de": "T1b",
      "en": "T1b"
    },
    "T1c": {
      "de": "T1c",
      "en": "T1c"
    },
    "T2": {
      "de": "T2",
      "en": "T2"
    },
    "T3": {
      "de": "T3",
      "en": "T3"
    },
    "T4": {
      "de": "T4",
      "en": "T4"
    },
    "T4a": {
      "de": "T4a",
      "en": "T4a"
    },
    "T4b": {
      "de": "T4b",
      "en": "T4b"
    },
    "T4c": {
      "de": "T4c",
      "en": "T4c"
    },
    "T4d": {
      "de": "T4d",
      "en": "T4d"
    },
    "T2a": {
      "de": "T2a",
      "en": "T2a"
    },
    "T2b": {
      "de": "T2b",
      "en": "T2b"
    }
  },
  "praeth_n_c_p_einzeltyp": {
    "c": {
      "de": "Klinisch",
      "en": "Clinical"
    },
    "p": {
      "de": "Pathologisch",
      "en": "Pathological"
    }
  },
  "praeth_n_einzeltyp": {
    "NX": {
      "de": "NX",
      "en": "NX"
    },
    "N0": {
      "de": "N0",
      "en": "N0"
    },
    "N1": {
      "de": "N1",
      "en": "N1"
    },
    "N1mi": {
      "de": "N1mi",
      "en": "N1mi"
    },
    "N1a": {
      "de": "N1a",
      "en": "N1a"
    },
    "N1b": {
      "de": "N1b",
      "en": "N1b"
    },
    "N1c": {
      "de": "N1c",
      "en": "N1c"
    },
    "N2": {
      "de": "N2",
      "en": "N2"
    },
    "N2a": {
      "de": "N2a",
      "en": "N2a"
    },
    "N2b": {
      "de": "N2b",
      "en": "N2b"
    },
    "N3": {
      "de": "N3",
      "en": "N3"
    },
    "N3a": {
      "de": "N3a",
      "en": "N3a"
    },
    "N3b": {
      "de": "N3b",
      "en": "N3b"
    },
    "N3c": {
      "de": "N3c",
      "en": "N3c"
    }
  },
  "praeth_m_c_p_einzeltyp": {
    "c": {
      "de": "Klinisch",
      "en": "Clinical"
    },
    "p": {
      "de": "Pathologisch",
      "en": "Pathological"
    }
  },
  "praeth_m_einzeltyp": {
    "MX": {
      "de": "MX",
      "en": "MX"
    },
    "M0": {
      "de": "M0",
      "en": "M0"
    },
    "M1": {
      "de": "M1",
      "en": "M1"
    },
    "M1a": {
      "de": "M1a",
      "en": "M1a"
    },
    "M1b": {
      "de": "M1b",
      "en": "M1b"
    },
    "M1c": {
      "de": "M1c",
      "en": "M1c"
    },
    "M1c1": {
      "de": "M1c1",
      "en": "M1c1"
    },
    "M1c2": {
      "de": "M1c2",
      "en": "M1c2"
    }
  },
  "y_symbol_einzeltyp": {
    "y": {
      "de": "Y",
      "en": "y"
    }
  },
  "postop_t_c_p_einzeltyp": {
    "c": {
      "de": "Klinisch",
      "en": "Clinical"
    },
    "p": {
      "de": "Pathologisch",
      "en": "Pathological"
    }
  },
  "postop_t_einzeltyp": {
    "TX": {
      "de": "TX",
      "en": "TX"
    },
    "T0": {
      "de": "T0",
      "en": "T0"
    },
    "Tis": {
      "de": "Tis",
      "en": "Tis"
    },
    "LCIS": {
      "de": "Tis (LCIS)",
      "en": "Tis (LCIS)"
    },
    "DCIS": {
      "de": "Tis (DCIS)",
      "en": "Tis (DCIS)"
    },
    "Paget": {
      "de": "Tis (Paget)",
      "en": "Tis (Paget)"
    },
    "T1": {
      "de": "T1",
      "en": "T1"
    },
    "T1mi": {
      "de": "T1(mi)",
      "en": "T1(mi)"
    },
    "T1a": {
      "de": "T1a",
      "en": "T1a"
    },
    "T1b": {
      "de": "T1b",
      "en": "T1b"
    },
    "T1c": {
      "de": "T1c",
      "en": "T1c"
    },
    "T2": {
      "de": "T2",
      "en": "T2"
    },
    "T3": {
      "de": "T3",
      "en": "T3"
    },
    "T4": {
      "de": "T4",
      "en": "T4"
    },
    "T4a": {
      "de": "T4a",
      "en": "T4a"
    },
    "T4b": {
      "de": "T4b",
      "en": "T4b"
    },
    "T4c": {
      "de": "T4c",
      "en": "T4c"
    },
    "T4d": {
      "de": "T4d",
      "en": "T4d"
    },
    "T2a": {
      "de": "T2a",
      "en": "T2a"
    },
    "T2b": {
      "de": "T2b",
      "en": "T2b"
    }
  },
  "postop_n_c_p_einzeltyp": {
    "c": {
      "de": "Klinisch",
      "en": "Clinical"
    },
    "p": {
      "de": "Pathologisch",
      "en": "Pathological"
    }
  },
  "postop_n_einzeltyp": {
    "NX": {
      "de": "NX",
      "en": "NX"
    },
    "N0": {
      "de": "N0",
      "en": "N0"
    },
    "N1": {
      "de": "N1",
      "en": "N1"
    },
    "N1mi": {
      "de": "N1mi",
      "en": "N1mi"
    },
    "N1a": {
      "de": "N1a",
      "en": "N1a"
    },
    "N1b": {
      "de": "N1b",
      "en": "N1b"
    },
    "N1c": {
      "de": "N1c",
      "en": "N1c"
    },
    "N2": {
      "de": "N2",
      "en": "N2"
    },
    "N2a": {
      "de": "N2a",
      "en": "N2a"
    },
    "N2b": {
      "de": "N2b",
      "en": "N2b"
    },
    "N3": {
      "de": "N3",
      "en": "N3"
    },
    "N3a": {
      "de": "N3a",
      "en": "N3a"
    },
    "N3b": {
      "de": "N3b",
      "en": "N3b"
    },
    "N3c": {
      "de": "N3c",
      "en": "N3c"
    }
  },
  "postop_m_c_p_einzeltyp": {
    "c": {
      "de": "Klinisch",
      "en": "Clinical"
    },
    "p": {
      "de": "Pathologisch",
      "en": "Pathological"
    }
  },
  "postop_m_einzeltyp": {
    "MX": {
      "de": "MX",
      "en": "MX"
    },
    "M0": {
      "de": "M0",
      "en": "M0"
    },
    "M1": {
      "de": "M1",
      "en": "M1"
    },
    "M1a": {
      "de": "M1a",
      "en": "M1a"
    },
    "M1b": {
      "de": "M1b",
      "en": "M1b"
    },
    "M1c": {
      "de": "M1c",
      "en": "M1c"
    },
    "M1c1": {
      "de": "M1c1",
      "en": "M1c1"
    },
    "M1c2": {
      "de": "M1c2",
      "en": "M1c2"
    }
  },
  "checkliste_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "gesamtbeurteilung_residualstatus_einzeltyp": {
    "R0": {
      "de": "Kein Residualtumor",
      "en": "No residual tumour"
    },
    "R1": {
      "de": "Mikroskopischer Residualtumor",
      "en": "Microscopic residual tumour"
    },
    "R2": {
      "de": "Makroskopischer Residualtumor",
      "en": "Macroscopic residual tumour"
    },
    "R1is": {
      "de": "In-Situ-Rest",
      "en": "In situ residue"
    },
    "R1cy+": {
      "de": "Cytologischer Rest",
      "en": "Cytological residue"
    },
    "RX": {
      "de": "Vorhandensein von Residualtumor kann nicht beurteilt werden",
      "en": "Presence of residual tumour cannot be assessed"
    }
  },
  "gesamtbeurteilung_tumorstatus_einzeltyp": {
    "V": {
      "de": "Vollremission (complete remission, CR)",
      "en": "Complete remission (CR)"
    },
    "T": {
      "de": "Teilremission (partial remission, PR)",
      "en": "Partial remission (PR)"
    },
    "K": {
      "de": "Keine Änderung (no change, NC) = stable disease",
      "en": "No change (NC) = stable disease"
    },
    "P": {
      "de": "Progression",
      "en": "Progression"
    },
    "D": {
      "de": "Divergentes Geschehen",
      "en": "Divergent disease"
    },
    "B": {
      "de": "Klinische Besserung des Zustandes, Teilremissionkriterien jedoch nicht erfüllt (minimal response, MR)",
      "en": "Clinical improvement of the condition, but partial remission criteria not met (minimal response, MR)"
    },
    "R": {
      "de": "Vollremission mit residualen Auffälligkeiten (CRr)",
      "en": "Full remission with residual abnormalities (CRr)"
    },
    "Y": {
      "de": "Rezidiv",
      "en": "Recurrence"
    },
    "X": {
      "de": "Fehlende Angabe",
      "en": "Missing indication"
    }
  },
  "tumorkonferenz_typ_einzeltyp": {
    "praeth": {
      "de": "Prätherapeutische Tumorkonferenz (Festlegung der Therapiestrategie)",
      "en": "Pre-therapeutic tumour conference (determination of therapy strategy)"
    },
    "postop": {
      "de": "Postoperative Tumorkonferenz (Planung der postoperativen Therapie, z. B. zur Frage adjuvante Therapie)",
      "en": "Postoperative tumour conference (planning of postoperative therapy, e.g. on the question of adjuvant therapy)"
    },
    "postth": {
      "de": "Posttherapeutische Tumorkonferenz (manche Tumoren werden nicht operiert)",
      "en": "Post-therapeutic tumour conference (some tumours are not operated on)"
    },
    "ther": {
      "de": "Therapieplanung ohne Tumorkonferenz",
      "en": "Therapy planning without tumour conference"
    }
  },
  "empfehlung_trastuzumab_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "praeparat_einzeltyp": {
    "B": {
      "de": "Biopsat",
      "en": "Biopsy specimen"
    },
    "R": {
      "de": "Resektat",
      "en": "Resectate"
    },
    "P": {
      "de": "Punktat",
      "en": "Punctate"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    }
  },
  "biopsieart_einzeltyp": {
    "N": {
      "de": "Keine Biopsie",
      "en": "No biopsy"
    },
    "SB": {
      "de": "Stanzbiopsie",
      "en": "Punch biopsy"
    },
    "VB": {
      "de": "Vakuumbiopsie",
      "en": "Vacuum biopsy"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    }
  },
  "grading_einzeltyp": {
    "0": {
      "de": "Primär erworbene Melanose ohne zelluläre Atypien (nur beim malignen Melanom der Konjunktiva)",
      "en": "Primary acquired melanosis without cellular atypia (only in malignant melanoma of the conjunctiva)"
    },
    "1": {
      "de": "Gut differenziert",
      "en": "Well differentiated"
    },
    "2": {
      "de": "Mäßig differenziert",
      "en": "Moderately differentiated"
    },
    "3": {
      "de": "Schlecht differenziert",
      "en": "Poorly differentiated"
    },
    "4": {
      "de": "Undifferenziert",
      "en": "Undifferentiated"
    },
    "5": {
      "de": "Nur für C61, TNM8",
      "en": "Only for C61, TNM8"
    },
    "X": {
      "de": "Nicht bestimmbar",
      "en": "Not determinable"
    },
    "L": {
      "de": "Low grade (G1 oder G2)",
      "en": "Low grade (G1 or G2)"
    },
    "M": {
      "de": "Intermediate grade (G2 oder G3)",
      "en": "Intermediate grade (G2 or G3)"
    },
    "H": {
      "de": "High grade (G3 oder G4)",
      "en": "High grade (G3 or G4)"
    },
    "B": {
      "de": "Borderline",
      "en": "Borderline"
    },
    "T": {
      "de": "Trifft nicht zu",
      "en": "Not applicable"
    }
  },
  "lokale_beurteilung_residualstatus_einzeltyp": {
    "R0": {
      "de": "Kein Residualtumor",
      "en": "No residual tumour"
    },
    "R1": {
      "de": "Mikroskopischer Residualtumor",
      "en": "Microscopic residual tumour"
    },
    "R2": {
      "de": "Makroskopischer Residualtumor",
      "en": "Macroscopic residual tumour"
    },
    "R1is": {
      "de": "In-Situ-Rest",
      "en": "In situ residue"
    },
    "R1cy+": {
      "de": "Cytologischer Rest",
      "en": "Cytological residue"
    },
    "RX": {
      "de": "Vorhandensein von Residualtumor kann nicht beurteilt werden",
      "en": "Presence of residual tumour cannot be assessed"
    }
  },
  "hormonrezeptorstatus_oestrogen_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    }
  },
  "hormonrezeptorstatus_progesteron_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    }
  },
  "her2neustatus_einzeltyp": {
    "IHC3": {
      "de": "IHC +++",
      "en": "IHC +++"
    },
    "IHC2+": {
      "de": "IHC ++  ISH positiv",
      "en": "IHC ++  ISH positiv"
    },
    "IHC2-": {
      "de": "IHC ++ ISH negativ",
      "en": "IHC ++ ISH negativ"
    },
    "IHC1": {
      "de": "IHC +",
      "en": "IHC +"
    },
    "IHC0-1": {
      "de": "IHC 0+",
      "en": "IHC 0+"
    },
    "IHC0": {
      "de": "IHC 0",
      "en": "IHC 0"
    }
  },
  "pd_l1_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "NB": {
      "de": "Nicht beurteilbar",
      "en": "Not assessable"
    },
    "NU": {
      "de": "Nicht untersucht",
      "en": "Not investigated"
    }
  },
  "brca1_somatisch_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "NB": {
      "de": "Nicht beurteilbar",
      "en": "Not assessable"
    },
    "NU": {
      "de": "Nicht untersucht",
      "en": "Not investigated"
    }
  },
  "brca2_somatisch_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "NB": {
      "de": "Nicht beurteilbar",
      "en": "Not assessable"
    },
    "NU": {
      "de": "Nicht untersucht",
      "en": "Not investigated"
    }
  },
  "palb2_somatisch_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "NB": {
      "de": "Nicht beurteilbar",
      "en": "Not assessable"
    },
    "NU": {
      "de": "Nicht untersucht",
      "en": "Not investigated"
    }
  },
  "op_intention_einzeltyp": {
    "K": {
      "de": "Kurativ",
      "en": "Curative"
    },
    "P": {
      "de": "Palliativ",
      "en": "Palliative"
    },
    "D": {
      "de": "Diagnostisch",
      "en": "Diagnostic"
    },
    "R": {
      "de": "Revision/Komplikation",
      "en": "Revision/Complication"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    },
    "X": {
      "de": "Fehlende Angabe",
      "en": "Missing information"
    }
  },
  "praeopmarkierung_einzeltyp": {
    "M": {
      "de": "Mammografie",
      "en": "Mammography"
    },
    "S": {
      "de": "Sonografie",
      "en": "Ultrasound"
    },
    "T": {
      "de": "MRT",
      "en": "MRI"
    },
    "N": {
      "de": "Keine Markierung durch Bildgebung",
      "en": "No imaging marker"
    }
  },
  "intraoppraeparatkontrolle_einzeltyp": {
    "M": {
      "de": "Mammografie",
      "en": "Mammography"
    },
    "S": {
      "de": "Sonografie",
      "en": "Ultrasound"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "op_komplikationen_zeitpunkt_einzeltyp": {
    "N": {
      "de": "Keine Komplikationen",
      "en": "No complications"
    },
    "I": {
      "de": "Intraoperative Komplikationen",
      "en": "Intraoperative complications"
    },
    "P": {
      "de": "Postoperative Komplikationen",
      "en": "Postoperative complications"
    },
    "B": {
      "de": "Intra- und postoperative Komplikationen",
      "en": "Intra- and postoperative complications"
    }
  },
  "radiochemotherapie_einzeltyp": {
    "N": {
      "de": "Keine Radiochemotherapie",
      "en": "No radiochemotherapy"
    },
    "S": {
      "de": "Simultan",
      "en": "Simultaneous"
    },
    "SQ": {
      "de": "Sequentiell",
      "en": "Sequential"
    }
  },
  "strahlentherapie_applikationsart_einzeltyp": {
    "P": {
      "de": "Perkutan (Teletherapie)",
      "en": "Percutaneous (teletherapy)"
    },
    "P-ST": {
      "de": "Perkutan stereotaktisch",
      "en": "Percutaneous stereotactic"
    },
    "P-4D": {
      "de": "Perkutan, atemgetriggert",
      "en": "Percutaneous, breath-triggered"
    },
    "P-ST4D": {
      "de": "Perkutan, stereotaktisch, atemgetriggert",
      "en": "Percutaneous, stereotactic, breath-triggered"
    },
    "PRCN-ST": {
      "de": "Perkutan, stereotaktisch ohne Chemotherapie/Sensitizer",
      "en": "Percutaneous, stereotactic without chemotherapy/sensitizer"
    },
    "PRCN-4D": {
      "de": "Perkutan, atemgetriggert, ohne Chemotherapie/Sensitizer",
      "en": "Percutaneous, breath-triggered, without chemotherapy/sensitizer"
    },
    "PRCN-ST4D": {
      "de": "Perkutan, stereotaktisch, atemgetriggert, ohne Chemotherapie/Sensitizer",
      "en": "Percutaneous, stereotactic, breath triggered, without chemotherapy/sensitizer"
    },
    "PRCJ": {
      "de": "Perkutan mit Chemotherapie/Sensitizer",
      "en": "Percutaneous with chemotherapy/sensitizer"
    },
    "PRCJ-4D": {
      "de": "Perkutan, atemgetriggert, mit Chemotherapie/Sensitizer",
      "en": "Percutaneous, breath-triggered, with chemotherapy/sensitizer"
    },
    "PRCJ-ST": {
      "de": "Perkutan, stereotaktisch, mit Chemotherapie/Sensitizer",
      "en": "Percutaneous stereotactic, with chemotherapy/sensitizer"
    },
    "PRCJ-ST4D": {
      "de": "Perkutan, stereotaktisch, atemgetriggert, mit Chemotherapie/Sensitizer",
      "en": "Percutaneous stereotactic, breath-triggered, with chemotherapy/sensitizer"
    },
    "K": {
      "de": "Endokavitäre Kontakttherapie",
      "en": "Endocavitary contact therapy"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    },
    "KHDR": {
      "de": "endokavitäre Kontakttherapie, high dose rate therapy",
      "en": "Endocavitary contact therapy, high dose rate therapy"
    },
    "IHDR": {
      "de": "intersitielle Kontakttherapie, high dose rate therapy",
      "en": "Interstitial contact therapy, high dose rate therapy"
    }
  },
  "strahlentherapie_seite_zielgebiet_einzeltyp": {
    "L": {
      "de": "Links",
      "en": "Left"
    },
    "R": {
      "de": "Rechts",
      "en": "Right"
    },
    "B": {
      "de": "Beidseits",
      "en": "Both sides"
    },
    "M": {
      "de": "Mittig",
      "en": "Center"
    },
    "T": {
      "de": "Trifft nicht zu",
      "en": "Does not apply"
    }
  },
  "strahlentherapie_intention_einzeltyp": {
    "K": {
      "de": "Kurativ",
      "en": "Curative"
    },
    "P": {
      "de": "Palliativ",
      "en": "Palliative"
    },
    "O": {
      "de": "Lokal kurativ bei Oligometastasierung",
      "en": "Locally curative in case of oligometastasis"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    },
    "X": {
      "de": "Keine Angabe",
      "en": "Not specified"
    }
  },
  "strahlentherapie_stellung_op_einzeltyp": {
    "O": {
      "de": "Ohne Bezug zu einer operativen Therapie",
      "en": "Without reference to surgical therapy"
    },
    "A": {
      "de": "Adjuvant",
      "en": "Adjuvant"
    },
    "N": {
      "de": "Neoadjuvant",
      "en": "Neoadjuvant"
    },
    "I": {
      "de": "Intraoperativ",
      "en": "Intraoperative"
    },
    "Z": {
      "de": "Additiv",
      "en": "Additive"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    }
  },
  "strahlentherapie_boost_einzeltyp": {
    "J": {
      "de": "Ja, mit Boost o. n. A.",
      "en": "Yes, with boost"
    },
    "SIB": {
      "de": "Simultan integrierter Boost",
      "en": "Simultaneous Integrated Boost"
    },
    "SEQ": {
      "de": "Sequentieller Boost",
      "en": "Sequential Boost"
    },
    "KON": {
      "de": "Konkomitanter Boost",
      "en": "Concomitant Boost"
    },
    "N": {
      "de": "Nein, ohne Boost",
      "en": "No, without boost"
    }
  },
  "systemtherapie_therapieart_einzeltyp": {
    "CH": {
      "de": "Chemotherapie",
      "en": "Chemotherapy"
    },
    "HO": {
      "de": "Hormontherapie",
      "en": "Hormone therapy"
    },
    "IM": {
      "de": "Immun-/Antikörpertherapie",
      "en": "Immune/antibody therapy"
    },
    "ZS": {
      "de": "Zielgerichtete Substanzen",
      "en": "Targeted substances"
    },
    "CI": {
      "de": "Chemo- + Immun-/Antikörpertherapie",
      "en": "Chemotherapy + immune/antibody therapy"
    },
    "CZ": {
      "de": "Chemotherapie + zielgerichtete Substanzen",
      "en": "Chemotherapy + targeted substances"
    },
    "CIZ": {
      "de": "Chemo- + Immun-/Antikörpertherapie + zielgerichtete Substanzen",
      "en": "Chemo- + immune/antibody therapy + targeted substances"
    },
    "IZ": {
      "de": "Immun-/Antikörpertherapie + zielgerichtete Substanzen",
      "en": "Immune/antibody therapy + targeted substances"
    },
    "SZ": {
      "de": "Stammzelltransplantation (inklusive Knochenmarktransplantation)",
      "en": "Stem cell transplantation (including bone marrow transplantation)"
    },
    "AS": {
      "de": "Active Surveillance",
      "en": "Active surveillance"
    },
    "WS": {
      "de": "Wait and see",
      "en": "Wait and see"
    },
    "WW": {
      "de": "Watchful Waiting",
      "en": "Watchful Waiting"
    },
    "WA": {
      "de": "Watch and Wait",
      "en": "Watch and Wait"
    },
    "BSC": {
      "de": "Best Supportive Care",
      "en": "Best Supportive Care"
    },
    "SO": {
      "de": "Sonstiges",
      "en": "Other"
    }
  },
  "therapielinie_einzeltyp": {
    "1": {
      "de": "1",
      "en": "1"
    },
    "2": {
      "de": "2",
      "en": "2"
    },
    "3": {
      "de": "3",
      "en": "3"
    },
    "4": {
      "de": "4",
      "en": "4"
    },
    "5": {
      "de": "5",
      "en": "5"
    },
    "6": {
      "de": "6",
      "en": "6"
    },
    "7": {
      "de": "7",
      "en": "7"
    },
    "8": {
      "de": "8",
      "en": "8"
    },
    "9": {
      "de": "9",
      "en": "9"
    },
    "10": {
      "de": "10",
      "en": "10"
    },
    "11": {
      "de": "11",
      "en": "11"
    },
    "12": {
      "de": "12",
      "en": "12"
    },
    "13": {
      "de": "13",
      "en": "13"
    },
    "14": {
      "de": "14",
      "en": "14"
    },
    "15": {
      "de": "15",
      "en": "15"
    }
  },
  "systemtherapie_intention_einzeltyp": {
    "K": {
      "de": "Kurativ",
      "en": "Curative"
    },
    "P": {
      "de": "Palliativ",
      "en": "Palliative"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    },
    "X": {
      "de": "Keine Angabe",
      "en": "Not specified"
    }
  },
  "systemtherapie_stellung_op_einzeltyp": {
    "O": {
      "de": "Ohne Bezug zu einer operativen Therapie",
      "en": "Without reference to surgical therapy"
    },
    "A": {
      "de": "Adjuvant",
      "en": "Adjuvant"
    },
    "N": {
      "de": "Neoadjuvant",
      "en": "Neoadjuvant"
    },
    "I": {
      "de": "Intraoperativ",
      "en": "Intraoperative"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    }
  },
  "nebenwirkung_typ_einzeltyp": {
    "1": {
      "de": "Mild",
      "en": "Mild"
    },
    "2": {
      "de": "Moderat",
      "en": "Moderate"
    },
    "3": {
      "de": "Schwerwiegend",
      "en": "Severe"
    },
    "4": {
      "de": "Lebensbedrohlich",
      "en": "Life-threatening"
    },
    "5": {
      "de": "Tödlich",
      "en": "Fatal"
    },
    "K": {
      "de": "Keine",
      "en": "None"
    }
  },
  "fernmetastase_lokalisation_einzeltyp": {
    "PUL": {
      "de": "Lunge",
      "en": "Lung"
    },
    "OSS": {
      "de": "Knochen",
      "en": "Bone"
    },
    "HEP": {
      "de": "Leber",
      "en": "Liver"
    },
    "BRA": {
      "de": "Hirn",
      "en": "Brain"
    },
    "LYM": {
      "de": "Lymphknoten",
      "en": "Lymph nodes"
    },
    "MAR": {
      "de": "Knochenmark",
      "en": "Bone marrow"
    },
    "PLE": {
      "de": "Pleura",
      "en": "Pleura"
    },
    "PER": {
      "de": "Peritoneum",
      "en": "Peritoneum"
    },
    "ADR": {
      "de": "Nebennieren",
      "en": "Adrenal glands"
    },
    "SKI": {
      "de": "Haut",
      "en": "Skin"
    },
    "OTH": {
      "de": "Andere Organe",
      "en": "Other organs"
    },
    "GEN": {
      "de": "Generalisierte Metastasierung",
      "en": "Generalised metastasis"
    }
  },
  "fernmetastase_lokaler_residualstatus_einzeltyp": {
    "R0": {
      "de": "Kein Residualtumor",
      "en": "No residual tumour"
    },
    "R1": {
      "de": "Mikroskopischer Residualtumor",
      "en": "Microscopic residual tumour"
    },
    "R2": {
      "de": "Makroskopischer Residualtumor",
      "en": "Macroscopic residual tumour"
    },
    "RX": {
      "de": "Vorhandensein von Residualtumor kann nicht beurteilt werden",
      "en": "Presence of residual tumour cannot be assessed"
    }
  },
  "studienname_selektiv_einzeltyp": {
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    },
    "EDI": {
      "de": "EDIUM",
      "en": "EDIUM"
    },
    "EDI-R": {
      "de": "EDIUM-Rektum",
      "en": "EDIUM-Rektum"
    },
    "DN": {
      "de": "DigiNet",
      "en": "DigiNet"
    },
    "nNGM": {
      "de": "nNGM",
      "en": "nNGM"
    }
  },
  "screeningstudienteilnahme_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "distressscreening_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "sozialdienstkontakt_einzeltyp": {
    "N": {
      "de": "Nein - kein Kontakt",
      "en": "No - no contact"
    }
  },
  "follow_up_melder_einzeltyp": {
    "KKR": {
      "de": "Klinisches Krebsregister",
      "en": "Clinical Cancer Registry"
    },
    "ZL": {
      "de": "Zentrumsleitung",
      "en": "Centre Management"
    },
    "KNW": {
      "de": "Kooperationsnetzwerk",
      "en": "Cooperation Network"
    },
    "PB": {
      "de": "Patientenbefragung",
      "en": "Patient survey"
    },
    "S": {
      "de": "Sonstiges",
      "en": "Other"
    }
  },
  "follow_up_aktiv_passiv_einzeltyp": {
    "A": {
      "de": "Aktiv",
      "en": "Active"
    },
    "P": {
      "de": "Passiv",
      "en": "Passive"
    }
  },
  "vitalstatus_einzeltyp": {
    "T": {
      "de": "Verstorben",
      "en": "Deceased"
    },
    "L": {
      "de": "Lebend",
      "en": "Alive"
    }
  },
  "gesamtbeurteilung_tumorstatus_einzeltyp1": {
    "V": {
      "de": "Vollremission (complete remission, CR)",
      "en": "Complete remission (CR)"
    },
    "T": {
      "de": "Teilremission (partial remission, PR)",
      "en": "Partial remission (PR)"
    },
    "K": {
      "de": "Keine Änderung (no change, NC) = stable disease",
      "en": "No change (NC) = stable disease"
    },
    "P": {
      "de": "Progression",
      "en": "Progression"
    },
    "D": {
      "de": "Divergentes Geschehen",
      "en": "Divergent disease"
    },
    "B": {
      "de": "Klinische Besserung des Zustandes, Teilremissionkriterien jedoch nicht erfüllt (minimal response, MR)",
      "en": "Clinical improvement of the condition, but partial remission criteria not met (minimal response, MR)"
    },
    "R": {
      "de": "Vollremission mit residualen Auffälligkeiten (CRr)",
      "en": "Full remission with residual abnormalities (CRr)"
    },
    "Y": {
      "de": "Rezidiv",
      "en": "Recurrence"
    },
    "X": {
      "de": "Fehlende Angabe",
      "en": "Missing indication"
    }
  },
  "verlauf_lokaler_tumorstatus_einzeltyp": {
    "K": {
      "de": "Kein Tumor nachweisbar",
      "en": "No tumour detectable"
    },
    "T": {
      "de": "Tumorreste (Residualtumor)",
      "en": "Tumour residues (residual tumour)"
    },
    "P": {
      "de": "Tumorreste (Residualtumor) Progress",
      "en": "Tumour residues (residual tumour) Progress"
    },
    "N": {
      "de": "Tumorreste (Residualtumor) No Change",
      "en": "Tumour residues (residual tumour) No change"
    },
    "R": {
      "de": "Lokalrezidiv",
      "en": "Local recurrence"
    },
    "F": {
      "de": "Fraglicher Befund",
      "en": "Questionable findings"
    },
    "X": {
      "de": "Fehlende Angabe",
      "en": "Missing information"
    }
  },
  "verlauf_tumorstatus_lymphknoten_einzeltyp": {
    "K": {
      "de": "Kein Lymphknotenbefall nachweisbar",
      "en": "No lymph node infestation detectable"
    },
    "R": {
      "de": "Neu aufgetretenes Lymphknotenrezidiv",
      "en": "New lymph node recurrence"
    },
    "T": {
      "de": "Bekannter Lymphknotenbefall Residuen",
      "en": "Known lymph node infestation - Residual"
    },
    "P": {
      "de": "Bekannter Lymphknotenbefall Progress",
      "en": "Known lymph node infestation - Progress"
    },
    "N": {
      "de": "Bekannter Lymphknotenbefall No Change",
      "en": "Known lymph node infestation - No Change"
    },
    "F": {
      "de": "Fraglicher Befund",
      "en": "Questionable findings"
    },
    "X": {
      "de": "Fehlende Angabe",
      "en": "Missing information"
    }
  },
  "verlauf_tumorstatus_fernmetastasen_einzeltyp": {
    "K": {
      "de": "Keine Fernmetastasen nachweisbar",
      "en": "No distant metastases detectable"
    },
    "R": {
      "de": "Neu aufgetretene Fernmetastase(n) bzw. Metastasenrezidiv",
      "en": "New distant metastasis(s) or metastasis recurrence"
    },
    "T": {
      "de": "Fernmetastasen Residuen",
      "en": "Residual distant metastases"
    },
    "P": {
      "de": "Fernmetastasen Progress",
      "en": "Distant metastases Progress"
    },
    "N": {
      "de": "Fernmetastasen No Change",
      "en": "Distant metastases No change"
    },
    "F": {
      "de": "Fraglicher Befund",
      "en": "Questionable findings"
    },
    "X": {
      "de": "Fehlende Angabe",
      "en": "Missing information"
    }
  },
  "zweittumor_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "unbekannt_typ": {
    "U": {
      "de": "Unbekannt",
      "en": "Unknown"
    }
  },
  "familienanamnese_ausgefüllt_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "familienanamnese_ergebnis_einzeltyp": {
    "P": {
      "de": "Positive Familienanamnese",
      "en": "Positive family history"
    },
    "N": {
      "de": "Keine positive Familienanamnese",
      "en": "No positive family history"
    }
  },
  "empfehlung_genetische_beratung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "keimbahndiagnostik_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "nrs_einzeltyp": {
    "0": {
      "de": "0 Punkte",
      "en": "0 points"
    },
    "1": {
      "de": "1 Punkt",
      "en": "1 point"
    },
    "2": {
      "de": "2 Punkte",
      "en": "2 points"
    },
    "3": {
      "de": "3 Punkte",
      "en": "3 points"
    },
    "4": {
      "de": "4 Punkte",
      "en": "4 points"
    },
    "5": {
      "de": "5 Punkte",
      "en": "5 points"
    },
    "6": {
      "de": "6 Punkte",
      "en": "6 points"
    },
    "7": {
      "de": "7 Punkte",
      "en": "7 points"
    }
  },
  "historie_ww_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "rektum_lokalisation_einzeltyp": {
    "1": {
      "de": "Oberes Drittel",
      "en": "Upper third"
    },
    "2": {
      "de": "Mittleres Drittel",
      "en": "Middle third"
    },
    "3": {
      "de": "Unteres Drittel",
      "en": "Lower third"
    }
  },
  "mehrfachdiagnose_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "praeth_bildgebung_einzeltyp": {
    "MRT": {
      "de": "MRT",
      "en": "MRI"
    },
    "CT": {
      "de": "Dünnschicht-CT",
      "en": "Thin-layer-CT"
    },
    "K": {
      "de": "Keine Bildgebung durch MRT oder Dünnschicht-CT",
      "en": "No MRT or thin-layer-CT imaging"
    }
  },
  "mrt_c_t_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "mrt_c_n_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "mrt_mesorektale_faszie_einzeltyp": {
    "MRT": {
      "de": "Ja, im MRT-Befund",
      "en": "Yes, in the MRI-report"
    },
    "CT": {
      "de": "Ja, im Dünnschicht-CT-Befund",
      "en": "Yes, in the in thin-layer-CT report"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "mrt_lat_lk_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "auffaelligkeit_lat_lk_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "emvi_mrt_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "emvi_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    }
  },
  "l_status_einzeltyp": {
    "LX": {
      "de": "LX",
      "en": "LX"
    },
    "L0": {
      "de": "L0",
      "en": "L0"
    },
    "L1": {
      "de": "L1",
      "en": "L1"
    }
  },
  "v_status_einzeltyp": {
    "VX": {
      "de": "VX",
      "en": "VX"
    },
    "V0": {
      "de": "V0",
      "en": "V0"
    },
    "V1": {
      "de": "V1",
      "en": "V1"
    },
    "V2": {
      "de": "V2",
      "en": "V2"
    }
  },
  "pn_status_einzeltyp": {
    "PnX": {
      "de": "PnX",
      "en": "PnX"
    },
    "Pn0": {
      "de": "Pn0",
      "en": "Pn0"
    },
    "Pn1": {
      "de": "Pn1",
      "en": "Pn1"
    }
  },
  "verlegung_akutkrankenhaus_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "abweichung_patientenwunsch_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "rektum_qualitaet_tme_einzeltyp": {
    "1": {
      "de": "Grad 1 (gut)",
      "en": "Grad 1 (good)"
    },
    "2": {
      "de": "Grad 2 (moderat)",
      "en": "Grad 2 (moderate)"
    },
    "3": {
      "de": "Grad 3 (schlecht)",
      "en": "Grad 3 (poor)"
    },
    "P": {
      "de": "PME durchgeführt",
      "en": "PME performed"
    },
    "L": {
      "de": "Lokale Exzision durchgeführt",
      "en": "Local excision performed"
    },
    "A": {
      "de": "Andere Operation durchgeführt",
      "en": "Other surgery performed"
    }
  },
  "regressionsgrad_einzeltyp": {
    "0": {
      "de": "TRG 0",
      "en": "TRG 0"
    },
    "1": {
      "de": "TRG 1",
      "en": "TRG 1"
    },
    "2": {
      "de": "TRG 2",
      "en": "TRG 2"
    },
    "3": {
      "de": "TRG 3",
      "en": "TRG 3"
    },
    "4": {
      "de": "TRG 4",
      "en": "TRG 4"
    }
  },
  "bestimmung_mmr_proteine_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "ergebnis_mmr_proteine_einzeltyp": {
    "UB": {
      "de": "Unauffälliger Befund",
      "en": "Inconspicuous finding"
    },
    "NE": {
      "de": "Nicht eindeutiges Ergebnis",
      "en": "Inconclusive results"
    },
    "AA": {
      "de": "Anderes Ausfallmuster",
      "en": "Other failure pattern"
    },
    "AU": {
      "de": "Ausfall MLH1/PMS2",
      "en": "MLH1/PMS2 failure"
    }
  },
  "msi_analyse_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "ergebnis_msi_analyse_einzeltyp": {
    "MSI-H": {
      "de": "MSI-High",
      "en": "MSI High"
    },
    "MSI-L": {
      "de": "MSI-Low/MSS",
      "en": "MSI Low/MSS"
    }
  },
  "mlh1_promotormethylierung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "braf_einzeltyp": {
    "W": {
      "de": "Wildtyp",
      "en": "Wild type"
    },
    "M": {
      "de": "Mutation",
      "en": "Mutation"
    },
    "N": {
      "de": "Nicht untersucht",
      "en": "Not examined"
    }
  },
  "kras_einzeltyp": {
    "W": {
      "de": "Wildtyp",
      "en": "Wild type"
    },
    "M": {
      "de": "Mutation",
      "en": "Mutation"
    },
    "N": {
      "de": "Nicht untersucht",
      "en": "Not examined"
    }
  },
  "nras_einzeltyp": {
    "W": {
      "de": "Wildtyp",
      "en": "Wild type"
    },
    "M": {
      "de": "Mutation",
      "en": "Mutation"
    },
    "N": {
      "de": "Nicht untersucht",
      "en": "Not examined"
    }
  },
  "asa_einzeltyp": {
    "1": {
      "de": "Normaler, ansonsten gesunder Patient",
      "en": "Normal, otherwise healthy patient"
    },
    "2": {
      "de": "Patient mit leichter Allgemeinerkrankung",
      "en": "Patient with mild general illness"
    },
    "3": {
      "de": "Patient mit schwerer Allgemeinerkrankung und Leistungseinschränkung",
      "en": "Patient with severe general illness and reduced performance"
    },
    "4": {
      "de": "Patient mit inaktivierender Allgemeinerkrankung, ständige Lebensbedrohung",
      "en": "Patient with incapacitating general illness, constant threat to life"
    },
    "5": {
      "de": "Moribunder Patient",
      "en": "Moribund patient"
    }
  },
  "notfall_elektiv_einzeltyp": {
    "E": {
      "de": "Elektiveingriff",
      "en": "Elective procedure"
    },
    "N": {
      "de": "Notfalleingriff",
      "en": "Emergency intervention"
    }
  },
  "claviendindo_einzeltyp": {
    "0": {
      "de": "0 (keine Komplikation, Standardwert)",
      "en": "0 (no complication, default value)"
    },
    "I": {
      "de": "I",
      "en": "I"
    },
    "II": {
      "de": "II",
      "en": "II"
    },
    "III": {
      "de": "III",
      "en": "III"
    },
    "IIIa": {
      "de": "IIIa",
      "en": "IIIa"
    },
    "IIIb": {
      "de": "IIIb",
      "en": "IIIb"
    },
    "IV": {
      "de": "IV",
      "en": "IV"
    },
    "IVa": {
      "de": "IVa",
      "en": "IVa"
    },
    "IVb": {
      "de": "Ivb",
      "en": "Ivb"
    },
    "V": {
      "de": "V",
      "en": "V"
    }
  },
  "anastomose_angelegt_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "kolon_anastomoseninsuffizienz_einzeltyp": {
    "D": {
      "de": "Intervention notwendig (nicht näher spezifiziert)",
      "en": "Intervention necessary (not further specified)"
    },
    "K": {
      "de": "Keine Insuffizienz oder höchstens Grad A",
      "en": "No insufficiency or at most grade A"
    }
  },
  "rektum_anastomoseninsuffizienz_einzeltyp": {
    "B": {
      "de": "Anastomoseninsuffizienz Grad B",
      "en": "Anastomotic insufficiency grade B"
    },
    "C": {
      "de": "Anastomoseninsuffizienz Grad C",
      "en": "Anastomotic insufficiency grade C"
    },
    "K": {
      "de": "Keine Insuffizienz oder höchstens Grad A",
      "en": "No insufficiency or at most grade A"
    }
  },
  "op_mit_stoma_einzeltyp": {
    "P": {
      "de": "Ja, protektive Stomaanlage",
      "en": "Yes, temporary stoma"
    },
    "D": {
      "de": "Ja, definitive Stomaanlage",
      "en": "Yes, permanent stoma"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "art_stoma_einzeltyp": {
    "E": {
      "de": "Endständig",
      "en": "Terminal"
    },
    "D": {
      "de": "Doppelläufig",
      "en": "Double-barreled"
    }
  },
  "anzeichnung_stomaposition_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "reservoirbildung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "art_reservoirbildung_einzeltyp": {
    "CJ": {
      "de": "Colon-J-Pouch",
      "en": "Colon-J-pouch"
    },
    "SE": {
      "de": "Seit-zu-End-Anastomose",
      "en": "Side-to-end anastomosis"
    }
  },
  "kombinationschemo_einzelsubstanz_einzeltyp": {
    "K": {
      "de": "Kombinationschemo",
      "en": "Combination chemo"
    },
    "E": {
      "de": "Einzelsubstanz",
      "en": "Single substance"
    }
  },
  "fernmetastase_lokalisation_primaertumor_einzeltyp": {
    "K": {
      "de": "Kolon",
      "en": "Colon"
    },
    "R": {
      "de": "Rektum",
      "en": "Rectum"
    }
  },
  "fernmetastase_op_einrichtung_einzeltyp": {
    "IK": {
      "de": "am operativen Standort des Darmkrebszentrums",
      "en": "at the surgical site of the colorectal cancer center"
    },
    "EK": {
      "de": "außerhalb des operativen Standortes des Darmkrebszentrums",
      "en": "outside the surgical site of the colorectal cancer center"
    }
  },
  "r0resektion_nach_kurativer_behandlung_einzeltyp": {
    "J": {
      "de": "Ja, vorausgegangene kurative/anatom. R0-Resektion o. ablative stereotakt. Bestrahlung",
      "en": "Yes, previous curative treatment (anatom. R0 resection) or ablative stereotact. radiotherapy"
    },
    "N": {
      "de": "Nein, keine  vorausgegangene kurative/anatom. R0-Resektion  u. keine vorausgegangene ablative stereotakt. Bestrahlung",
      "en": "No, no previous curative treatment (anatom. R0 resection) and no previous ablative stereotact. radiotherapy"
    }
  },
  "pf_ohne_pathologische_diagnosesicherung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "praeth_fdg_pet_ct_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "praeth_stadium_einzeltyp": {
    "0": {
      "de": "0",
      "en": "0"
    },
    "Okk": {
      "de": "Okkult",
      "en": "Occult"
    },
    "IA": {
      "de": "IA",
      "en": "IA"
    },
    "IA1": {
      "de": "IA1",
      "en": "IA1"
    },
    "IA2": {
      "de": "IA2",
      "en": "IA2"
    },
    "IA3": {
      "de": "IA3",
      "en": "IA3"
    },
    "IB": {
      "de": "IB",
      "en": "IB"
    },
    "IIA": {
      "de": "IIA",
      "en": "IIA"
    },
    "IIB": {
      "de": "IIB",
      "en": "IIB"
    },
    "IIIA": {
      "de": "IIIA",
      "en": "IIIA"
    },
    "IIIA3": {
      "de": "IIIA3",
      "en": "IIIA3"
    },
    "IIIA4": {
      "de": "IIIA4",
      "en": "IIIA4"
    },
    "IIIB": {
      "de": "IIIB",
      "en": "IIIB"
    },
    "IIIC": {
      "de": "IIIC",
      "en": "IIIC"
    },
    "IV": {
      "de": "IV",
      "en": "IV"
    },
    "IVA": {
      "de": "IVA",
      "en": "IVA"
    },
    "IVB": {
      "de": "IVB",
      "en": "IVB"
    }
  },
  "postop_stadium_einzeltyp": {
    "0": {
      "de": "0",
      "en": "0"
    },
    "Okk": {
      "de": "Okkult",
      "en": "Occult"
    },
    "IA": {
      "de": "IA",
      "en": "IA"
    },
    "IA1": {
      "de": "IA1",
      "en": "IA1"
    },
    "IA2": {
      "de": "IA2",
      "en": "IA2"
    },
    "IA3": {
      "de": "IA3",
      "en": "IA3"
    },
    "IB": {
      "de": "IB",
      "en": "IB"
    },
    "IIA": {
      "de": "IIA",
      "en": "IIA"
    },
    "IIB": {
      "de": "IIB",
      "en": "IIB"
    },
    "IIIA": {
      "de": "IIIA",
      "en": "IIIA"
    },
    "IIIA1": {
      "de": "IIIA1",
      "en": "IIIA1"
    },
    "IIIA2": {
      "de": "IIIA2",
      "en": "IIIA2"
    },
    "IIIA3": {
      "de": "IIIA3",
      "en": "IIIA3"
    },
    "IIIA4": {
      "de": "IIIA4",
      "en": "IIIA4"
    },
    "IIIB": {
      "de": "IIIB",
      "en": "IIIB"
    },
    "IIIC": {
      "de": "IIIC",
      "en": "IIIC"
    },
    "IV": {
      "de": "IV",
      "en": "IV"
    },
    "IVA": {
      "de": "IVA",
      "en": "IVA"
    },
    "IVB": {
      "de": "IVB",
      "en": "IVB"
    }
  },
  "symptomerfassung_midos_ipos_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "behandlungseinheit_pneumologie_einzeltyp": {
    "1": {
      "de": "Pneumologie 1",
      "en": "Pneumology 1"
    },
    "2": {
      "de": "Pneumologie 2",
      "en": "Pneumology 2"
    },
    "3": {
      "de": "Pneumologie 3",
      "en": "Pneumology 3"
    },
    "4": {
      "de": "Pneumologie 4",
      "en": "Pneumology 4"
    },
    "5": {
      "de": "Pneumologie 5",
      "en": "Pneumology 5"
    },
    "6": {
      "de": "Pneumologie 6",
      "en": "Pneumology 6"
    },
    "A": {
      "de": "Pneumologie außerhalb Zentrum",
      "en": "Pneumology outside centre"
    },
    "K": {
      "de": "Keine Pneumologie",
      "en": "No pneumology"
    }
  },
  "empfehlung_gegen_resektion_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "empfehlung_zur_therapie_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "pd_l1_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "egfr_exon18_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "egfr_exon18_ergebnis_einzeltyp": {
    "A": {
      "de": "Aktivierend",
      "en": "Activating"
    },
    "N": {
      "de": "Nicht aktivierend",
      "en": "Non-activating"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "egfr_exon19_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "egfr_exon19_ergebnis_einzeltyp": {
    "A": {
      "de": "Aktivierend",
      "en": "Activating"
    },
    "N": {
      "de": "Nicht aktivierend",
      "en": "Non-activating"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "egfr_exon19_del19_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "egfr_exon20_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "egfr_exon20_ergebnis_einzeltyp": {
    "A": {
      "de": "Aktivierend",
      "en": "Activating"
    },
    "N": {
      "de": "Nicht aktivierend",
      "en": "Non-activating"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "egfr_exon21_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "egfr_exon21_ergebnis_einzeltyp": {
    "A": {
      "de": "Aktivierend",
      "en": "Activating"
    },
    "N": {
      "de": "Nicht aktivierend",
      "en": "Non-activating"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "egfr_exon21_l858r_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "alk_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "alk_ihc_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "alk_ish_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "alk_fish_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "alk_ngs_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ros1_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "ros1_ihc_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ros1_ish_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positiv"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ros1_fish_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ros1_ngs_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "braf_v600_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "braf_v600_ergebnis_einzeltyp": {
    "W": {
      "de": "Wildtyp",
      "en": "Wild-type"
    },
    "M": {
      "de": "Mutation",
      "en": "Mutation"
    }
  },
  "ntrk1_3_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "ntrk1_3_ngs_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ntrk1_3_ihc_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ntrk1_3_fish_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ntrk1_3_rt_pcr_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ret_untersuchung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "ret_ngs_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ret_fish_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "ret_rt_pcr_ergebnis_einzeltyp": {
    "P": {
      "de": "Positiv",
      "en": "Positive"
    },
    "N": {
      "de": "Negativ",
      "en": "Negative"
    },
    "F": {
      "de": "Fraglich",
      "en": "Questionable"
    },
    "NA": {
      "de": "Nicht auswertbar",
      "en": "Not analysable"
    }
  },
  "behandlungseinheit_pathologie_einzeltyp": {
    "1": {
      "de": "Pathologie 1",
      "en": "Pathology 1"
    },
    "2": {
      "de": "Pathologie 2",
      "en": "Pathology 2"
    },
    "3": {
      "de": "Pathologie 3",
      "en": "Pathology 3"
    },
    "4": {
      "de": "Pathologie 4",
      "en": "Pathology 4"
    },
    "A": {
      "de": "Pathologie außerhalb Zentrum",
      "en": "Pathology outisde of centre"
    }
  },
  "vats_rats_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "behandlungseinheit_thoraxchirurgie_einzeltyp": {
    "1": {
      "de": "Thoraxchirurgie 1",
      "en": "Thoracic surgery 1"
    },
    "2": {
      "de": "Thoraxchirurgie 2",
      "en": "Thoracic surgery 2"
    },
    "3": {
      "de": "Thoraxchirurgie 3",
      "en": "Thoracic surgery 3"
    },
    "A": {
      "de": "Thoraxchirurgie außerhalb Zentrum",
      "en": "Thoracic surgery outside centre"
    }
  },
  "prophylaktische_schaedelbestrahlung_einzeltyp": {
    "J": {
      "de": "Ja",
      "en": "Yes"
    },
    "N": {
      "de": "Nein",
      "en": "No"
    }
  },
  "behandlungseinheit_strahlentherapie_einzeltyp": {
    "1": {
      "de": "Strahlentherapie 1",
      "en": "Radiotherapy 1"
    },
    "2": {
      "de": "Strahlentherapie 2",
      "en": "Radiotherapy 2"
    },
    "3": {
      "de": "Strahlentherapie 3",
      "en": "Radiotherapy 3"
    },
    "4": {
      "de": "Strahlentherapie 4",
      "en": "Radiotherapy 4"
    },
    "A": {
      "de": "Strahlentherapie außerhalb Zentrum",
      "en": "Radiotherapy outside centre"
    }
  },
  "systemtherapie_behandlungseinheit_einzeltyp": {
    "H1": {
      "de": "Hämatoonkologie 1",
      "en": "Haematooncology 1"
    },
    "H2": {
      "de": "Hämatoonkologie 2",
      "en": "Haematooncology 2"
    },
    "H3": {
      "de": "Hämatoonkologie 3",
      "en": "Haematooncology 3"
    },
    "H4": {
      "de": "Hämatoonkologie 4",
      "en": "Haematooncology 4"
    },
    "H5": {
      "de": "Hämatoonkologie 5",
      "en": "Haematooncology 5"
    },
    "H6": {
      "de": "Hämatoonkologie 6",
      "en": "Haematooncology 6"
    },
    "HA": {
      "de": "Hämatoonkologie außerhalb Zentrum",
      "en": "Haematooncology outside centre"
    },
    "P1": {
      "de": "Pneumologie 1",
      "en": "Pneumology 1"
    },
    "P2": {
      "de": "Pneumologie 2",
      "en": "Pneumology 2"
    },
    "P3": {
      "de": "Pneumologie 3",
      "en": "Pneumology 3"
    },
    "P4": {
      "de": "Pneumologie 4",
      "en": "Pneumology 4"
    },
    "P5": {
      "de": "Pneumologie 5",
      "en": "Pneumology 5"
    },
    "P6": {
      "de": "Pneumologie 6",
      "en": "Pneumology 6"
    },
    "PA": {
      "de": "Pneumologie außerhalb Zentrum",
      "en": "Pneumology outside centre"
    },
    "S1": {
      "de": "Strahlentherapie 1",
      "en": "Radiotherapy 1"
    },
    "S2": {
      "de": "Strahlentherapie 2",
      "en": "Radiotherapy 2"
    },
    "S3": {
      "de": "Strahlentherapie 3",
      "en": "Radiotherapy 3"
    },
    "S4": {
      "de": "Strahlentherapie 4",
      "en": "Radiotherapy 4"
    },
    "SA": {
      "de": "Strahlentherapie außerhalb Zentrum",
      "en": "Radiotherapy outside Centre"
    },
    "K": {
      "de": "Keine Hämatoonkologie/Pneumologie/Strahlentherapie",
      "en": "None Haematooncology/pneumology/radiotherapy"
    }
  },
  "version_einzeltyp1": {
    "10": {
      "de": "ICD-10",
      "en": "ICD-10"
    },
    "11": {
      "de": "ICD-11",
      "en": "ICD-11"
    }
  },
  "icd_10_einzeltyp1": {
    "C34.0": {
      "de": "Hauptbronchus",
      "en": "Main bronchus"
    },
    "C34.1": {
      "de": "Lungenoberlappen",
      "en": "Upper lobe of lung"
    },
    "C34.2": {
      "de": "Lungenmittellappen",
      "en": "Middle lobe of the lung"
    },
    "C34.3": {
      "de": "Lungenunterlappen",
      "en": "Lower lobe of lung"
    },
    "C34.8": {
      "de": "Lunge, mehrere Teilbereiche überlappend",
      "en": "Lung, overlapping several parts"
    },
    "C34.9": {
      "de": "Lunge o.n.A",
      "en": "Lung n.e.c."
    },
    "C78.0": {
      "de": "Sekundäre bösartige Neubildung der Lunge",
      "en": "Secondary malignant neoplasm of lung"
    }
  },
  "icd_11_einzeltyp1": {
    "2C25.0": {
      "de": "Adenokarzinom des Bronchus oder der Lunge",
      "en": "Adenocarcinoma of bronchus or lung"
    },
    "2C25.1": {
      "de": "Kleinzelliges Karzinom des Bronchus oder der Lunge",
      "en": "Small cell carcinoma of bronchus or lung"
    },
    "2C25.2": {
      "de": "Plattenepithelkarzinom des Bronchus oder der Lunge",
      "en": "Squamous cell carcinoma of bronchus or lung"
    },
    "2C25.3": {
      "de": "Großzelliges Karzinom des Bronchus oder der Lunge",
      "en": "Large cell carcinoma of bronchus or lung"
    },
    "2C25.4": {
      "de": "Karzinoid oder sonstige bösartige neuroendokrine Neubildung des Bronchus oder der Lunge",
      "en": "Carcinoid or other malignant neuroendocrine neoplasm of bronchus or lung"
    },
    "2C25.5": {
      "de": "Nicht näher bezeichnete bösartige epitheliale Neubildung des Bronchus oder der Lunge",
      "en": "Unspecified malignant epithelial neoplasm of bronchus or lung"
    },
    "2C25.Y": {
      "de": "Andere spezifizierte bösartige Neubildungen der Bronchien oder der Lunge",
      "en": "Other specified malignant neoplasm of bronchus or lung"
    },
    "2C25.Z": {
      "de": "Bösartige Neubildungen der Bronchien oder der Lunge, nicht spezifiziert",
      "en": "Malignant neoplasm of bronchus or lung, unspecified"
    },
    "2D70": {
      "de": "Bösartige Neubildung mit Metastasen in der Lunge",
      "en": "Malignant neoplasm with metastases in the lung"
    }
  }
};
