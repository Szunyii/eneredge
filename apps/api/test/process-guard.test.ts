import { expect, test } from "bun:test";
import { join } from "node:path";

test("a rejection nobody handles is logged and the process keeps running", async () => {
  const child = Bun.spawn(
    [process.execPath, join(import.meta.dir, "fixtures", "rejects-without-a-handler.ts")],
    { stdout: "pipe", stderr: "pipe" },
  );
  const [exitCode, output, errors] = await Promise.all([
    child.exited,
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
  ]);

  expect(output).toContain("still running");
  expect(errors).toContain("nobody caught this");
  expect(exitCode).toBe(0);
});
