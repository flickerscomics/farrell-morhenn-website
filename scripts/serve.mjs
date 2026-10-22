// Serves the static export in ./out the way GitHub Pages does: under the
// base path, with directory index.html files and 404.html for missing pages.
//
//   PAGES_BASE_PATH=/built-different npm run build && PAGES_BASE_PATH=/built-different npm run preview

import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";

const root = path.resolve("out");
const base = (process.env.PAGES_BASE_PATH ?? "").replace(/\/+$/, "");
const port = Number(process.env.PORT ?? 3000);
const types = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml",
  ".json": "application/json", ".txt": "text/plain; charset=utf-8", ".xml": "application/xml", ".woff2": "font/woff2",
  ".woff": "font/woff", ".png": "image/png", ".jpg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon",
};

function resolveFile(urlPath) {
  const target = path.resolve(root, "." + decodeURIComponent(urlPath));
  if (!target.startsWith(root)) return null;
  if (existsSync(target) && statSync(target).isFile()) return target;
  if (existsSync(path.join(target, "index.html"))) return path.join(target, "index.html");
  if (existsSync(target + ".html")) return target + ".html";
  return null;
}

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  if (base && url.pathname === base) {
    res.writeHead(301, { Location: `${base}/` }).end();
    return;
  }
  const inside = !base || url.pathname.startsWith(`${base}/`);
  const file = inside ? resolveFile(url.pathname.slice(base.length) || "/") : null;
  if (file) {
    if (!url.pathname.endsWith("/") && file.endsWith("index.html")) {
      res.writeHead(301, { Location: `${url.pathname}/${url.search}` }).end();
      return;
    }
    res.writeHead(200, { "Content-Type": types[path.extname(file)] ?? "application/octet-stream" });
    createReadStream(file).pipe(res);
    return;
  }
  res.writeHead(404, { "Content-Type": types[".html"] });
  createReadStream(path.join(root, "404.html")).pipe(res);
}).listen(port, () => console.log(`Serving ./out at http://localhost:${port}${base}/`));
