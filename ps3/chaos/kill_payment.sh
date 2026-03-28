#!/usr/bin/env bash
ORC=http://localhost:8000
echo "[chaos] Injecting payment failure..."
curl -s -X POST "$ORC/chaos/inject"
echo ""
echo "[chaos] Chaos active for 30s (one incident only)..."
sleep 30
echo "[chaos] Recovering..."
curl -s -X POST "$ORC/chaos/recover"
echo ""
echo "[chaos] Done — one incident fired, PDF generating in background."
