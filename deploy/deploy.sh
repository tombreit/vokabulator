#!/usr/bin/env bash
# Check, test, build and copy Vokabulator to the server.
#
# Usage:
#   VOKABULATOR_TARGET=user@host:/var/www/vokabulator ./deploy/deploy.sh            # deploy
#   VOKABULATOR_TARGET=user@host:/var/www/vokabulator ./deploy/deploy.sh --dry-run  # only show changes
#
# Extra arguments are passed on to rsync.
set -euo pipefail

: "${VOKABULATOR_TARGET:?Please set VOKABULATOR_TARGET, e.g. user@host:/var/www/vokabulator}"

cd "$(dirname "$0")/.."

pnpm check
pnpm test
pnpm build

# --delete removes files of old builds on the server; build/ is the complete app,
# including .htaccess with the app's Apache rules (from static/.htaccess).
rsync -avz --delete "$@" build/ "${VOKABULATOR_TARGET%/}/"
