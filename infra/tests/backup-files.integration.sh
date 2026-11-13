#!/bin/sh
# Execute only inside a disposable environment, never using production directories/key.
set -eu
[ "${FILES_BACKUP_TEST_CONFIRM:-}" = disposable ] || exit 1
base=$(mktemp -d)
trap 'rm -rf "$base"' EXIT HUP INT TERM
mkdir "$base/avatars" "$base/images" "$base/backups" "$base/restored"
printf 'avatar fixture' > "$base/avatars/jd-00000000000000000000000000000001.jpg"
printf 'image fixture' > "$base/images/qi-00000000000000000000000000000001.jpg"
printf 'excluded secret fixture' > "$base/images/.env"
openssl rand -out "$base/key" 32
export AVATAR_STORAGE_DIR="$base/avatars" QUESTION_IMAGE_STORAGE_DIR="$base/images" BACKUP_DIR="$base/backups" BACKUP_KEY_FILE="$base/key"
sh "${FILES_BACKUP_SCRIPT:?}"
archive=$(find "$base/backups" -name '*.enc' -type f)
(cd "$base/backups" && sha256sum -c ./*.sha256 >/dev/null)
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass "file:$base/key" -in "$archive" -out "$base/restored.tar.gz"
tar -xzf "$base/restored.tar.gz" -C "$base/restored"
cmp "$base/images/qi-00000000000000000000000000000001.jpg" "$base/restored/question-images/qi-00000000000000000000000000000001.jpg"
cmp "$base/avatars/jd-00000000000000000000000000000001.jpg" "$base/restored/avatars/jd-00000000000000000000000000000001.jpg"
[ ! -e "$base/restored/question-images/.env" ]
ln -s "$base/key" "$base/images/qi-00000000000000000000000000000002.jpg"
if sh "$FILES_BACKUP_SCRIPT" >/dev/null 2>&1; then exit 1; fi
printf '%s\n' 'OK encrypted backup, SHA-256, decryption/restore, avatars/screenshots, exclusion and symlink refusal (disposable fixture).'
