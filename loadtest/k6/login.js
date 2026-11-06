// 阶段0 基线：登录接口（密码哈希校验 BCrypt 的成本在这里体现）
// 运行：k6 run -e BASE_URL=... -e TEST_USER=... -e TEST_PASS=... loadtest/k6/login.js
// 注意：登录失败会写 login_attempts 表并触发限流，请只用专用测试账号。
import http from 'k6/http';
import { check, sleep } from 'k6';
import { BASE_URL, jsonHeaders } from './common.js';

const USER = __ENV.TEST_USER;
const PASS = __ENV.TEST_PASS;

export const options = {
  vus: 5,
  duration: '1m',
  thresholds: { http_req_failed: ['rate<0.01'] },
};

export function setup() {
  if (!USER || !PASS) {
    throw new Error('请通过 -e TEST_USER=... -e TEST_PASS=... 提供专用测试账号');
  }
}

export default function () {
  const res = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: USER, password: PASS }),
    { headers: jsonHeaders(), tags: { name: 'login' } },
  );
  check(res, { 'login 200': (x) => x.status === 200 });
  sleep(0.5);
}
