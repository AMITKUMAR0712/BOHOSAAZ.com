const fs = require("node:fs");
const path = require("node:path");

function parseEnvFile(contents) {
	/** @type {Record<string, string>} */
	const out = {};
	const lines = String(contents).split(/\r?\n/);
	for (const rawLine of lines) {
		const line = rawLine.trim();
		if (!line || line.startsWith("#")) continue;

		const normalized = line.startsWith("export ") ? line.slice("export ".length).trim() : line;
		const eq = normalized.indexOf("=");
		if (eq <= 0) continue;

		const key = normalized.slice(0, eq).trim();
		let value = normalized.slice(eq + 1).trim();

		// Remove surrounding quotes
		if (
			(value.startsWith('"') && value.endsWith('"') && value.length >= 2) ||
			(value.startsWith("'") && value.endsWith("'") && value.length >= 2)
		) {
			value = value.slice(1, -1);
		}

		// Basic unescape for common sequences when quoted
		value = value.replace(/\\n/g, "\n").replace(/\\r/g, "\r").replace(/\\t/g, "\t");

		if (key && !(key in out)) out[key] = value;
	}
	return out;
}

function loadEnvFromFile(absPath) {
	try {
		if (!fs.existsSync(absPath)) return;
		const vars = parseEnvFile(fs.readFileSync(absPath, "utf8"));
		for (const [k, v] of Object.entries(vars)) {
			// Never overwrite real environment variables (cPanel UI vars should win)
			if (process.env[k] === undefined) process.env[k] = v;
		}
	} catch (err) {
		console.warn(`[server] Failed to load env file: ${absPath}`, err);
	}
}

// cPanel typically runs this file as the entrypoint.
// Default to production unless explicitly set.
process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.NEXT_TELEMETRY_DISABLED = process.env.NEXT_TELEMETRY_DISABLED || "1";

// Load env BEFORE chdir into .next/standalone (otherwise Next won't see project-root env files).
const rootDir = __dirname;
const envFile = process.env.NODE_ENV === "production" ? ".env.production" : ".env";
loadEnvFromFile(path.join(rootDir, envFile));

// Respect cPanel-provided PORT; fallback for local/manual runs.
if (!process.env.PORT && (process.env.port || process.env.Port)) {
	process.env.PORT = process.env.port || process.env.Port;
}
process.env.PORT = process.env.PORT || "3000";

function fatal(message, err) {
	console.error(`[server] ${message}`);
	if (err) console.error(err);
	process.exit(1);
}

process.on("uncaughtException", (err) => fatal("Uncaught exception", err));
process.on("unhandledRejection", (err) => fatal("Unhandled promise rejection", err));

const standaloneDir = path.join(rootDir, ".next", "standalone");
const standaloneServer = path.join(standaloneDir, "server.js");

if (!fs.existsSync(standaloneServer)) {
	fatal(
		"Missing .next/standalone/server.js. Run `npm run build` (or build on cPanel) before starting."
	);
}

// Keep uploads outside .next so rebuilds do not wipe product/brand images.
const uploadRoot = path.join(rootDir, "public", "uploads");
process.env.UPLOAD_ROOT = process.env.UPLOAD_ROOT || uploadRoot;
try {
	fs.mkdirSync(uploadRoot, { recursive: true });
} catch (err) {
	console.warn("[server] Failed to ensure upload root:", err);
}

function linkUploadsIntoStandalone() {
	const linkPath = path.join(standaloneDir, "public", "uploads");
	const publicDir = path.join(standaloneDir, "public");
	try {
		fs.mkdirSync(publicDir, { recursive: true });
		let existing = null;
		try {
			existing = fs.lstatSync(linkPath);
		} catch {
			existing = null;
		}
		if (existing) {
			if (existing.isSymbolicLink()) {
				fs.unlinkSync(linkPath);
			} else if (existing.isDirectory()) {
				// Prefer durable folder; remove empty/copied uploads dir so we can link.
				try {
					fs.rmSync(linkPath, { recursive: true, force: true });
				} catch (err) {
					console.warn("[server] Could not replace standalone uploads dir:", err);
					return;
				}
			} else {
				fs.unlinkSync(linkPath);
			}
		}
		const type = process.platform === "win32" ? "junction" : "dir";
		fs.symlinkSync(uploadRoot, linkPath, type);
		console.log(`[server] Linked uploads -> ${uploadRoot}`);
	} catch (err) {
		console.warn("[server] Uploads symlink skipped (API /api/files fallback still works):", err);
	}
}

linkUploadsIntoStandalone();

process.chdir(standaloneDir);
require(standaloneServer);
