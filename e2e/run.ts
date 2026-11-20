/**
 * Brings the whole system up for the end-to-end tests and runs them:
 * a throwaway database, the backend and the built frontend, then `bun test` on e2e/*.e2e.ts.
 *
 *   bun run e2e                 every test file
 *   bun run e2e auth            only files whose name contains "auth"
 *   E2E_SKIP_BUILD=1 bun run e2e   reuse the last frontend build (when only tests changed)
 */
import { mkdtemp, rm } from "node:fs/promises";
import { connect } from "node:net";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createTestDatabase } from "@eneredge/db/testing";

const root = join(import.meta.dir, "..");
const backendDir = join(root, "apps/backend");
const frontendDir = join(root, "apps/frontend");

const FRONTEND_PORT = 3100;
const BACKEND_PORT = 3101;
const baseUrl = `http://localhost:${FRONTEND_PORT}`;
const backendUrl = `http://localhost:${BACKEND_PORT}`;
/** The one address that is a platform admin in the system under test. */
const ADMIN_EMAIL = "admin@e2e.eneredge.test";

const bun = process.execPath;
// Children get only what they need, so nothing from a developer's .env leaks into the run.
const cleanEnv = {
  PATH: process.env.PATH ?? "",
  HOME: process.env.HOME ?? "",
  TMPDIR: process.env.TMPDIR ?? tmpdir(),
  NEXT_TELEMETRY_DISABLED: "1",
};

type Child = { name: string; subprocess: Bun.Subprocess; logFile: string };

async function main(): Promise<number> {
  const files = await testFiles(process.argv.slice(2));
  if (files.length === 0) {
    console.error("No e2e test file matches.");
    return 1;
  }
  for (const port of [FRONTEND_PORT, BACKEND_PORT]) {
    if (await isListening(port)) {
      console.error(`Port ${port} is in use. Stop whatever listens there and run again.`);
      return 1;
    }
  }

  const workDir = await mkdtemp(join(tmpdir(), "eneredge-e2e-"));
  const mailFile = join(workDir, "mail.jsonl");
  const database = await createTestDatabase();
  const children: Child[] = [];

  try {
    if (process.env.E2E_SKIP_BUILD !== "1") {
      console.log("Building the frontend…");
      const build = Bun.spawn([bun, "--bun", "next", "build"], {
        cwd: frontendDir,
        env: cleanEnv,
        stdout: Bun.file(join(workDir, "build.log")),
        stderr: Bun.file(join(workDir, "build.log")),
      });
      if ((await build.exited) !== 0) {
        console.error(await Bun.file(join(workDir, "build.log")).text());
        return 1;
      }
    }

    children.push(
      start("backend", workDir, [bun, "src/index.ts"], backendDir, {
        ...cleanEnv,
        NODE_ENV: "test",
        PORT: String(BACKEND_PORT),
        APP_URL: baseUrl,
        DATABASE_URL: database.url,
        AUTH_SECRET: "e2e-secret-that-is-long-enough-0123456789",
        MAIL_TRANSPORT: "file",
        MAIL_FILE: mailFile,
        MAIL_FROM: "EnerEdge <no-reply@e2e.eneredge.test>",
        PLATFORM_ADMIN_EMAILS: ADMIN_EMAIL,
        SIGNUP_MODE: "open",
      }),
      start(
        "frontend",
        workDir,
        [bun, "--bun", "next", "start", "-p", String(FRONTEND_PORT)],
        frontendDir,
        {
          ...cleanEnv,
          API_ORIGIN: backendUrl,
        },
      ),
    );

    // One request proves the frontend, its /api forwarding, the backend and the database.
    if (!(await waitForHealth(children))) {
      for (const child of children) {
        console.error(`--- ${child.name} ---\n${await tail(child.logFile)}`);
      }
      return 1;
    }

    const tests = Bun.spawn([bun, "test", "--timeout", "30000", ...files], {
      cwd: root,
      env: {
        ...process.env,
        E2E_BASE_URL: baseUrl,
        E2E_MAIL_FILE: mailFile,
        E2E_ADMIN_EMAIL: ADMIN_EMAIL,
      },
      stdout: "inherit",
      stderr: "inherit",
    });
    const code = await tests.exited;
    if (code !== 0) {
      for (const child of children) {
        console.error(`--- ${child.name} (last lines) ---\n${await tail(child.logFile)}`);
      }
    }
    return code;
  } finally {
    await Promise.all(children.map(stop));
    await database.close();
    await rm(workDir, { recursive: true, force: true });
  }
}

async function testFiles(filters: string[]): Promise<string[]> {
  const found = await Array.fromAsync(new Bun.Glob("*.e2e.ts").scan({ cwd: import.meta.dir }));
  return found
    .filter((name) => filters.length === 0 || filters.some((filter) => name.includes(filter)))
    .sort()
    .map((name) => `./e2e/${name}`);
}

function start(
  name: string,
  workDir: string,
  command: string[],
  cwd: string,
  env: Record<string, string>,
): Child {
  const logFile = join(workDir, `${name}.log`);
  const subprocess = Bun.spawn(command, {
    cwd,
    env,
    stdout: Bun.file(logFile),
    stderr: Bun.file(logFile),
  });
  return { name, subprocess, logFile };
}

async function stop(child: Child): Promise<void> {
  child.subprocess.kill();
  const killed = setTimeout(() => child.subprocess.kill("SIGKILL"), 5000);
  await child.subprocess.exited;
  clearTimeout(killed);
}

async function waitForHealth(children: Child[]): Promise<boolean> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    const dead = children.find((child) => child.subprocess.exitCode !== null);
    if (dead) {
      console.error(`The ${dead.name} process exited before the system came up.`);
      return false;
    }
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return true;
    } catch {
      // not listening yet
    }
    await Bun.sleep(250);
  }
  console.error(`The system did not answer on ${baseUrl}/api/health within 60 s.`);
  return false;
}

function isListening(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = connect({ port, host: "127.0.0.1" });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

async function tail(file: string, lines = 40): Promise<string> {
  const text = await Bun.file(file)
    .text()
    .catch(() => "");
  return text.trimEnd().split("\n").slice(-lines).join("\n");
}

const exitCode = await main();
process.exit(exitCode);
