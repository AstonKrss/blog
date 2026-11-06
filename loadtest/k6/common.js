// 公共配置与工具函数。环境变量统一从 __ENV 读取，禁止把密码/令牌写进仓库。
export const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
// 压测专用标识：每次请求带上 X-Request-Id，便于在后端日志中按 traceId 检索
export function requestId(prefix) {
  return `${prefix}-${__VU}-${__ITER}-${Date.now()}`;
}
export function jsonHeaders(extra = {}) {
  return Object.assign({ 'Content-Type': 'application/json', 'X-Request-Id': requestId('k6') }, extra);
}
export function getHeaders(extra = {}) {
  return Object.assign({ 'X-Request-Id': requestId('k6') }, extra);
}
