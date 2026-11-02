# --- Build -------------------------------------------------------------------
FROM node:26-alpine AS build
RUN npm i -g corepack@latest && corepack enable
WORKDIR /app

COPY package.json yarn.lock .yarnrc.yml ./
RUN yarn install --immutable

COPY . .
# Commit-Hash für den Excel-Export und das Label image.revision,
# beim Bauen per --build-arg NEXT_PUBLIC_BUILD_COMMIT=$(git rev-parse HEAD) gesetzt
ARG NEXT_PUBLIC_BUILD_COMMIT
ENV NEXT_PUBLIC_BUILD_COMMIT=${NEXT_PUBLIC_BUILD_COMMIT} \
    NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone
RUN yarn build \
    && node scripts/third-party-licenses.mjs THIRD_PARTY_LICENSES.txt .next/standalone/node_modules

# Betreiberdaten dürfen nie im Image landen. lib/betreiber.ts verlässt sich auf
# einen undokumentierten turbopackIgnore-Kommentar am fs.readFile, daher prüfen.
RUN test ! -e .next/standalone/config \
    && test -z "$(find .next/standalone -name cccu_logo.png)" \
    && test ! -e public/cccu_logo.png

# --- Laufzeit ----------------------------------------------------------------
FROM node:26-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0

RUN addgroup -g 1001 nextjs && adduser -D -u 1001 -G nextjs nextjs

COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
COPY --from=build /app/LICENSE /app/COPYRIGHT /app/NOTICE /app/THIRD_PARTY_LICENSES.txt ./
COPY --from=build /app/THIRD_PARTY_LICENSES.txt ./public/THIRD_PARTY_LICENSES.txt
RUN mkdir -p /app/config && chown nextjs:nextjs /app/config \
    && mkdir -p /app/.next/cache && chown nextjs:nextjs /app/.next/cache

ARG NEXT_PUBLIC_BUILD_COMMIT
LABEL org.opencontainers.image.title="ONCOcurve" \
      org.opencontainers.image.revision="${NEXT_PUBLIC_BUILD_COMMIT}" \
      org.opencontainers.image.description="Kaplan-Meier survival analysis for oncology cohorts in the browser" \
      org.opencontainers.image.licenses="AGPL-3.0-only" \
      org.opencontainers.image.vendor="Universitätsklinikum Ulm (Comprehensive Cancer Center Ulm, CCCU)" \
      org.opencontainers.image.source="https://github.com/cccu-uku/oncocurve"

USER nextjs
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1:3000/de || exit 1
CMD ["node", "server.js"]
