// 阶段 4 单实例 / 双实例读路径对照压测。
// 目标：同一个 Nginx 入口、同一份数据、同一组热缓存接口，只改变 upstream 实例数。
// 用法：
//   k6 run -e BASE_URL=http://127.0.0.1:8088 -e MAX_RPS=1000 loadtest/k6/stage4-scaling.js
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, getHeaders } from './common.js';

const MAX_RPS = Number(__ENV.MAX_RPS || 1000);

export const options = {
  scenarios: {
    read_load: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1200,
      stages: [
        { target: 100, duration: '10s' },
        { target: 500, duration: '15s' },
        { target: MAX_RPS, duration: '25s' },
        { target: 0, duration: '5s' },
      ],
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
    res = http.get(`${BASE_URL}/api/public/posts?page=1&limit=12`, {
      headers: getHeaders(), tags: { name: 'posts_page_1' },
    });
  } else if (r < 0.60) {
    res = http.get(`${BASE_URL}/api/public/posts?page=2&limit=12`, {
      headers: getHeaders(), tags: { name: 'posts_page_2' },
    });
  } else if (r < 0.75) {
    res = http.get(`${BASE_URL}/api/public/tags`, {
      headers: getHeaders(), tags: { name: 'tags' },
    });
  } else if (r < 0.85) {
    res = http.get(`${BASE_URL}/api/public/archive`, {
      headers: getHeaders(), tags: { name: 'archive' },
    });
  } else if (r < 0.95) {
    res = http.get(`${BASE_URL}/api/public/search?q=test&page=1&limit=10`, {
      headers: getHeaders(), tags: { name: 'search' },
    });
  } else {
    res = http.get(`${BASE_URL}/api/public/stats`, {
      headers: getHeaders(), tags: { name: 'stats' },
    });
  }
  check(res, { '200 response': (x) => x.status === 200 });
}