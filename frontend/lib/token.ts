/**
 * Token 管理工具
 * 统一管理从 httpOnly cookie 获取 token，避免 localStorage XSS 风险
 */

const TOKEN_COOKIE_NAME = 'auth_token';

/**
 * 从 cookie 获取 token
 */
export function getToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${TOKEN_COOKIE_NAME}=`));
  return match ? match.split('=')[1] : null;
}

/**
 * 清除 token cookie
 */
export function clearToken(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
}