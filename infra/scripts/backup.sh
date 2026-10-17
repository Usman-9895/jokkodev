#!/bin/sh
# Sauvegarde chiffrée de la base JokkoDev.
#   BACKUP_DATABASE_URL    connexion en lecture sur toutes les tables (rôle jokkodev_migrator)
#   BACKUP_DIR             dossier local des sauvegardes, hors du dossier de l'application
#   BACKUP_KEY_FILE        clé de chiffrement (32 octets aléatoires au moins), conservée aussi hors du serveur
#   BACKUP_RETENTION_DAYS  rétention locale, 7 par défaut
# La copie hors serveur (stockage Datacloud ou autre) est une étape distincte, voir docs/operations/runbook.md.
set -eu
umask 077
: "${BACKUP_DATABASE_URL:?}" "${BACKUP_DIR:?}" "${BACKUP_KEY_FILE:?}"
stamp=$(date -u +%Y%m%dT%H%M%SZ)
target="$BACKUP_DIR/jokkodev-$stamp.dump.enc"
work=$(mktemp -d "$BACKUP_DIR/.work.XXXXXX")
trap 'rm -rf "$work"' EXIT INT TERM

pg_dump --format=custom --no-owner --no-privileges --file="$work/db.dump" "$BACKUP_DATABASE_URL"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass "file:$BACKUP_KEY_FILE" -in "$work/db.dump" -out "$work/db.dump.enc"
mv "$work/db.dump.enc" "$target"
(cd "$BACKUP_DIR" && sha256sum "$(basename "$target")" > "$(basename "$target").sha256")
find "$BACKUP_DIR" -maxdepth 1 -name 'jokkodev-*.dump.enc*' -mtime +"${BACKUP_RETENTION_DAYS:-7}" -exec rm -f {} +
printf '{"event":"backup_created","file":"%s","bytes":%s}\n' "$(basename "$target")" "$(wc -c < "$target" | tr -d ' ')"
