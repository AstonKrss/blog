import { NextRequest, NextResponse } from 'next/server';
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({ detail: '未授权' }, { status: 401 });
    }

    const pythonHost = process.env.PYTHON_API_URL || 'http://localhost:8000';
    const response = await fetch(`${pythonHost}/api/web/sqli/scan`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    console.error('SQLi scan proxy error:', error);
    return NextResponse.json({ detail: '代理请求失败' }, { status: 500 });
  }
}