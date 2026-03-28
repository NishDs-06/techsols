import http from 'k6/http';
import { sleep } from 'k6';

export let options = {
  stages: [
    { duration: '1m', target: 10 },   // Normal
    { duration: '30s', target: 100 }, // Spike
    { duration: '1m', target: 100 },  // High load
    { duration: '1m', target: 80 },   // Failure phase
    { duration: '30s', target: 10 },  // Recovery
  ],
};

export default function () {

  http.get('http://localhost:3000/products');
  http.get('http://localhost:3000/users');

  http.post(
    'http://localhost:3000/orders',
    JSON.stringify({
      product_id: Math.floor(Math.random() * 10) + 1,
      user_id: Math.floor(Math.random() * 5) + 1
    }),
    {
      headers: { 'Content-Type': 'application/json' },
    }
  );

  // Failure trigger
  http.get('http://localhost:3000/payment/fail');

  sleep(1);
}