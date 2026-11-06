// 阶段1 开环压测：按固定到达率发请求，不等待上一请求完成。
// 用法：
//   k6 run -e BASE_URL=http://localhost:8080 -e MAX_RPS=900 bench-data/k6/open-loop.js
// 说明：
//   - MAX_RPS 控制最高档，建议缓存关闭时用 300/600，缓存开启时用 900。
//   - 每档持续 2 分钟，第一档 1 分钟用于预热。
import http from 'k6/http';
import { check } from 'k6';
import { BASE_URL, getHeaders } from './common.js';

const MAX_RPS = Number(__ENV.MAX_RPS || 900);
const targets = [100, 300, 600, 900].filter((t) => t <= MAX_RPS);
const stages = targets.map((target, index) => ({
  target,
  duration: index === 0 ? '1m' : '2m',
}));
stages.push({ target: 0, duration: '30s' });

export const options = {
  scenarios: {
    read_load: {
      executor: 'ramping-arrival-rate',
      startRate: 50,
      timeUnit: '1s',
      preAllocatedVUs: 100,
      maxVUs: 1000,
      stages,
      gracefulStop: '30s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
  discardResponseBodies: true,
};

export default function () {
  const r = Math.random();
  if (r < 0.55) {
    const page = 1 + Math.floor(Math.random() * 50);
    const res = http.get(`${BASE_URL}/api/public/posts?page=${page}&limit=12`, {
      headers: getHeaders(), tags: { name: 'posts_list' },
    });
    check(res, { 'posts 200': (x) => x.status === 200 });
  } else if (r < 0.75) {
    const n = 1 + Math.floor(Math.random() * 40000);
    const slug = `bench-post-${String(n).padStart(6, '0')}`;
    const res = http.get(`${BASE_URL}/api/public/posts/${slug}`, {
      headers: getHeaders(), tags: { name: 'post_detail' },
    });
    check(res, { 'detail 200': (x) => x.status === 200 });
  } else if (r < 0.85) {
    const res = http.get(`${BASE_URL}/api/public/tags`, {
      headers: getHeaders(), tags: { name: 'tags' },
    });
    check(res, { 'tags 200': (x) => x.status === 200 });
  } else if (r < 0.95) {
    const res = http.get(`${BASE_URL}/api/public/search?q=%E6%80%A7%E8%83%BD&page=1&limit=10`, {
      headers: getHeaders(), tags: { name: 'search' },
    });
    check(res, { 'search 200': (x) => x.status === 200 });
  } else {
    const res = http.get(`${BASE_URL}/api/public/stats`, {
      headers: getHeaders(), tags: { name: 'stats' },
    });
    check(res, { 'stats 200': (x) => x.status === 200 });
  }
}
