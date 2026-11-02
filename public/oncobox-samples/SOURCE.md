# Source of the sample files

Source:   OnkoZert GmbH
Obtained: https://www.xml-oncobox.de/de/Home/FuerHersteller
Content:  published XML sample solutions for software vendors,
          no real patient data

| File | Box | Version |
|---|---|---|
| `brust-1.xml` | OncoBox Brust (breast) 1.0 | 251203 |
| `brust-2.xml` | OncoBox Brust (breast) 2.0 | 260703 |
| `darm-1.xml` | OncoBox Darm (colorectal) 1.0, variant kb | 251203 |
| `darm-1-verlauf.xml` | OncoBox Darm (colorectal) 1.0, variant eq | 251203 |
| `darm-2.xml` | OncoBox Darm (colorectal) 2.0 | 260730 |
| `lunge-2.xml` | OncoBox Lunge (lung) 2.0 DKG-Zert | 250903 |
| `prostata-1.xml` | OncoBox Prostata (prostate) 1.0 | 251203 |

The corresponding validation schemas are in `data/oncobox-schemas/`.

OnkoZert provides several sample files for Darm 1.0. The variant `kb` has
32 cases but not a single follow-up, so the follow-up fields cannot be tested
with it. The variant `eq` has only 11 cases but 27 follow-ups with populated
follow-up fields. Both are included because they cover different aspects.
