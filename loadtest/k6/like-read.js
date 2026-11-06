// 阶段0：点赞读路径（默认只读，不写库）
// 运行：k6 run -e BASE_URL=... -e POST_ID=... loadtest/k6/like-read.js
// 若要测写路径，显式加 -e ENABLE_WRITE=1 -e TEST_TOKEN=...（会真实切换点赞状态）
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, getHeaders } from './common.js';

const POST_ID = __ENV.POST_ID || '93aad6b3-8225-470c-87eb-06e8ad36e266';
const TOKEN = __ENV.TEST_TOKEN || '';

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
  const headers = getHeaders(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {});
  const res = http.get(`${BASE_URL}/api/posts/${POST_ID}/like`, {
    headers, tags: { name: 'like_status' },
  });
  check(res, { 'like status 200': (x) => x.status === 200 });

  if (__ENV.ENABLE_WRITE === '1' && TOKEN) {
    const toggle = http.post(`${BASE_URL}/api/posts/${POST_ID}/like`, null, {
      headers, tags: { name: 'like_toggle' },
    });
    check(toggle, { 'like toggle 200': (x) => x.status === 200 });
  }
  sleep(0.2);
}
