/**
 * A thin layer over Bun's built-in headless browser (Bun.WebView), shaped for how
 * the tests read: fields are found by their label, buttons and links by their
 * visible name — the same way a person finds them.
 */
import { mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const baseUrl = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const DEFAULT_TIMEOUT_MS = 5000;
const POLL_INTERVAL_MS = 100;

export type Viewport = { width: number; height: number };

export const DESKTOP: Viewport = { width: 1280, height: 900 };
/** A common phone, upright. */
export const PHONE: Viewport = { width: 390, height: 844 };

export type Page = {
  /** Loads an address of the app, given as a path (`/sign-in`). */
  goto(path: string): Promise<void>;
  /** The current path with its query string. Read from the page, so it follows client-side navigation. */
  path(): Promise<string>;
  /** Replaces the content of the field with this label. */
  fill(label: string, value: string): Promise<void>;
  /** Clicks the button or link with this visible name. */
  click(name: string): Promise<void>;
  /** Whether this text is visible right now. */
  has(text: string): Promise<boolean>;
  /** Waits until the text is visible; throws when it does not show up in time. */
  waitForText(text: string, timeoutMs?: number): Promise<void>;
  /** Waits until the path (with query string) matches. */
  waitForPath(pattern: RegExp, timeoutMs?: number): Promise<void>;
  fieldValue(label: string): Promise<string>;
  /** The error message attached to the field right now (through aria-describedby), or null. */
  errorUnder(label: string): Promise<string | null>;
  /** Waits until the field shows an error and returns its text. */
  waitForErrorUnder(label: string, timeoutMs?: number): Promise<string>;
  screenshot(file: string): Promise<void>;
  close(): void;
};

/**
 * A new person sits down at a fresh browser: nobody is signed in.
 *
 * Whoever used an earlier page is gone from then on. Chrome keeps one cookie jar
 * for all of its views, so opening a page empties it; a scenario therefore plays
 * its people one after the other and never returns to an earlier page.
 */
export async function openPage(viewport: Viewport = DESKTOP): Promise<Page> {
  const backend = browserBackend();
  const view = new Bun.WebView({ ...viewport, backend });
  if (backend !== "webkit") {
    // Chrome's protocol is available once the view has loaded something.
    await view.navigate("about:blank");
    await view.cdp("Storage.clearCookies");
  }
  let targetCounter = 0;

  /** Runs an expression in the page with the lookup functions below in scope. */
  function inPage<Result>(expression: string): Promise<Result> {
    return view.evaluate(
      `(() => { ${PAGE_FUNCTIONS} return (${expression}); })()`,
    ) as Promise<Result>;
  }

  /** Polls until `check` is true. A page in the middle of loading simply counts as "not yet". */
  async function waitUntil(description: string, timeoutMs: number, check: () => Promise<boolean>) {
    const deadline = Date.now() + timeoutMs;
    while (true) {
      const reached = await check().catch(() => false);
      if (reached) return;
      if (Date.now() >= deadline) throw new Error(await describeFailure(description));
      await Bun.sleep(POLL_INTERVAL_MS);
    }
  }

  async function describeFailure(description: string): Promise<string> {
    const where = await currentPath().catch(() => "(unknown)");
    const visibleText = await inPage<string>("document.body.innerText.slice(0, 600)").catch(
      () => "",
    );
    const directory = join(tmpdir(), "eneredge-e2e-failures");
    const file = join(directory, `${Date.now()}.png`);
    await mkdir(directory, { recursive: true });
    await Bun.write(file, await view.screenshot()).catch(() => undefined);
    return `Timed out waiting for ${description}.\n  at: ${where}\n  screenshot: ${file}\n  visible text: ${visibleText.replace(/\s+/g, " ")}`;
  }

  /**
   * Finds an element with one of the page functions, marks it, and returns a CSS
   * selector for it: the browser's native click and typing take selectors.
   */
  async function locate(lookup: string, description: string): Promise<string> {
    const token = `target-${++targetCounter}`;
    await waitUntil(description, DEFAULT_TIMEOUT_MS, () =>
      inPage<boolean>(
        `(() => { const element = ${lookup}; if (!element) return false; element.setAttribute("data-e2e", ${JSON.stringify(token)}); return true; })()`,
      ),
    );
    return `[data-e2e="${token}"]`;
  }

  function currentPath(): Promise<string> {
    return inPage<string>("location.pathname + location.search");
  }

  const field = (label: string) => `field(${JSON.stringify(label)})`;

  function has(text: string): Promise<boolean> {
    return inPage<boolean>(`document.body.innerText.includes(${JSON.stringify(text)})`);
  }

  return {
    async goto(path) {
      await view.navigate(new URL(path, baseUrl).toString());
    },

    path: currentPath,

    async fill(label, value) {
      const selector = await locate(field(label), `the field "${label}"`);
      await view.scrollTo(selector);
      await view.click(selector);
      // Select what is there, so typing replaces it.
      await view.evaluate(`document.querySelector(${JSON.stringify(selector)}).select()`);
      if (value === "") await view.press("Backspace");
      else await view.type(value);
    },

    async click(name) {
      const selector = await locate(
        `pressable(${JSON.stringify(name)})`,
        `the button or link "${name}"`,
      );
      await view.scrollTo(selector);
      await view.click(selector);
    },

    has,

    async waitForText(text, timeoutMs = DEFAULT_TIMEOUT_MS) {
      await waitUntil(`the text "${text}"`, timeoutMs, () => has(text));
    },

    async waitForPath(pattern, timeoutMs = DEFAULT_TIMEOUT_MS) {
      await waitUntil(`the address to match ${pattern}`, timeoutMs, async () =>
        pattern.test(await currentPath()),
      );
    },

    async fieldValue(label) {
      const selector = await locate(field(label), `the field "${label}"`);
      return (await view.evaluate(
        `document.querySelector(${JSON.stringify(selector)}).value`,
      )) as string;
    },

    async errorUnder(label) {
      await locate(field(label), `the field "${label}"`);
      return inPage<string | null>(`errorOf(${field(label)})`);
    },

    async waitForErrorUnder(label, timeoutMs = DEFAULT_TIMEOUT_MS) {
      let error: string | null = null;
      await waitUntil(`an error under the field "${label}"`, timeoutMs, async () => {
        error = await inPage<string | null>(`errorOf(${field(label)})`);
        return error !== null;
      });
      return error ?? "";
    },

    async screenshot(file) {
      await Bun.write(file, await view.screenshot());
    },

    close() {
      view.close();
    },
  };
}

/**
 * An installed Chrome, the same as on CI: always a fresh headless one, never a
 * browser the developer happens to have open. On macOS, E2E_BROWSER=webkit uses
 * the system's WebKit instead (quicker to start, nothing to install).
 */
function browserBackend(): "webkit" | { type: "chrome"; url: false } {
  const useWebKit = process.platform === "darwin" && process.env.E2E_BROWSER === "webkit";
  return useWebKit ? "webkit" : { type: "chrome", url: false };
}

/**
 * Functions that run inside the page. An element only counts once React has
 * attached to it: clicking a button before that would bypass its handler.
 */
const PAGE_FUNCTIONS = `
  const isVisible = (element) => element.getClientRects().length > 0;
  const nameOf = (element) =>
    (element.getAttribute("aria-label") ?? element.innerText ?? "").trim().replace(/\\s+/g, " ");
  const isInteractive = (element) =>
    Object.keys(element).some((key) => key.startsWith("__reactProps$"));

  function field(label) {
    const labelElement = [...document.querySelectorAll("label")].find(
      (candidate) => isVisible(candidate) && nameOf(candidate) === label,
    );
    const control = labelElement?.control ?? null;
    return control && isInteractive(control) ? control : null;
  }

  function pressable(name) {
    const candidates = document.querySelectorAll(
      "button, a, [role=button], [role=menuitem], [role=tab], summary",
    );
    const found = [...candidates].find(
      (candidate) => isVisible(candidate) && nameOf(candidate) === name,
    );
    // A plain link works without React; everything else needs its handler.
    return found && (found.tagName === "A" || isInteractive(found)) ? found : null;
  }

  function errorOf(control) {
    const describedBy = (control?.getAttribute("aria-describedby") ?? "").split(" ");
    const errorElement = describedBy
      .map((id) => document.getElementById(id))
      .find((element) => element?.dataset.slot === "field-error");
    return errorElement ? errorElement.innerText.trim() : null;
  }
`;
