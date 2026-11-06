// 阶段0 基线：留言（写路径，会真实入库）
// 默认不执行，必须显式开启：-e ENABLE_WRITE=1
// 运行后请清理：DELETE FROM guestbook WHERE nickname LIKE 'k6-%';
// 说明：留言接口已加 Redis 限流（10 分钟 5 次/IP），压测时大部分请求会得到 429，
//       这是预期行为；基线记录的是“限流后的响应耗时”，不是“写入吞吐”。
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import { BASE_URL, jsonHeaders } from './common.js';

const okRate = new Rate('guestbook_ok');
const limitedRate = new Rate('guestbook_limited');

export const options = {
  vus: 2,
  duration: '30s',
  thresholds: {},
  // 429 是限流预期结果；用自定义 Rate 统计，不把 http_req_failed 当业务失败
  responseCallback: http.expectedStatuses(200, 429),
};

export function setup() {
  if (__ENV.ENABLE_WRITE !== '1') {
    throw new Error('写路径默认关闭。确认要写入测试数据后，加 -e ENABLE_WRITE=1');
  }
}

export default function () {
  const body = JSON.stringify({
    nickname: `k6-${__VU}-${__ITER}`,
    content: 'k6 baseline write path',
    contact: '',
  });
  const res = http.post(`${BASE_URL}/api/guestbook`, body, {
    headers: jsonHeaders(), tags: { name: 'guestbook_write' },
  });
  // 200 = 写入成功；429 = 被限流（预期内）
  okRate.add(res.status === 200);
  limitedRate.add(res.status === 429);
  check(res, { 'guestbook 200|429': (x) => x.status === 200 || x.status === 429 });
  sleep(1);
}


