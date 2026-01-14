(async () => {
  const { spawn } = await import("node:child_process");

  const port = process.env.PORT || process.env.port || "3000";

  const child = spawn(
    process.platform === "win32" ? "npx.cmd" : "npx",
    ["next", "start", "-p", String(port)],
    {
      stdio: "inherit",
      env: process.env,
    }
  );

  child.on("exit", (code) => {
    process.exit(code ?? 1);
  });
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
