// 阶段0 基线：只读公共接口（首页列表、文章详情、标签筛选、搜索、统计）
// 运行：k6 run -e BASE_URL=http://localhost:8080 loadtest/k6/baseline-read.js
// 默认阶梯式加压，每档 1 分钟，避免一上来就把单机打满导致数据失真。
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, getHeaders } from './common.js';

// 可通过环境变量替换为你库里真实存在的 slug
const SLUG = __ENV.SLUG || 'test-article-123';

export const options = {
  stages: [
    { duration: '30s', target: 5 },   // 预热
    { duration: '1m',  target: 10 },  // 低负载
    { duration: '1m',  target: 25 },  // 中负载
    { duration: '1m',  target: 50 },  // 高负载（寻找拐点）
    { duration: '30s', target: 0 },   // 降压
  ],
  thresholds: {
    // 阈值是“验收门槛”，不是性能结论；基线阶段允许失败，失败本身就是数据
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
  },
  // 把 P50/P90/P95/P99 都输出到摘要，便于直接对照文档
  summaryTrendStats: ['avg', 'min', 'med', 'p(90)', 'p(95)', 'p(99)', 'max'],
};

export default function () {
  const r = Math.random();

  if (r < 0.40) {
    const page = 1 + Math.floor(Math.random() * 3);
    const res = http.get(`${BASE_URL}/api/public/posts?page=${page}&limit=12`, {
      headers: getHeaders(), tags: { name: 'posts_list' },
    });
    check(res, { 'posts 200': (x) => x.status === 200 });
  } else if (r < 0.65) {
    const res = http.get(`${BASE_URL}/api/public/posts/${SLUG}`, {
      headers: getHeaders(), tags: { name: 'post_detail' },
    });
    check(res, { 'detail 200': (x) => x.status === 200 });
  } else if (r < 0.80) {
    const res = http.get(`${BASE_URL}/api/public/tags`, {
      headers: getHeaders(), tags: { name: 'tags' },
    });
    check(res, { 'tags 200': (x) => x.status === 200 });
  } else if (r < 0.92) {
    const res = http.get(`${BASE_URL}/api/public/search?q=test&page=1&limit=10`, {
      headers: getHeaders(), tags: { name: 'search' },
    });
    check(res, { 'search 200': (x) => x.status === 200 });
  } else {
    const res = http.get(`${BASE_URL}/api/public/stats`, {
      headers: getHeaders(), tags: { name: 'stats' },
    });
    check(res, { 'stats 200': (x) => x.status === 200 });
  }

  sleep(0.1);
}
