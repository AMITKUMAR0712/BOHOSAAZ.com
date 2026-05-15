(async () => {
  const skip = String(process.env.SKIP_PRISMA_GENERATE || "").toLowerCase();
  if (skip === "1" || skip === "true" || skip === "yes") {
    process.exit(0);
  }

  const { spawnSync } = await import("node:child_process");

  function runOnce() {
    const cmd = "npx";
    const result = spawnSync(cmd, ["prisma", "generate"], {
      stdio: "inherit",
      shell: process.platform === "win32",
    });

    if (result.error) {
      console.warn(
        `[prisma-generate] Spawn failed: ${result.error.code || "ERROR"}: ${result.error.message}`
      );
      return false;
    }

    return result.status === 0;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  const attempts = 4;
  for (let i = 1; i <= attempts; i++) {
    const ok = runOnce();
    if (ok) process.exit(0);

    if (i < attempts) {
      console.warn(`[prisma-generate] Failed (attempt ${i}/${attempts}). Retrying...`);
      await sleep(750 * i);
    }
  }

  console.error(
    "[prisma-generate] Failed after retries.\n" +
      "If you're on Windows and see EPERM rename errors, close running Node/Next processes and add an antivirus/Defender exclusion for this project folder."
  );
  process.exit(1);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
