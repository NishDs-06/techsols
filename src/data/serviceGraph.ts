export const SERVICES = [
  'frontend', 'cartservice', 'productcatalog', 'currencyservice',
  'checkoutservice', 'adservice', 'recommendservice',
  'paymentservice', 'shippingservice', 'emailservice',
] as const;

export const SERVICE_EDGES: { source: string; target: string }[] = [
  { source: 'frontend', target: 'cartservice' },
  { source: 'frontend', target: 'productcatalog' },
  { source: 'frontend', target: 'currencyservice' },
  { source: 'frontend', target: 'checkoutservice' },
  { source: 'frontend', target: 'adservice' },
  { source: 'frontend', target: 'recommendservice' },
  { source: 'checkoutservice', target: 'cartservice' },
  { source: 'checkoutservice', target: 'shippingservice' },
  { source: 'checkoutservice', target: 'currencyservice' },
  { source: 'checkoutservice', target: 'paymentservice' },
  { source: 'checkoutservice', target: 'emailservice' },
  { source: 'checkoutservice', target: 'productcatalog' },
  { source: 'recommendservice', target: 'productcatalog' },
];
