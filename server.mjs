import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number(process.env.PORT || 4173);

const types = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

function resolvePath(urlPath) {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = normalize(clean).replace(/^(\.\.[/\\])+/, "");
  const target = normalized === "/" ? "/index.html" : normalized;
  return join(root, target);
}

const server = createServer((req, res) => {
  const filePath = resolvePath(req.url || "/");
  const fallback = join(root, "index.html");
  const target = existsSync(filePath) && statSync(filePath).isFile() ? filePath : fallback;
  res.writeHead(200, {
    "Content-Type": types[extname(target)] || "application/octet-stream",
    "Cache-Control": "no-store",
  });
  createReadStream(target).pipe(res);
});

server.listen(port, "0.0.0.0", () => {
  console.log(`墨衡系统已启动: http://localhost:${port}`);
});
