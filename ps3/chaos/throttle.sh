
kubectl patch deployment paymentservice -n default \
  -p '{"spec":{"template":{"spec":{"containers":[{"name":"server","resources":{"limits":{"cpu":"50m"}}}]}}}}'
echo "CPU throttled on paymentservice"