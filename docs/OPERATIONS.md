# Running your own instance

This guide is for administrators who deploy ONCOcurve at their institution. The operator is responsible for running the instance (see README, section "Liability and operation").

## 1. Requirements and image

You need a server with Docker and Docker Compose and the files `docker-compose.yml`, `caddy-entrypoint.sh` and `.env`. The quick start is in the [README](../README.md#running-with-docker).

The prebuilt image is available in two places:

- `ghcr.io/cccu-uku/oncocurve` (GitHub Container Registry)
- `docker.io/cccuuku/oncocurve` (Docker Hub)

Available tags: `1.0.0` (fixed version), `1.0` and `1` (latest matching version) and `latest`. By default, `docker-compose.yml` pulls `ghcr.io/cccu-uku/oncocurve:1`. A different version or registry is set in `.env`:

```bash
ONCOCURVE_IMAGE=ghcr.io/cccu-uku/oncocurve:1.0.0
```

## 2. HTTPS via Caddy

A Caddy container accepts connections on ports 80 and 443 and forwards them to the application. Its behaviour is controlled by `SITE_ADDRESS` in `.env`. There are three options.

**Self-signed certificate (default).** `SITE_ADDRESS=:443`. This works via the server's IP address and via any name that points to it. The browser shows a warning once. For permanent operation, a hostname (next option) or an institutional certificate is recommended. This mode issues a separate certificate for every requested name and is therefore only intended for internal networks; servers reachable from the internet should use a hostname or an institutional certificate.

**Let's Encrypt.** Set `SITE_ADDRESS` to the hostname, for example `SITE_ADDRESS=onco.uni-xy.de`. The name must point directly to the server via DNS (not via an HTTP redirect), and ports 80 and 443 must be reachable from the internet.

**Institutional certificate.** Place the certificate and key on the server, uncomment the line `- ${CERT_DIR:-./certs}:/certs:ro` for the `caddy` service in `docker-compose.yml` and set in `.env`:

```bash
SITE_ADDRESS=onco.intern.uni-xy.de
TLS_CERT=/certs/onco.crt
TLS_KEY=/certs/onco.key
CERT_DIR=/path/to/certificates
```

If both `TLS_CERT` and `TLS_KEY` are set, this certificate is used. Without `CERT_DIR`, Compose looks in the folder `./certs` next to the Compose file.

## 3. Operator details (legal notice and logo)

The legal notice and logo are configured in `config/betreiber.json`. Create the file from the template `config/betreiber.beispiel.json`; it is mounted into the container via the volume `./config:/app/config:ro`:

```bash
mkdir config
curl -fsSL -o config/betreiber.json https://raw.githubusercontent.com/cccu-uku/oncocurve/main/config/betreiber.beispiel.json
```

Without a custom logo, remove the `logo` section.

File structure (the field names are German):

| Field | Required | Meaning |
|---|---|---|
| `impressum.de` | yes | List of sections for the German interface, at least one entry |
| `impressum.en` | yes | List of sections for the English interface, at least one entry |
| `titel`, `text` per section | yes | Heading and text, both non-empty. Line breaks in the text as `\n`; web and email addresses are shown as links |
| `logo` | no | Logo of the institution; without this field no logo is shown |
| `logo.src` | yes, if `logo` is set | Path of the image file, starting with a single `/` (not `//`). Letters, digits and the characters `_ . / % -` are allowed, no `..` |
| `logo.alt.de`, `logo.alt.en` | yes, if `logo` is set | Alternative text of the logo per language |
| `logo.breite`, `logo.hoehe` | yes, if `logo` is set | Width and height of the logo in pixels, numbers greater than 0 |

Without `config/betreiber.json` the application still starts; the legal notice page then shows "Operator details missing". Changes to the file take effect on the next page load without a restart, because the legal notice and the header read the file on every request.

Optionally, a different file path can be set with the environment variable `ONCOCURVE_BETREIBER`. This path applies inside the container and must be reachable there (an additional volume is needed). If the variable is empty, it is ignored and the default path applies. A path that is set must exist, otherwise the file is treated as invalid (see troubleshooting). The variable is not preset in `docker-compose.yml` and must be added under `environment` for the `app` service.

## 4. Custom logo and local adjustments

The image file is mounted as a single file under `/app/public/`. Add a line under `volumes` for the `app` service in `docker-compose.yml`, for example:

```yaml
- ./logo.png:/app/public/logo.png:ro
```

Then in `config/betreiber.json`:

```json
"logo": {
  "src": "/logo.png",
  "alt": { "de": "Logo der Einrichtung", "en": "Institution logo" },
  "breite": 152,
  "hoehe": 40
}
```

Instance-specific mounts and variables can be placed in a local `docker-compose.override.yml` instead of `docker-compose.yml`; `docker compose` reads it automatically in addition. This keeps the downloaded Compose file unchanged across updates:

```yaml
services:
  app:
    volumes:
      - ./logo.png:/app/public/logo.png:ro
```

The logo appears in the header. The Compose file contains a commented-out example line for this. The path in `src` must match the target of the volume and follow the character rules from section 3. If the file is missing on the host, Docker creates a folder in its place, so put the file in place before starting.

## 5. Embedding via iframe

By default, only ONCOcurve itself may embed its pages. Further sites are allowed in `.env` as space-separated origins:

```bash
FRAME_ANCESTORS=https://portal.example.org https://*.example.org
```

`http://` and `https://` are allowed, optionally with a wildcard for subdomains (`https://*.example.org`) and with a port. Entries in any other form are discarded. The application reads the value at runtime on every request. For the container to receive a new value after changing `.env`, run `docker compose up -d`, which recreates the container.

## 6. Troubleshooting

An invalid `config/betreiber.json` does not break the application. The file is checked once at startup; an error appears in the log with the message `[oncocurve] Betreiberangaben fehlerhaft: ...` ("operator details invalid") and names the affected field. The legal notice page then shows "Operator details invalid" and the header appears without a logo. To read the log:

```bash
docker compose logs app
```

At startup the log shows either `[oncocurve] Betreiberangaben: geladen` (loaded) or `[oncocurve] Betreiberangaben: keine (config/betreiber.json fehlt)` (file missing).

The state of the application can be checked with a health check. The `STATUS` column shows `healthy` as soon as the application responds:

```bash
docker compose ps
```

Caddy only starts once the application is reported healthy.

## 7. Updating

```bash
docker compose pull && docker compose up -d
```

A fixed version (for example `ONCOCURVE_IMAGE=ghcr.io/cccu-uku/oncocurve:1.0.0`) that is raised deliberately is recommended. With the tag `1` or `latest`, new versions arrive automatically with the next `docker compose pull`.

## 8. Building from source

With the source code in the working directory, the image is built locally instead of pulled:

```bash
docker compose -f docker-compose.yml -f docker-compose.build.yml up -d --build
```

The local image is called `oncocurve:lokal`. Optionally, `BUILD_COMMIT` in `.env` writes the commit hash into the metadata of the Excel export.

## 9. What requires your own fork

The legal notice and logo can be adjusted without rebuilding. Other parts are built into the image and can only be changed in your own fork:

- Privacy policy: section `Datenschutz` in `locales/de.json` and `locales/en.json`. It contains statements about how the application is provided, which must match your own operation.
- The application logo and other interface texts.

Anyone who offers a modified version as a network service must make the source code of that version available to its users under the AGPL-3.0 (section 13). Logos and trademarks are excluded from the license; details are in the file `COPYRIGHT`.

## 10. Intended purpose

ONCOcurve is not a medical device within the meaning of the MDR/IVDR. It is intended for the retrospective, aggregated analysis of cohorts, not for diagnosis, prognosis or treatment decisions for individual patients. Operators must not offer or advertise ONCOcurve with a medical intended purpose. Anyone who does so becomes a manufacturer within the meaning of the MDR.
