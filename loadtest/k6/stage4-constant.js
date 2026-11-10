// 阶段 4 单实例 / 双实例固定到达率对照。
// 使用同一个 Nginx 入口，只改变 upstream 实例数。
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, getHeaders } from './common.js';

const RATE = Number(__ENV.RATE || 500);
const DURATION = __ENV.DURATION || '30s';
const PRE_VUS = Number(__ENV.PRE_VUS || Math.max(50, RATE / 2));
const MAX_VUS = Number(__ENV.MAX_VUS || Math.max(500, RATE * 2));

export const options = {
  scenarios: {
    fixed_read_load: {
      executor: 'constant-arrival-rate',
      rate: RATE,
      timeUnit: '1s',
      duration: DURATION,
      preAllocatedVUs: PRE_VUS,
      maxVUs: MAX_VUS,
      gracefulStop: '15s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.02'],
    http_req_duration: ['p(95)<2000'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  discardResponseBodies: true,
};

export default function () {
  const r = Math.random();
  let res;
  if (r < 0.40) {
    res = http.get(`${BASE_URL}/api/public/posts?page=1&limit=12`, { headers: getHeaders(), tags: { name: 'posts_page_1' } });
  } else if (r < 0.60) {
    res = http.get(`${BASE_URL}/api/public/posts?page=2&limit=12`, { headers: getHeaders(), tags: { name: 'posts_page_2' } });
  } else if (r < 0.75) {
    res = http.get(`${BASE_URL}/api/public/tags`, { headers: getHeaders(), tags: { name: 'tags' } });
  } else if (r < 0.85) {
    res = http.get(`${BASE_URL}/api/public/archive`, { headers: getHeaders(), tags: { name: 'archive' } });
  } else if (r < 0.95) {
    res = http.get(`${BASE_URL}/api/public/search?q=test&page=1&limit=10`, { headers: getHeaders(), tags: { name: 'search' } });
  } else {
    res = http.get(`${BASE_URL}/api/public/stats`, { headers: getHeaders(), tags: { name: 'stats' } });
  }
  check(res, { '200 response': (x) => x.status === 200 });
}
