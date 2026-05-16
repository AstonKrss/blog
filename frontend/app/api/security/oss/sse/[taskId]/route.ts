import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

const PYTHON_API = process.env.PYTHON_API_URL || 'http://localhost:8000';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ taskId: string }> }
) {
  const { taskId } = await params;
  const cookieStore = await cookies();
  const token = cookieStore.get('blog_token')?.value;

  if (!token) {
    return new Response('未登录', { status: 401 });
  }

  try {
    // 转发 SSE 请求到 Python 后端
    const response = await fetch(`${PYTHON_API}/api/oss/sse/${taskId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // 获取 SSE 流并直接转发
    const reader = response.body?.getReader();
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        if (!reader) {
          controller.close();
          return;
        }

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          controller.close();
        }
      }
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });
  } catch (error) {
    console.error('SSE proxy error:', error);
    return new Response('无法连接到 Python 服务', { status: 503 });
  }
}