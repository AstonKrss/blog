// 阶段0：标签筛选读路径
// 运行：k6 run -e BASE_URL=http://localhost:8080 -e TAG=test loadtest/k6/tag-filter.js
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, getHeaders } from './common.js';

const TAG = __ENV.TAG || 'test';

export const options = {
  stages: [
    { duration: '20s', target: 5 },
    { duration: '40s', target: 20 },
    { duration: '20s', target: 0 },
  ],
  thresholds: { http_req_failed: ['rate<0.01'] },
  summaryTrendStats: ['avg', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const res = http.get(`${BASE_URL}/api/public/posts?page=1&limit=12&tag=${encodeURIComponent(TAG)}`, {
    headers: getHeaders(), tags: { name: 'tag_filter' },
  });
  check(res, { 'tag filter 200': (x) => x.status === 200 });
  sleep(0.1);
}
