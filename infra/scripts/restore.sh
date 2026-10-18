#!/bin/sh
# Restauration d'une sauvegarde chiffrée dans une base VIDE dédiée (essai de restauration ou reprise).
#   restore.sh <fichier.dump.enc>
#   RESTORE_DATABASE_URL   base cible vide ; jamais la base de production en service
#   BACKUP_KEY_FILE        clé utilisée à la sauvegarde
#   PRODUCTION_DATABASE_URL facultatif : si la cible lui est identique, la restauration est refusée
set -eu
umask 077
file="${1:?fichier de sauvegarde attendu}"
: "${RESTORE_DATABASE_URL:?}" "${BACKUP_KEY_FILE:?}"
if [ "${PRODUCTION_DATABASE_URL:-}" = "$RESTORE_DATABASE_URL" ]; then echo "Refus : la cible est la base de production." >&2; exit 1; fi
(cd "$(dirname "$file")" && sha256sum -c "$(basename "$file").sha256" >/dev/null) || { echo "Empreinte invalide : sauvegarde altérée ou incomplète." >&2; exit 1; }
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM
started=$(date +%s)

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$BACKUP_KEY_FILE" -in "$file" -out "$work/db.dump"
pg_restore --no-owner --no-privileges --exit-on-error --single-transaction --dbname="$RESTORE_DATABASE_URL" "$work/db.dump"
tables=$(psql "$RESTORE_DATABASE_URL" -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
migrations=$(psql "$RESTORE_DATABASE_URL" -Atc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL')
users=$(psql "$RESTORE_DATABASE_URL" -Atc 'SELECT count(*) FROM "User"')
printf '{"event":"restore_completed","seconds":%s,"tables":%s,"migrations":%s,"users":%s}\n' "$(( $(date +%s) - started ))" "$tables" "$migrations" "$users"
