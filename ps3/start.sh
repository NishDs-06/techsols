#!/bin/bash
echo "Starting PS3 AutoHeal..."

nohup kubectl port-forward -n monitoring svc/prometheus-kube-prometheus-prometheus 9090:9090 --address=0.0.0.0 > /tmp/prom-pf.log 2>&1 &
nohup kubectl port-forward svc/frontend-external 8080:80 --address=0.0.0.0 > /tmp/boutique-pf.log 2>&1 &

sleep 3

cd /mnt/hdd/techsols/ps3/orchestrator
nohup uvicorn main:app --port 8000 --host 0.0.0.0 --reload > /tmp/orchestrator.log 2>&1 &

sleep 5
curl -s http://localhost:8000/health && echo " — orchestrator up"
echo "Done. Logs: /tmp/orchestrator.log | /tmp/prom-pf.log"
