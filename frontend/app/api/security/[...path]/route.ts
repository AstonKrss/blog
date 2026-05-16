import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Python 服务地址
const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;

  // 从 Cookie 获取 JWT token
  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    // 转发请求到 Python 后端
    const url = `${PYTHON_API}${pathname.replace('/api/security', '')}${search}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: '无法连接到 Python 服务' }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const body = await request.json();

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const url = `${PYTHON_API}${pathname.replace('/api/security', '')}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: '无法连接到 Python 服务' }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  const cookieStore = await cookies();
  const token = cookieStore.get('auth_token')?.value;

  if (!token) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }

  try {
    const url = `${PYTHON_API}${pathname.replace('/api/security', '')}`;
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('Proxy error:', error);
    return NextResponse.json({ error: '无法连接到 Python 服务' }, { status: 503 });
  }
}