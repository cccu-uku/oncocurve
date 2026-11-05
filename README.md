# ONCOcurve

Survival analysis for oncology cohorts, directly in the browser.

ONCOcurve computes Kaplan-Meier curves, log-rank tests and Cox models from cancer registry exports, OncoBox files or simple tables. It is intended for clinical cancer registries, certified cancer centres and tumour documentation teams. It is developed at the Comprehensive Cancer Center Ulm (CCCU) of Universitätsklinikum Ulm as part of the ONCOnnect consortium.

**Processing in the browser:** Import, validation and analysis run in the browser (in web workers). The application does not upload analysis data to the server, stores nothing there and includes no tracking, external fonts or third-party services. Whoever operates a server is responsible for running it securely (see [Liability and operation](#liability-and-operation)).

> ONCOcurve is not a medical device within the meaning of the MDR/IVDR. It is intended for the retrospective, aggregated analysis of cohorts, not for diagnosis or treatment decisions for individual patients.

## Features

**Input formats**

- oBDS XML (German basic oncology data set, registry export)
- OncoBox XML by OnkoZert (breast 1.0/2.0, colorectal 1.0/2.0, lung 2.0, prostate 1.0), validated against the schemas and with box-specific endpoint rules
- CSV, tab-separated text and Excel (`.xlsx`). Columns are recognised by their headers. Every additional column is available as a stratification variable, and numeric columns can be grouped into classes.

**Endpoints**

Overall survival, time to first treatment (TTFT), local recurrence rate, local recurrence-free, metastasis-free, disease-free and progression-free survival, and post-progression survival.

**Statistics**

- Kaplan-Meier estimator with Greenwood variance and log-log confidence intervals, median and landmark survival, patients-at-risk table
- Median follow-up (reverse Kaplan-Meier)
- Log-rank test and weighted variants (Gehan-Breslow, Peto-Peto, Tarone-Ware), pairwise comparisons with Holm correction
- Cox regression (Efron or Breslow) with likelihood ratio, Wald and score tests, Harrell's C and forest plot
- Cumulative incidence with competing risks

**More**

- Filters for sex, age, ICD-10, tumour category, UICC stage, grading, primary case, year of diagnosis and metastasis
- Stage grouping according to TNM, 9th edition
- Plausibility checks on import; outliers and duplicates can be excluded selectively
- Export as PDF report, PNG/SVG graphic, CSV and Excel, optionally anonymised
- User interface in German and English, guided tour and help page with sample files

## Running with Docker

You need a server with Docker and Docker Compose. The source code is not required; a few files are enough. The image is built for x86-64 servers (linux/amd64).

### 1. Get the files

```bash
mkdir oncocurve && cd oncocurve
curl -fsSLO https://raw.githubusercontent.com/cccu-uku/oncocurve/main/docker-compose.yml
curl -fsSLO https://raw.githubusercontent.com/cccu-uku/oncocurve/main/caddy-entrypoint.sh
curl -fsSL -o .env https://raw.githubusercontent.com/cccu-uku/oncocurve/main/.env.example
mkdir config
curl -fsSL -o config/betreiber.json https://raw.githubusercontent.com/cccu-uku/oncocurve/main/config/betreiber.beispiel.json
```

### 2. Set the address in `.env`

ONCOcurve runs behind a [Caddy](https://caddyserver.com) container that provides HTTPS. How it obtains a certificate depends on `SITE_ADDRESS`:

| How the server is reached | Setting in `.env` |
|---|---|
| Via its IP address or in an internal network (default) | `SITE_ADDRESS=:443` – self-signed certificate, the browser shows a warning once |
| Via a hostname that points directly to the server, with ports 80 and 443 reachable from the internet | `SITE_ADDRESS=onco.example.org` – automatic Let's Encrypt certificate |
| With your institution's certificate | `SITE_ADDRESS=onco.intern.example.org`, `TLS_CERT=/certs/onco.crt`, `TLS_KEY=/certs/onco.key`, `CERT_DIR=/path/to/certificates`; also uncomment the `/certs` line under `caddy` in `docker-compose.yml` |

To pin a version, also set for example `ONCOCURVE_IMAGE=ghcr.io/cccu-uku/oncocurve:1.0.0`. The image is available as `ghcr.io/cccu-uku/oncocurve` and `docker.io/cccuuku/oncocurve`; tags: `1.0.0` (fixed), `1.0`, `1` (latest matching version), `latest`.

### 3. Legal notice and logo in `config/`

- Enter the legal notice of your institution in German and English in `config/betreiber.json`.
- For a logo, copy the image file into `config/` (PNG, SVG, JPG or WebP) and enter its file name under `logo` → `datei`, together with the alternative text and the size in pixels. Without a logo, remove the `logo` section.

The field names are German; all fields are described in [docs/OPERATIONS.md](docs/OPERATIONS.md#3-operator-details-legal-notice-and-logo). Changes take effect on the next page load.

### 4. Start and check

```bash
docker compose up -d
docker compose ps                         # "app" shows "healthy" after about 30 seconds
docker compose logs app | grep oncocurve  # "[oncocurve] Betreiberangaben: geladen"
```

ONCOcurve is then reachable at `https://<SITE_ADDRESS>` or `https://<server-ip>`.

### 5. Update

```bash
docker compose pull && docker compose up -d
```

**Building from source:** `docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build`

Embedding via iframe, troubleshooting and further settings are described in [docs/OPERATIONS.md](docs/OPERATIONS.md). Useful commands: `docker compose logs -f` (follow the log), `docker compose down` (stop).

## Development

Requirements: Node.js 26 and Yarn 4 (Node 26 no longer ships [Corepack](https://nodejs.org/api/corepack.html): `npm i -g corepack && corepack enable`).

```bash
yarn install
yarn dev        # development server at http://localhost:3050
yarn test       # tests (Vitest)
yarn lint       # ESLint
yarn build      # production build, then yarn start (port 3000)
```

Stack: Next.js, React, TypeScript, Tailwind CSS, Plotly and Recharts. The UI components in `components/ui` are based on [shadcn/ui](https://ui.shadcn.com).

| Directory | Contents |
|---|---|
| `app/` | Pages (upload, results, help, legal notice, privacy policy) |
| `components/kaplan-meier/` | Import, endpoint logic, statistics workers and charts |
| `components/ui/` | General UI components |
| `utils/` | Statistics: Kaplan-Meier, log-rank, Cox regression, cumulative incidence |
| `locales/` | German and English texts |
| `public/` | Sample files and test data |
| `data/` | ICD-10 lists, tumour categories, OncoBox schemas |

## Running your own instance

The legal notice and logo of your institution are configured at runtime in the `config/` folder; the image does not need to be rebuilt. The privacy policy and the application logos describe the operation at Universitätsklinikum Ulm and can only be changed in your own fork (see the file `COPYRIGHT`). Instructions are in [docs/OPERATIONS.md](docs/OPERATIONS.md).

## Liability and operation

ONCOcurve is provided free of charge and without any warranty (sections 15 and 16 of the [AGPL-3.0](LICENSE)). Universitätsklinikum Ulm (including the CCCU) is not liable for the operation of an instance by third parties. For defects of the software it is liable only for intent and gross negligence, for injury to life, body or health, and under product liability law. The binding wording is in [COPYRIGHT](COPYRIGHT), section "Liability / Haftung".

Anyone who operates ONCOcurve is responsible for it, in particular for

- the server and its security: updates of the operating system, Docker and containers, TLS certificates, access control and firewall,
- installing new ONCOcurve versions and security updates,
- data protection: the controller within the meaning of the GDPR is the operator or the institution using the instance. The CCCU does not process any data on instances run by other operators,
- checking the results professionally.

There is no entitlement to support, bug fixes or security updates. We welcome reports of security vulnerabilities, see [SECURITY.md](SECURITY.md).

## License

Copyright © 2025–2026 Universitätsklinikum Ulm (Comprehensive Cancer Center Ulm, CCCU). Developed by Veronika Stiegler.

ONCOcurve is free software under the [GNU Affero General Public License, version 3](LICENSE). You may use, modify and redistribute it. Anyone who distributes a modified version or offers it as a network service must make the complete source code of that version available under the same license.

The complete source code of every released version, including the Dockerfile and build scripts, is available at <https://github.com/cccu-uku/oncocurve> under the Git tag of the same version (for example `v1.0.0` for the image `cccuuku/oncocurve:1.0.0`).

Logos and trademarks are excluded from the license (see [COPYRIGHT](COPYRIGHT)). Third-party content, including the TNM stage groupings, the OncoBox schemas, the Inter typeface and the METABRIC and TCGA sample data, is listed with its sources and licenses in [NOTICE](NOTICE).

## Contact

Comprehensive Cancer Center Ulm (CCCU), Universitätsklinikum Ulm
service.cccu@uniklinik-ulm.de

## Citation

If you use ONCOcurve or its source code in your work, please cite the accompanying article:

> Stiegler V, Tausch E, Neidhard C, Götz M, Fürstberger A, Nasseh D, Tufman A, Janni W, Stilgenbauer S. ONCOcurve: Development and Validation of a Privacy-Preserving, Browser-Based Platform for Automated Survival Analysis from Oncological Routine Data. Manuscript in preparation; 2026.

To refer to a specific version of the software, you can additionally cite it:

> Stiegler V. ONCOcurve. Version 1.0.0. Universitätsklinikum Ulm, Comprehensive Cancer Center Ulm (CCCU); 2026. https://github.com/cccu-uku/oncocurve

```bibtex
@unpublished{stiegler_oncocurve_2026,
  author = {Stiegler, Veronika and Tausch, Eugen and Neidhard, Christoph and G{\"o}tz, Michael and F{\"u}rstberger, Axel and Nasseh, Daniel and Tufman, Amanda and Janni, Wolfgang and Stilgenbauer, Stephan},
  title  = {{ONCOcurve}: Development and Validation of a Privacy-Preserving, Browser-Based Platform for Automated Survival Analysis from Oncological Routine Data},
  note   = {Manuscript in preparation},
  year   = {2026}
}

@software{stiegler_oncocurve_software_2026,
  author    = {Stiegler, Veronika},
  title     = {{ONCOcurve}},
  version   = {1.0.0},
  year      = {2026},
  publisher = {Universitätsklinikum Ulm, Comprehensive Cancer Center Ulm (CCCU)},
  url       = {https://github.com/cccu-uku/oncocurve},
  license   = {AGPL-3.0-only}
}
```

The citation metadata is also available in [CITATION.cff](CITATION.cff) and via "Cite this repository" on GitHub.
