#!/bin/sh
set -e

# Volume mounts (Docker Compose, Railway) replace the image's /data/media
# directory and arrive owned by root, so we fix ownership at boot before
# dropping privileges to the unprivileged sonora user.
mkdir -p /data/media
chown -R sonora:sonora /data 2>/dev/null || true

exec gosu sonora "$@"
