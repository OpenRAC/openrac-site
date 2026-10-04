#!/usr/bin/env bash
#
# Saves snapshots of the OpenRAC website to the Wayback Machine (Internet Archive).
# Usage: ./wayback_snapshot.sh [URL ...]
# If no URLs are passed, defaults to the main site and blog.
#
set -euo pipefail

URLS=("${@:-https://openrac.dev/ https://openrac.dev/blog}")
MAX_RETRIES=3
RETRY_DELAY=10

save_url() {
    local target_url="$1"
    local attempt=1
    local save_endpoint="https://web.archive.org/save/${target_url}"

    echo "[$(date -u +'%Y-%m-%d %H:%M:%SZ')] Archiving: ${target_url}"

    while [ "$attempt" -le "$MAX_RETRIES" ]; do
        # Archive.org responds with 302 / 200 and a 'location:' or 'content-location:' header pointing to the snapshot
        headers=$(curl -s -S -D - "${save_endpoint}" -o /dev/null -A "OpenRAC-ArchiveBot/1.0 (+https://openrac.dev)" 2>&1 || true)
        
        status_code=$(echo "$headers" | grep -iE '^HTTP/' | tail -n 1 | awk '{print $2}' || true)
        archive_url=$(echo "$headers" | grep -i '^location:' | head -n 1 | awk '{print $2}' | tr -d '\r' || true)

        if [ "$status_code" = "200" ] || [ "$status_code" = "302" ]; then
            if [ -n "$archive_url" ]; then
                echo "  ✓ Success (HTTP ${status_code}): ${archive_url}"
            else
                echo "  ✓ Success (HTTP ${status_code}): saved to Wayback Machine"
            fi
            return 0
        else
            echo "  ⚠ Attempt ${attempt}/${MAX_RETRIES} failed (HTTP ${status_code:-unknown})."
            if [ "$attempt" -lt "$MAX_RETRIES" ]; then
                echo "    Waiting ${RETRY_DELAY}s before retrying..."
                sleep "$RETRY_DELAY"
            fi
        fi
        attempt=$((attempt + 1))
    done

    echo "  ✗ Failed to archive ${target_url} after ${MAX_RETRIES} attempts." >&2
    return 1
}

overall_exit=0
for url in "${URLS[@]}"; do
    save_url "$url" || overall_exit=1
    sleep 3
done

exit "$overall_exit"
