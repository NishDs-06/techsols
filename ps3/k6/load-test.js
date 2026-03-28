import http from 'k6/http';
import { sleep } from 'k6';

export const options = {
    vus: 10,
    duration: '6h',  // effectively forever — ctrl+c to stop
};

export default function () {
    http.get('http://100.88.95.52:8080/');
    http.get('http://100.88.95.52:8080/product/OLJCESPC7Z');
    sleep(1);
}
