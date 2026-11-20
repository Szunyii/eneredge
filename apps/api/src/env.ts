export type Env = {
  NODE_ENV: "development" | "test" | "production";
  PORT: number;
  APP_URL: string;
  DATABASE_URL: string;
  AUTH_SECRET: string;
  MAIL_TRANSPORT: "log" | "file" | "smtp";
  MAIL_FROM: string;
  MAIL_FILE?: string;
  SMTP_HOST?: string;
  SMTP_PORT?: number;
  SMTP_USER?: string;
  SMTP_PASSWORD?: string;
  SMTP_SECURE?: boolean;
  /** Lower-cased, without surrounding spaces. */
  PLATFORM_ADMIN_EMAILS: string[];
  SIGNUP_MODE: "open" | "allowlist";
};

type Source = Record<string, string | undefined>;

/**
 * Reads and validates the configuration. An empty value counts as unset.
 * Throws one error that lists every problem, so a broken deployment is fixed in one go.
 */
export function loadEnv(source: Source = process.env): Env {
  const problems: string[] = [];

  const read = (name: string): string | undefined => {
    const value = source[name]?.trim();
    return value ? value : undefined;
  };
  const oneOf = <T extends string>(name: string, allowed: readonly T[], fallback: T): T => {
    const value = read(name);
    if (value === undefined) return fallback;
    if ((allowed as readonly string[]).includes(value)) return value as T;
    problems.push(`${name} must be one of: ${allowed.join(", ")}`);
    return fallback;
  };
  const integer = (name: string, min: number, max: number): number | undefined => {
    const value = read(name);
    if (value === undefined) return undefined;
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= min && parsed <= max) return parsed;
    problems.push(`${name} must be a whole number between ${min} and ${max}`);
    return undefined;
  };

  const flag = (name: string): boolean | undefined => {
    const value = read(name)?.toLowerCase();
    if (value === undefined) return undefined;
    if (value === "true" || value === "1") return true;
    if (value === "false" || value === "0") return false;
    problems.push(`${name} must be true or false`);
    return undefined;
  };

  const NODE_ENV = oneOf("NODE_ENV", ["development", "test", "production"] as const, "development");
  const PORT = integer("PORT", 0, 65535) ?? 3000;

  let APP_URL = "http://localhost:3000";
  const appUrl = read("APP_URL");
  if (appUrl !== undefined) {
    const parsed = URL.canParse(appUrl) ? new URL(appUrl) : null;
    if (!parsed || (parsed.protocol !== "http:" && parsed.protocol !== "https:")) {
      problems.push("APP_URL must be an http(s) URL, for example https://app.example.com");
    } else {
      APP_URL = parsed.origin;
    }
  }
  if (NODE_ENV === "production" && !APP_URL.startsWith("https://")) {
    problems.push("APP_URL must use https in production");
  }

  const DATABASE_URL = read("DATABASE_URL") ?? "";
  if (!/^postgres(ql)?:\/\//.test(DATABASE_URL)) {
    problems.push("DATABASE_URL must be a postgres:// connection string");
  }

  const AUTH_SECRET = read("AUTH_SECRET") ?? "";
  if (AUTH_SECRET.length < 32) {
    problems.push("AUTH_SECRET must be at least 32 characters (openssl rand -base64 32)");
  }

  const MAIL_TRANSPORT = oneOf("MAIL_TRANSPORT", ["log", "file", "smtp"] as const, "log");
  if (NODE_ENV === "production" && MAIL_TRANSPORT !== "smtp") {
    problems.push("MAIL_TRANSPORT must be smtp in production");
  }
  const MAIL_FROM = read("MAIL_FROM") ?? "EnerEdge <no-reply@eneredge.tech>";
  const MAIL_FILE = read("MAIL_FILE");
  if (MAIL_TRANSPORT === "file" && MAIL_FILE === undefined) {
    problems.push("MAIL_FILE is required when MAIL_TRANSPORT is file");
  }

  const SMTP_HOST = read("SMTP_HOST");
  const SMTP_PORT = integer("SMTP_PORT", 1, 65535);
  const SMTP_USER = read("SMTP_USER");
  const SMTP_PASSWORD = read("SMTP_PASSWORD");
  if (MAIL_TRANSPORT === "smtp") {
    const missing = Object.entries({ SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD })
      .filter(([, value]) => value === undefined)
      .map(([name]) => name);
    if (missing.length > 0) {
      problems.push(`${missing.join(", ")} required when MAIL_TRANSPORT is smtp`);
    }
  }
  // Port 465 is implicit TLS; every other port upgrades with STARTTLS.
  const SMTP_SECURE =
    flag("SMTP_SECURE") ?? (SMTP_PORT === undefined ? undefined : SMTP_PORT === 465);

  const PLATFORM_ADMIN_EMAILS = (read("PLATFORM_ADMIN_EMAILS") ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email !== "");

  const SIGNUP_MODE = oneOf("SIGNUP_MODE", ["open", "allowlist"] as const, "open");

  if (problems.length > 0) {
    throw new Error(
      `Invalid environment:\n${problems.map((problem) => `- ${problem}`).join("\n")}`,
    );
  }

  return {
    NODE_ENV,
    PORT,
    APP_URL,
    DATABASE_URL,
    AUTH_SECRET,
    MAIL_TRANSPORT,
    MAIL_FROM,
    MAIL_FILE,
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASSWORD,
    SMTP_SECURE,
    PLATFORM_ADMIN_EMAILS,
    SIGNUP_MODE,
  };
}
