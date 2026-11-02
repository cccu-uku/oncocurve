#!/bin/sh
# Entrypoint bind-mounted into the unmodified official caddy:2-alpine image
# (see docker-compose.yml); no custom Caddy image is built. Writes the
# Caddyfile inside the caddy container (never on the host) and reverse-proxies
# to the app container over the compose network.
set -e

: "${APP_HOST:=app}"
: "${APP_PORT:=3000}"
: "${SITE_ADDRESS:=:443}"

# Pick the TLS strategy:
#   - explicit cert + key  -> use the mounted institutional certificate
#   - hostname address     -> leave empty so Caddy fetches a Let's Encrypt cert
#   - bare :443 / IP       -> self-signed internal cert (instant HTTPS)
if [ -n "$TLS_CERT" ] && [ -n "$TLS_KEY" ]; then
  TLS_LINE="tls $TLS_CERT $TLS_KEY"
elif printf '%s' "$SITE_ADDRESS" | grep -qE '^[A-Za-z]'; then
  TLS_LINE=""
else
  # Without a hostname Caddy has no name to issue an internal cert for and
  # aborts every handshake, so on_demand is required. Caddy then logs a
  # "no protections are in place" warning; that is expected here.
  TLS_LINE="tls internal {
        on_demand
    }"
fi

mkdir -p /etc/caddy
cat > /etc/caddy/Caddyfile <<EOF
{
    admin off
}
$SITE_ADDRESS {
    encode zstd gzip
    # HSTS without includeSubDomains: applies to this hostname only, not to
    # other services under the same institutional domain.
    header {
        Strict-Transport-Security "max-age=31536000"
        -Server
    }
    reverse_proxy $APP_HOST:$APP_PORT
    $TLS_LINE
}
EOF

exec caddy run --config /etc/caddy/Caddyfile --adapter caddyfile
