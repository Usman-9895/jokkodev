#!/bin/sh
# Vérifications après déploiement : post-deploy-check.sh https://jokkodev.example
# Sortie non nulle au premier contrôle en échec. Aucune donnée n'est créée.
# CURL_EXTRA : options curl supplémentaires pour un essai avant ouverture du DNS, par exemple
#   CURL_EXTRA='--resolve jokkodev.example:443:203.0.113.10 --resolve jokkodev.example:80:203.0.113.10'
set -eu
base="${1:?URL publique attendue, par exemple https://jokkodev.example}"
host=$(printf '%s' "$base" | sed -E 's#^https://([^/]+).*#\1#')
fail() { echo "ÉCHEC : $1" >&2; exit 1; }
# shellcheck disable=SC2086
status() { curl -s ${CURL_EXTRA:-} -o /dev/null -w '%{http_code}' "$@"; }
# shellcheck disable=SC2086
headers() { curl -s ${CURL_EXTRA:-} -D - -o /dev/null "$@"; }

[ "$(status "$base/api/v1/health/live")" = 200 ] || fail 'liveness'
[ "$(status "$base/api/v1/health/ready")" = 200 ] || fail 'readiness (base de données)'
[ "$(status "$base/")" = 200 ] || fail 'page d’accueil'
[ "$(status "$base/api/docs")" = 404 ] || fail 'documentation Swagger exposée'
[ "$(status "http://$host/")" = 301 ] || fail 'redirection HTTP vers HTTPS'
headers "$base/api/v1/health/live" | grep -qi '^strict-transport-security:' || fail 'en-tête HSTS'
cookies=$(headers "$base/api/v1/auth/csrf" | grep -i '^set-cookie:')
printf '%s' "$cookies" | grep -q '__Host-jokkodev_csrf=' || fail 'cookie CSRF __Host-'
printf '%s' "$cookies" | grep -qi 'secure' || fail 'cookie Secure'
[ "$(status -X POST -H 'Content-Type: application/json' -H "Origin: $base" -d '{}' "$base/api/v1/auth/login")" = 403 ] || fail 'mutation sans jeton CSRF acceptée'
[ "$(status -X POST -H 'Content-Type: application/json' -H 'Origin: https://evil.example' -d '{}' "$base/api/v1/auth/login")" = 403 ] || fail 'origine étrangère acceptée'
echo '{"event":"post_deploy_check","result":"ok"}'
