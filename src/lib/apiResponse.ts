import { NextResponse } from 'next/server';

export function ok<T>(data: T, init?: { status?: number; cacheSeconds?: number }) {
  const res = NextResponse.json({ success: true, data }, { status: init?.status ?? 200 });
  if (init?.cacheSeconds) {
    res.headers.set(
      'Cache-Control',
      `public, s-maxage=${init.cacheSeconds}, stale-while-revalidate=${init.cacheSeconds * 24}`
    );
  }
  return res;
}

export function fail(message: string, status = 400, code?: string) {
  return NextResponse.json(
    { success: false, error: { message, code: code ?? null } },
    { status }
  );
}

export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status = 400, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/** Wraps a route handler so any thrown ApiError (or generic error) becomes a clean JSON response. */
export function withErrorHandling(
  handler: (req: Request, ctx: any) => Promise<NextResponse>
) {
  return async (req: Request, ctx: any) => {
    try {
      return await handler(req, ctx);
    } catch (err: any) {
      if (err instanceof ApiError) {
        return fail(err.message, err.status, err.code);
      }
      console.error('Unhandled API error:', err);
      return fail('Something went wrong. Please try again.', 500, 'INTERNAL_ERROR');
    }
  };
}
