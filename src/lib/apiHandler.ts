import { NextRequest, NextResponse } from "next/server";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type RouteHandler = (req: NextRequest, ctx?: any) => Promise<NextResponse | Response>;

export function withErrorHandler(handler: RouteHandler): RouteHandler {
  return async (req, ctx) => {
    try {
      return await handler(req, ctx);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Internal server error";
      console.error(`[api] unhandled error on ${req.method} ${req.nextUrl.pathname}:`, err);
      return NextResponse.json({ error: message }, { status: 500 });
    }
  };
}
