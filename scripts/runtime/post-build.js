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

	// Durable uploads: keep files in project public/uploads and link into standalone.
	const uploadRoot = path.join(rootDir, "public", "uploads");
	const standaloneUploads = path.join(publicDest, "uploads");
	fs.mkdirSync(uploadRoot, { recursive: true });
	try {
		if (fs.existsSync(standaloneUploads)) {
			const st = fs.lstatSync(standaloneUploads);
			if (st.isSymbolicLink()) fs.unlinkSync(standaloneUploads);
			else if (st.isDirectory()) fs.rmSync(standaloneUploads, { recursive: true, force: true });
			else fs.unlinkSync(standaloneUploads);
		}
		const type = process.platform === "win32" ? "junction" : "dir";
		fs.symlinkSync(uploadRoot, standaloneUploads, type);
		console.log("[post-build] Linked standalone/public/uploads -> public/uploads");
	} catch (err) {
		console.warn("[post-build] Uploads link skipped:", err);
		fs.mkdirSync(standaloneUploads, { recursive: true });
	}

	// Ensure Prisma query engine is available in standalone runtime.
	const prismaClientSrc = path.join(rootDir, "node_modules", ".prisma", "client");
	const prismaClientDest = path.join(standaloneDir, "node_modules", ".prisma", "client");
	if (fs.existsSync(prismaClientSrc)) {
		console.log("[post-build] Copying Prisma client to standalone...");
		copyDir(prismaClientSrc, prismaClientDest);
	}

	const prismaPkgSrc = path.join(rootDir, "node_modules", "@prisma", "client");
	const prismaPkgDest = path.join(standaloneDir, "node_modules", "@prisma", "client");
	if (fs.existsSync(prismaPkgSrc)) {
		copyDir(prismaPkgSrc, prismaPkgDest);
	}

	console.log("[post-build] Done.");
} else {
	console.warn("[post-build] .next/standalone not found. Skipping asset copy.");
}
