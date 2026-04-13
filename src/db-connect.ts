import { spawn } from "node:child_process";
import { promisify } from "node:util";

const SUPPORTED_PROTOCOLS = new Set([
  "postgres:",
  "postgresql:",
  "mysql:",
  "mariadb:",
  "mongodb:",
  "mongodb+srv:",
  "redis:",
  "rediss:",
  "mssql:",
  "sqlserver:",
  "sqlite:",
  "file:",
]);

export type ConnectionCandidate = {
  key: string;
  rawValue: string;
  normalizedUrl: string;
  displayLabel: string;
};

type OpenUrl = (url: string) => Promise<void>;

const finished = promisify((child: ReturnType<typeof spawn>, callback: (error: Error | null) => void) => {
  child.once("error", (error) => callback(error));
  child.once("exit", (code) => {
    if (code === 0) {
      callback(null);
      return;
    }

    callback(new Error(`TablePlus launcher exited with code ${code ?? "unknown"}.`));
  });
});

export function parseConnectionCandidates(envValues: Record<string, string | undefined>): ConnectionCandidate[] {
  return Object.entries(envValues)
    .flatMap(([key, rawValue]) => {
      const candidate = buildConnectionCandidate(key, rawValue);
      return candidate ? [candidate] : [];
    })
    .sort((left, right) => left.key.localeCompare(right.key));
}

export function buildConnectionCandidate(key: string, rawValue: string | undefined): ConnectionCandidate | null {
  if (!rawValue) {
    return null;
  }

  const trimmedValue = rawValue.trim();
  if (trimmedValue.length === 0) {
    return null;
  }

  let parsedUrl: URL;

  try {
    parsedUrl = new URL(trimmedValue);
  } catch {
    return null;
  }

  if (!SUPPORTED_PROTOCOLS.has(parsedUrl.protocol)) {
    return null;
  }

  return {
    key,
    rawValue: trimmedValue,
    normalizedUrl: parsedUrl.toString(),
    displayLabel: `${key} - ${formatConnectionTarget(parsedUrl)}`,
  };
}

export function formatConnectionTarget(url: URL): string {
  const scheme = url.protocol.slice(0, -1);

  if (scheme === "sqlite" || scheme === "file") {
    const filePath = decodeURIComponent(url.pathname || "/");
    return `${scheme}://${filePath}`;
  }

  const host = url.hostname || "localhost";
  const port = url.port ? `:${url.port}` : "";
  const database = sanitizeDatabaseName(url.pathname);

  return `${scheme}://${host}${port}${database ? `/${database}` : ""}`;
}

export async function openTablePlusConnections(
  connections: ConnectionCandidate[],
  openUrl: OpenUrl = openInTablePlus,
): Promise<void> {
  for (const connection of connections) {
    await openUrl(connection.normalizedUrl);
  }
}

export function openInTablePlus(url: string): Promise<void> {
  const child = spawn("open", ["-a", "TablePlus", url], {
    stdio: "ignore",
  });

  return finished(child);
}

function sanitizeDatabaseName(pathname: string): string {
  const trimmed = pathname.replace(/^\/+/, "");
  if (trimmed.length === 0) {
    return "";
  }

  return decodeURIComponent(trimmed);
}
