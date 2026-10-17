#!/bin/sh
# Restauration d'une sauvegarde chiffrée dans une base VIDE dédiée (essai de restauration ou reprise).
#   restore.sh <fichier.dump.enc>
#   RESTORE_DATABASE_URL   base cible vide ; jamais la base de production en service
#   BACKUP_KEY_FILE        clé utilisée à la sauvegarde
#   RESTORE_EXPECTED_DATABASE nom exact de la base jetable/dédiée, vérifié auprès du serveur
#   RESTORE_CONFIRM_TARGET même nom, après vérification humaine de la destination et de son isolement
#   PRODUCTION_DATABASE_URL facultatif : bloque seulement une URL littéralement identique.
# Aucun contrôle local d'URL ne prouve qu'un alias/hôte différent n'est pas la production.
set -eu
umask 077
file="${1:?fichier de sauvegarde attendu}"
: "${RESTORE_DATABASE_URL:?}" "${BACKUP_KEY_FILE:?}" "${RESTORE_EXPECTED_DATABASE:?}" "${RESTORE_CONFIRM_TARGET:?}"
if [ "${PRODUCTION_DATABASE_URL:-}" = "$RESTORE_DATABASE_URL" ]; then echo "Refus : la cible est la base de production." >&2; exit 1; fi
case "$RESTORE_EXPECTED_DATABASE" in ''|postgres|template0|template1|*[!A-Za-z0-9_]*) echo "Refus : nom de base dédiée invalide." >&2; exit 1;; esac
if [ "$RESTORE_CONFIRM_TARGET" != "$RESTORE_EXPECTED_DATABASE" ]; then echo "Refus : destination non confirmée." >&2; exit 1; fi
database=$(psql "$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc 'SELECT current_database()' 2>/dev/null) || { echo "Refus : destination invérifiable." >&2; exit 1; }
if [ "$database" != "$RESTORE_EXPECTED_DATABASE" ]; then echo "Refus : la base effective ne correspond pas à la destination attendue." >&2; exit 1; fi
# Base vide au-delà des seules tables public : refuser aussi schémas, séquences, vues, types et fonctions utilisateur.
objects=$(psql "$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc "
 SELECT
 (SELECT count(*) FROM pg_namespace WHERE nspname <> 'public' AND nspname <> 'information_schema' AND nspname !~ '^pg_') +
 (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname <> 'information_schema' AND n.nspname !~ '^pg_') +
 (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname <> 'information_schema' AND n.nspname !~ '^pg_') +
 (SELECT count(*) FROM pg_type t JOIN pg_namespace n ON n.oid=t.typnamespace WHERE n.nspname <> 'information_schema' AND n.nspname !~ '^pg_') +
 (SELECT count(*) FROM pg_extension WHERE extname <> 'plpgsql') +
 (SELECT count(*) FROM pg_largeobject_metadata) +
 (SELECT count(*) FROM pg_collation c JOIN pg_namespace n ON n.oid=c.collnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
 (SELECT count(*) FROM pg_operator c JOIN pg_namespace n ON n.oid=c.oprnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
 (SELECT count(*) FROM pg_conversion c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
 (SELECT count(*) FROM pg_opclass c JOIN pg_namespace n ON n.oid=c.opcnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
 (SELECT count(*) FROM pg_opfamily c JOIN pg_namespace n ON n.oid=c.opfnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
 (SELECT count(*) FROM pg_ts_config c JOIN pg_namespace n ON n.oid=c.cfgnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
 (SELECT count(*) FROM pg_ts_dict c JOIN pg_namespace n ON n.oid=c.dictnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
 (SELECT count(*) FROM pg_ts_parser c JOIN pg_namespace n ON n.oid=c.prsnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
 (SELECT count(*) FROM pg_ts_template c JOIN pg_namespace n ON n.oid=c.tmplnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema') +
 (SELECT count(*) FROM pg_event_trigger) + (SELECT count(*) FROM pg_publication) +
 (SELECT count(*) FROM pg_foreign_server) + (SELECT count(*) FROM pg_foreign_data_wrapper) +
 (SELECT count(*) FROM pg_default_acl) + (SELECT count(*) FROM pg_transform) +
 (SELECT count(*) FROM pg_cast WHERE oid >= 16384) +
 (SELECT count(*) FROM pg_am WHERE oid >= 16384) +
 (SELECT count(*) FROM pg_language WHERE lanname NOT IN ('internal', 'c', 'sql', 'plpgsql')) +
 (SELECT count(*) FROM pg_subscription)
" 2>/dev/null) || { echo "Refus : vacuité de la cible invérifiable." >&2; exit 1; }
if [ "$objects" != '0' ]; then echo "Refus : la base cible n'est pas vide." >&2; exit 1; fi
printf '{"event":"restore_target_checked","database":"%s","empty":true}\n' "$database"
(cd "$(dirname "$file")" && sha256sum -c "$(basename "$file").sha256" >/dev/null) || { echo "Empreinte invalide : sauvegarde altérée ou incomplète." >&2; exit 1; }
work=$(mktemp -d)
trap 'rm -rf "$work"' EXIT INT TERM
started=$(date +%s)

openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$BACKUP_KEY_FILE" -in "$file" -out "$work/db.dump" 2>/dev/null || { echo "Échec du déchiffrement." >&2; exit 1; }
pg_restore --no-owner --no-privileges --exit-on-error --single-transaction --dbname="$RESTORE_DATABASE_URL" "$work/db.dump" 2>/dev/null || { echo "Échec de restauration : transaction annulée." >&2; exit 1; }
tables=$(psql "$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'" 2>/dev/null) || { echo "Restauration terminée ; bilan invérifiable." >&2; exit 1; }
migrations=$(psql "$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc 'SELECT count(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL' 2>/dev/null) || { echo "Restauration terminée ; bilan invérifiable." >&2; exit 1; }
users=$(psql "$RESTORE_DATABASE_URL" -X -v ON_ERROR_STOP=1 -Atc 'SELECT count(*) FROM "User"' 2>/dev/null) || { echo "Restauration terminée ; bilan invérifiable." >&2; exit 1; }
printf '{"event":"restore_completed","seconds":%s,"tables":%s,"migrations":%s,"users":%s}\n' "$(( $(date +%s) - started ))" "$tables" "$migrations" "$users"
