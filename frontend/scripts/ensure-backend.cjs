const { spawn, spawnSync } = require("child_process");
const path = require("path");
const http = require("http");

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8010").replace(/\/$/, "");
const healthUrl = `${apiBase}/health`;

function checkHealth(timeoutMs = 1200) {
  return new Promise((resolve) => {
    const req = http.get(healthUrl, { timeout: timeoutMs }, (res) => {
      res.resume();
      resolve(res.statusCode === 200);
    });
    req.on("error", () => resolve(false));
    req.on("timeout", () => {
      req.destroy();
      resolve(false);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function tryStartBackend() {
  const backendDir = path.resolve(__dirname, "..", "..", "backend");
  const candidates = [];

  if (process.env.BACKEND_PYTHON && process.env.BACKEND_PYTHON.trim()) {
    candidates.push([process.env.BACKEND_PYTHON.trim(), []]);
  }

  candidates.push(["python", []]);
  candidates.push(["py", ["-3"]]);
  candidates.push(["py", []]);

  for (const [exe, prefix] of candidates) {
    const probe = spawnSync(exe, [...prefix, "--version"], { stdio: "ignore" });
    if (probe.error || probe.status !== 0) {
      continue;
    }

    try {
      const child = spawn(
        exe,
        [...prefix, "-m", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", "8010"],
        {
          cwd: backendDir,
          detached: true,
          stdio: "ignore",
        }
      );
      child.unref();
      return true;
    } catch {
      // try next candidate
    }
  }

  return false;
}

async function main() {
  if (await checkHealth()) {
    return;
  }

  const started = tryStartBackend();
  if (!started) {
    console.error("[sync] Could not start backend automatically. Start backend on http://127.0.0.1:8010.");
    process.exit(1);
  }

  for (let i = 0; i < 20; i += 1) {
    await sleep(700);
    if (await checkHealth()) {
      console.log("[sync] Backend started on :8010");
      return;
    }
  }

  console.error("[sync] Backend did not become healthy in time. Check backend logs.");
  process.exit(1);
}

main();
