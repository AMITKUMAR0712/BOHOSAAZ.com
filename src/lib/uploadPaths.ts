import path from "path";
import fs from "fs";

/**
 * Durable uploads live at <project>/public/uploads, not under .next/standalone.
 * server.js sets UPLOAD_ROOT before chdir into standalone.
 */
export function getUploadRoot() {
  const fromEnv = (process.env.UPLOAD_ROOT || "").trim();
  if (fromEnv) return path.resolve(fromEnv);

  const cwd = process.cwd();

  // Production standalone: cwd is .../.next/standalone → project root is ../..
  if (/[\\/]\.next[\\/]standalone$/i.test(cwd)) {
    return path.resolve(cwd, "..", "..", "public", "uploads");
  }

  // Walk up from cwd for project root.
  let dir = cwd;
  for (let i = 0; i < 6; i++) {
    const pkg = path.join(dir, "package.json");
    const publicDir = path.join(dir, "public");
    if (fs.existsSync(pkg) && fs.existsSync(publicDir) && !/[\\/]\.next[\\/]standalone$/i.test(dir)) {
      return path.join(dir, "public", "uploads");
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  return path.join(cwd, "public", "uploads");
}

export function resolveUploadFile(urlPath: string) {
  const clean = urlPath
    .replace(/^\/+/, "")
    .replace(/^uploads\/?/i, "")
    .replace(/^api\/files\/?/i, "");
  const segments = clean.split("/").filter(Boolean);
  if (!segments.length || segments.some((s) => s === "." || s === "..")) return null;

  const allowedRoots = [
    path.resolve(getUploadRoot()),
    path.resolve(process.cwd(), "public", "uploads"),
  ];

  const candidates = allowedRoots.map((root) => path.resolve(root, ...segments));

  for (const resolved of candidates) {
    const ok = allowedRoots.some((rootDir) => {
      const prefix = rootDir.toLowerCase() + path.sep;
      const file = resolved.toLowerCase();
      return file.startsWith(prefix) || file === rootDir.toLowerCase();
    });
    if (!ok) continue;
    if (fs.existsSync(resolved)) return resolved;
  }

  return path.resolve(getUploadRoot(), ...segments);
}
