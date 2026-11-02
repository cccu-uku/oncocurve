# Security

## Reporting a vulnerability

Please do not report suspected vulnerabilities as a public issue. Send them confidentially by email to **service.cccu@uniklinik-ulm.de** (subject "ONCOcurve security").

Helpful information:

- the affected version or commit,
- a description of the vulnerability and its possible impact,
- steps to reproduce it.

We review reports as our resources allow. There is no entitlement to a response, a fix or a particular timeline.

## Supported versions

Security fixes are applied to the current state of the main branch only. Older versions are not maintained.

## Notes for operators

ONCOcurve processes analysis data in the browser and stores no data on the server. The server does, however, deliver the program code to the browsers. A compromised server can therefore deliver modified code. Operators should

- install new ONCOcurve versions promptly (`docker compose pull && docker compose up -d`),
- keep the operating system, Docker and the container images up to date,
- restrict access to the server to the necessary people and networks,
- use HTTPS with a valid certificate.

The operator is responsible for running and securing an instance (see README, section "Liability and operation").
