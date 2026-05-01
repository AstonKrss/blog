/**
 * Token 管理工具
 * 优先从 cookie 获取 token（httpOnly，由后端设置）
 * 备用从 sessionStorage 获取（登录时后端通过 header 返回）
 */

const TOKEN_COOKIE_NAME = 'auth_token';

/**
 * 从 cookie 或 sessionStorage 获取 token
 */
export function getToken(): string | null {
  if (typeof document === 'undefined') return null;

  // 1. 优先从 cookie 获取（httpOnly，更安全）
  const cookieMatch = document.cookie
    .split('; ')
    .find(row => row.startsWith(`${TOKEN_COOKIE_NAME}=`));
  if (cookieMatch) {
    return cookieMatch.split('=')[1];
  }

  // 2. 备用：从 sessionStorage 获取（登录时后端通过 header 返回）
  return sessionStorage.getItem(TOKEN_COOKIE_NAME);
}

/**
 * 清除 token
 */
export function clearToken(): void {
  if (typeof document === 'undefined') return;
  // 清除 cookie
  document.cookie = `${TOKEN_COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=localhost`;
  // 清除 sessionStorage
  sessionStorage.removeItem(TOKEN_COOKIE_NAME);
}