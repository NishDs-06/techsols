#!/bin/bash
# ┌─────────────────────────────────────────────────────────────────────────────┐
# │  PS3 AutoHeal — Start Script                                                │
# │  Run this from any terminal to start all services and see live logs         │
# └─────────────────────────────────────────────────────────────────────────────┘

set -e
REPO="/mnt/hdd/techsols"
VENV="$REPO/venv/bin"

echo ""
echo "╔══════════════════════════════════════════╗"
echo "║      PS3 AutoHeal — Starting Up          ║"
echo "╚══════════════════════════════════════════╝"
echo ""

# 1. Start ML service in background (if not already running)
if ! fuser 8001/tcp &>/dev/null; then
    echo "▶ Starting ML service (port 8001)..."
    cd "$REPO/ps3/ml_service"
    nohup "$VENV/uvicorn" main:app --port 8001 --host 0.0.0.0 > /tmp/ml_service.log 2>&1 &
    sleep 3
    echo "  ✓ ML service started (logs: /tmp/ml_service.log)"
else
    echo "  ✓ ML service already running on port 8001"
fi

# 2. Kill any existing orchestrator and restart
echo ""
echo "▶ Starting orchestrator (port 8000)..."
fuser -k 8000/tcp 2>/dev/null || true
sleep 1
cd "$REPO/ps3/orchestrator"

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Orchestrator logs will appear below"
echo "  To trigger a demo incident, run in another terminal:"
echo "    kubectl scale deployment paymentservice --replicas=0"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

exec "$VENV/uvicorn" main:app --port 8000 --host 0.0.0.0
