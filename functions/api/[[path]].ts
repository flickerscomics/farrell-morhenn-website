// Cloudflare Pages Functions entry point for /api/*. The admin API itself is
// in src/server/api.ts.

import { handle } from "../../src/server/api";
import type { Env } from "../../src/server/http";

export const onRequest = (context: { request: Request; env: Env }) => handle(context.request, context.env);
