#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# Project-local MongoDB for the Restaurant Management System.
#
# Runs a SINGLE-NODE REPLICA SET on port 27018 with its own data directory.
#
# Why a replica set and not a plain standalone mongod?
#   Bill settlement must write StockMovement rows AND decrement
#   Ingredient.currentStock atomically. Mongoose transactions
#   (session.withTransaction) are ONLY available on a replica set — a
#   standalone mongod rejects them outright. One node is enough.
#
# Why port 27018 and a local data dir?
#   So this never touches a MongoDB you already run on 27017 for other work.
#
# Usage:  ./scripts/mongo-dev.sh {start|stop|status|shell|wipe}
#
# No local mongod? Docker alternative:
#   docker run -d --name rms-mongo -p 27018:27018 mongo:8 \
#     mongod --replSet rs0 --port 27018 --bind_ip_all
#   docker exec rms-mongo mongosh --port 27018 --eval 'rs.initiate()'
# ---------------------------------------------------------------------------
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DATA_DIR="$ROOT/.mongo/data"
LOG_FILE="$ROOT/.mongo/mongod.log"
PID_FILE="$ROOT/.mongo/mongod.pid"
PORT=27018
RS_NAME=rs0

command -v mongod >/dev/null || { echo "✗ mongod not found. Install MongoDB or use the Docker command in this script's header."; exit 1; }
command -v mongosh >/dev/null || { echo "✗ mongosh not found."; exit 1; }

is_running() { [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; }

start() {
  if is_running; then echo "✓ already running on :$PORT (pid $(cat "$PID_FILE"))"; return 0; fi
  mkdir -p "$DATA_DIR" "$(dirname "$LOG_FILE")"
  echo "→ starting mongod on :$PORT (replSet $RS_NAME)"
  # NOTE: MongoDB 8.3+ removed --fork on macOS, so we background it ourselves.
  nohup mongod --replSet "$RS_NAME" --dbpath "$DATA_DIR" --port "$PORT" \
        --bind_ip 127.0.0.1 --logpath "$LOG_FILE" >/dev/null 2>&1 &
  echo $! > "$PID_FILE"

  for i in $(seq 1 30); do
    if mongosh --quiet --port "$PORT" --eval 'db.adminCommand({ping:1}).ok' >/dev/null 2>&1; then break; fi
    [[ $i -eq 30 ]] && { echo "✗ mongod did not accept connections; see $LOG_FILE"; exit 1; }
    sleep 0.5
  done

  if ! mongosh --quiet --port "$PORT" --eval 'rs.status().ok' >/dev/null 2>&1; then
    echo "→ initiating replica set"
    mongosh --quiet --port "$PORT" --eval \
      "rs.initiate({_id:'$RS_NAME',members:[{_id:0,host:'127.0.0.1:$PORT'}]})" >/dev/null
  fi

  for i in $(seq 1 40); do
    if [[ "$(mongosh --quiet --port "$PORT" --eval 'db.hello().isWritablePrimary' 2>/dev/null)" == "true" ]]; then
      echo "✓ mongod ready — primary on mongodb://127.0.0.1:$PORT (transactions enabled)"; return 0
    fi
    sleep 0.5
  done
  echo "✗ replica set never became primary; see $LOG_FILE"; exit 1
}

stop() {
  if ! is_running; then echo "· not running"; return 0; fi
  mongosh --quiet --port "$PORT" --eval 'db.getSiblingDB("admin").shutdownServer()' >/dev/null 2>&1 || true
  sleep 1; rm -f "$PID_FILE"; echo "✓ stopped"
}

status() {
  if is_running; then
    echo "✓ running (pid $(cat "$PID_FILE")) on :$PORT"
    mongosh --quiet --port "$PORT" --eval \
      'const s=rs.status(); print("  replSet: "+s.set+"  state: "+s.members[0].stateStr)'
  else echo "· not running"; fi
}

case "${1:-status}" in
  start) start ;;
  stop) stop ;;
  status) status ;;
  shell) mongosh --port "$PORT" rms ;;
  wipe) stop; rm -rf "$DATA_DIR"; echo "✓ data directory removed" ;;
  *) echo "usage: $0 {start|stop|status|shell|wipe}"; exit 1 ;;
esac
