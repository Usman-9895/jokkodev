#!/bin/sh
# Private normalized images only. Pair with backup.sh and copy both encrypted archives off-server.
# No rotation here: use the established retention/copy procedure after verifying both archives.
set -eu
umask 077
: "${AVATAR_STORAGE_DIR:?}" "${QUESTION_IMAGE_STORAGE_DIR:?}" "${BACKUP_DIR:?}" "${BACKUP_KEY_FILE:?}"
case "$BACKUP_DIR" in /*) ;; *) exit 1;; esac
[ -d "$BACKUP_DIR" ] && [ ! -L "$BACKUP_DIR" ] && [ -r "$BACKUP_KEY_FILE" ]
work=$(mktemp -d "$BACKUP_DIR/.files.XXXXXXXX")
trap 'rm -rf "$work"' EXIT HUP INT TERM
copy_images() {
    source_dir=$1
    destination=$2
    prefix=$3
    case "$source_dir" in /*) ;; *) exit 1;; esac
    [ "$source_dir" != / ] && [ -d "$source_dir" ] && [ ! -L "$source_dir" ]
    [ "$(cd "$source_dir" && pwd -P)" = "$source_dir" ]
    mkdir "$work/$destination"
    # Only flat managed regular files. Never traverse or dereference a symlink.
    for file in "$source_dir"/"$prefix"*.jpg; do
        [ -f "$file" ] || continue
        [ ! -L "$file" ] || exit 1
        base=$(basename "$file")
        printf '%s\n' "$base" | LC_ALL=C grep -Eq "^$prefix[0-9a-f]{32}\\.jpg$" || exit 1
        cp -p "$file" "$work/$destination/$base"
    done
}
[ "$AVATAR_STORAGE_DIR" != "$QUESTION_IMAGE_STORAGE_DIR" ]
copy_images "$AVATAR_STORAGE_DIR" avatars jd-
copy_images "$QUESTION_IMAGE_STORAGE_DIR" question-images qi-
tar -czf "$work/files.tar.gz" -C "$work" avatars question-images
stamp=$(date -u +%Y%m%dT%H%M%S)-$$
name="jokkodev-files-$stamp.tar.gz.enc"
openssl enc -aes-256-cbc -salt -pbkdf2 -iter 200000 -pass "file:$BACKUP_KEY_FILE" -in "$work/files.tar.gz" -out "$work/archive.enc"
[ -s "$work/archive.enc" ]
mv "$work/archive.enc" "$BACKUP_DIR/$name"
(cd "$BACKUP_DIR" && sha256sum "$name" > "$name.sha256" && sha256sum -c "$name.sha256" >/dev/null)
printf '{"event":"files_backup_created","bytes":%s}\n' "$(wc -c < "$BACKUP_DIR/$name" | tr -d ' ')"
