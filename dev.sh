#!/usr/bin/env bash
# Convenience wrapper around the Docker dev stack (Next.js app + MongoDB).
#
#   ./dev.sh            start the stack (build if needed) and follow logs
#   ./dev.sh up         start in the background (detached), don't follow logs
#   ./dev.sh down       stop the stack (keeps DB data)
#   ./dev.sh down -v    stop and wipe the DB data
#   ./dev.sh restart    restart the app + db
#   ./dev.sh rebuild    rebuild the app image and start
#   ./dev.sh logs       follow logs
#   ./dev.sh ps         show container status
#   ./dev.sh sh         open a shell inside the app container

set -euo pipefail
cd "$(dirname "$0")"

# Pick `docker compose` (v2) or fall back to `docker-compose` (v1).
if docker compose version >/dev/null 2>&1; then
    dc() { docker compose "$@"; }
elif command -v docker-compose >/dev/null 2>&1; then
    dc() { docker-compose "$@"; }
else
    echo "Error: Docker Compose not found. Is Docker Desktop installed and running?" >&2
    exit 1
fi

# Fail early with a clear message if the Docker daemon isn't up.
if ! docker info >/dev/null 2>&1; then
    echo "Error: Docker daemon is not running. Start Docker Desktop and try again." >&2
    exit 1
fi

cmd="${1:-start}"
shift || true

case "$cmd" in
    start|up)
        # Run in the foreground (like `npm run dev`): build if needed, stream logs,
        # and stop the containers on Ctrl-C.
        echo "App: http://localhost:3000  (Ctrl-C stops the containers)"
        dc up --build "$@"
        ;;
    down|stop)
        dc down "$@"
        ;;
    restart)
        dc restart "$@"
        ;;
    rebuild)
        dc up --build -d "$@"
        dc ps
        ;;
    logs)
        dc logs -f "$@"
        ;;
    ps|status)
        dc ps
        ;;
    sh|shell)
        dc exec web sh
        ;;
    *)
        # Pass anything else straight through to docker compose.
        dc "$cmd" "$@"
        ;;
esac
