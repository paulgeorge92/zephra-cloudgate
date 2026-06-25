import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const REQUEST_TIMEOUT_MS = 5000;

function isHttpUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://');
}

export async function POST(request: Request) {
  const { url } = await request.json().catch(() => ({ url: '' }));

  if (!url || typeof url !== 'string') {
    return NextResponse.json({ status: 'UNKNOWN', message: 'Destination URL is missing' }, { status: 400 });
  }

  if (!isHttpUrl(url)) {
    return NextResponse.json({
      status: 'UNSUPPORTED',
      message: 'Health checks are only available for HTTP and HTTPS destinations',
    });
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      method: 'GET',
      cache: 'no-store',
      redirect: 'manual',
      signal: controller.signal,
    });

    return NextResponse.json({
      status: response.ok ? 'ONLINE' : 'OFFLINE',
      statusCode: response.status,
      message: response.ok ? 'Destination responded successfully' : `Destination returned ${response.status}`,
      checkedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error && error.name === 'AbortError'
      ? 'Destination did not respond before the timeout'
      : 'Destination did not respond';

    return NextResponse.json({
      status: 'OFFLINE',
      message,
      checkedAt: new Date().toISOString(),
    });
  } finally {
    clearTimeout(timeout);
  }
}
