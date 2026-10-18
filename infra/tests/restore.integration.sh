#!/bin/sh
# Destructive only to NEW databases created by this test. Run on an isolated disposable PostgreSQL cluster.
set -eu
: "${RESTORE_TEST_CONFIRM_DISPOSABLE:?Set to disposable-cluster after checking server/port and credentials}"
[ "$RESTORE_TEST_CONFIRM_DISPOSABLE" = disposable-cluster ] || exit 1
: "${RESTORE_TEST_ADMIN_URL:?Dedicated cluster connection URL}"
root=$(CDPATH='' cd -- "$(dirname "$0")/../.." && pwd)
work=$(mktemp -d)
created=''
prefix="restore_test_$(date +%s)_$$"
cleanup() {
 for name in $created; do dropdb --maintenance-db="$RESTORE_TEST_ADMIN_URL" "$name" >/dev/null 2>&1 || :; done
 rm -rf "$work"
}
trap cleanup EXIT INT TERM
# psql's \connect handles the same server credentials, never an implicit development database.
newdb() {
 name="${prefix}_$1"
 createdb --maintenance-db="$RESTORE_TEST_ADMIN_URL" "$name"
 created="$created $name"
}
url() { printf '%s' "${RESTORE_TEST_ADMIN_URL%/*}/$1"; }
run_restore() {
 RESTORE_DATABASE_URL=$(url "$1") RESTORE_EXPECTED_DATABASE="$1" RESTORE_CONFIRM_TARGET="$1" BACKUP_KEY_FILE="$work/key" sh "$root/infra/scripts/restore.sh" "$2"
}
refuse() {
 if run_restore "$1" "$2" >"$work/refused" 2>&1; then echo 'FAIL expected refusal'; exit 1; fi
}
objects() { psql "$(url "$1")" -X -v ON_ERROR_STOP=1 -Atc "SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname !~ '^pg_' AND n.nspname <> 'information_schema'"; }
# URLs must be plain database URLs, no query/fragment; secrets never printed.
case "$RESTORE_TEST_ADMIN_URL" in *\?*|*\#*) echo 'Use a database URL without query/fragment'; exit 1;; esac
newdb source; source=$name
psql "$(url "$source")" -X -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE TABLE "_prisma_migrations" (finished_at timestamptz);
INSERT INTO "_prisma_migrations" VALUES (now());
CREATE TABLE "User" (id int);
CREATE TABLE "Technology" (id int);
INSERT INTO "Technology" VALUES (1);
SQL
mkdir "$work/backup"
openssl rand -out "$work/key" 32
BACKUP_DATABASE_URL=$(url "$source") BACKUP_DIR="$work/backup" BACKUP_KEY_FILE="$work/key" sh "$root/infra/scripts/backup.sh"
file=$(find "$work/backup" -name '*.dump.enc' | head -n 1)
newdb empty; empty=$name; test "$(objects "$empty")" = 0
run_restore "$empty" "$file"
test "$(psql "$(url "$empty")" -X -Atc 'SELECT count(*) FROM "Technology"')" = 1
echo 'PASS empty target restored'
refuse "$empty" "$file"; echo 'PASS repeated restore refused'
newdb nonempty; nonempty=$name
psql "$(url "$nonempty")" -X -v ON_ERROR_STOP=1 -c 'CREATE TABLE unrelated_marker(id int); INSERT INTO unrelated_marker VALUES (42)' >/dev/null
refuse "$nonempty" "$file"
test "$(objects "$nonempty")" = 1
test "$(psql "$(url "$nonempty")" -X -Atc 'SELECT id FROM unrelated_marker')" = 42
echo 'PASS unrelated nonempty target unchanged'
newdb schema; schema=$name
psql "$(url "$schema")" -X -v ON_ERROR_STOP=1 -c 'CREATE SCHEMA unrelated_empty' >/dev/null
refuse "$schema" "$file"; echo 'PASS empty custom schema refused'
newdb extension; extension=$name
psql "$(url "$extension")" -X -v ON_ERROR_STOP=1 -c 'CREATE EXTENSION hstore' >/dev/null
refuse "$extension" "$file"; echo 'PASS non-default extension refused'
newdb collation; collation=$name
psql "$(url "$collation")" -X -v ON_ERROR_STOP=1 -c 'CREATE COLLATION public.custom_collation FROM "C"' >/dev/null
refuse "$collation" "$file"; echo 'PASS standalone collation refused'
newdb altered; altered=$name
cp "$file" "$work/backup/altered.dump.enc"
(cd "$work/backup" && sha256sum altered.dump.enc > altered.dump.enc.sha256)
printf x >> "$work/backup/altered.dump.enc"
refuse "$altered" "$work/backup/altered.dump.enc"; test "$(objects "$altered")" = 0
echo 'PASS altered backup refused before writes'
# A valid archive whose late view depends on an intentionally excluded schema.
# Check that the archive attempts table DDL before the failing dependent view.
psql "$(url "$source")" -X -v ON_ERROR_STOP=1 >/dev/null <<'SQL'
CREATE SCHEMA excluded;
CREATE TABLE excluded.dependency (id int);
CREATE VIEW public.zz_failing_view AS SELECT * FROM excluded.dependency;
SQL
pg_dump --format=custom --schema=public --no-owner --no-privileges --file="$work/failing.dump" "$(url "$source")"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass "file:$work/key" -in "$work/failing.dump" -out "$work/failing.dump.enc"
(cd "$work" && sha256sum failing.dump.enc > failing.dump.enc.sha256)
pg_restore --file="$work/restore.sql" "$work/failing.dump"
first_table=$(grep -n '^CREATE TABLE' "$work/restore.sql" | head -n 1 | cut -d: -f1)
view=$(grep -n '^CREATE VIEW' "$work/restore.sql" | head -n 1 | cut -d: -f1)
test "$first_table" -lt "$view"
newdb atomic; atomic=$name
refuse "$atomic" "$work/failing.dump.enc"; test "$(objects "$atomic")" = 0
grep -q 'transaction' "$work/refused"
echo 'PASS valid archive failing after table DDL leaves zero objects (rollback)'
# This production guard test uses only the same DISPOSABLE URL, never a production host.
newdb guard; guard=$name
PRODUCTION_DATABASE_URL=$(url "$guard") export PRODUCTION_DATABASE_URL
refuse "$guard" "$file"; test "$(objects "$guard")" = 0
unset PRODUCTION_DATABASE_URL
echo 'PASS literal production guard with disposable URL'
RESTORE_DATABASE_URL='postgresql://nobody@127.0.0.1:1/unreachable' RESTORE_EXPECTED_DATABASE=unreachable RESTORE_CONFIRM_TARGET=unreachable BACKUP_KEY_FILE="$work/key" export RESTORE_DATABASE_URL RESTORE_EXPECTED_DATABASE RESTORE_CONFIRM_TARGET BACKUP_KEY_FILE
if sh "$root/infra/scripts/restore.sh" "$file" >"$work/refused" 2>&1; then exit 1; fi
grep -q 'invérifiable' "$work/refused"
echo 'PASS unreachable target fails closed without production contact'
