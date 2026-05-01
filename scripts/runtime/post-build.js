const fs = require("node:fs");
const path = require("node:path");

function copyDir(src, dest) {
	if (!fs.existsSync(src)) return;
	fs.mkdirSync(dest, { recursive: true });
	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			fs.copyFileSync(srcPath, destPath);
		}
	}
}

const rootDir = path.join(__dirname, "..", "..");
const standaloneDir = path.join(rootDir, ".next", "standalone");

if (fs.existsSync(standaloneDir)) {
	console.log("[post-build] Copying static assets to standalone folder...");
	
	// Copy .next/static to .next/standalone/.next/static
	const staticSrc = path.join(rootDir, ".next", "static");
	const staticDest = path.join(standaloneDir, ".next", "static");
	copyDir(staticSrc, staticDest);

	// Copy public to .next/standalone/public
	const publicSrc = path.join(rootDir, "public");
	const publicDest = path.join(standaloneDir, "public");
	copyDir(publicSrc, publicDest);

	console.log("[post-build] Done.");
} else {
	console.warn("[post-build] .next/standalone not found. Skipping asset copy.");
}
