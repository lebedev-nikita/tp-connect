import { spawn } from "node:child_process";
import { promisify } from "node:util";

const VARIABLE_REFERENCE_PATTERN = /\$([A-Za-z_][A-Za-z0-9_]*)|\$\{([A-Za-z_][A-Za-z0-9_]*)\}/g;
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

export class EnvExpansionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvExpansionError";
  }
}

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

export function expandEnvVariables(envValues: Record<string, string | undefined>): Record<string, string> {
  const resolvedValues = new Map<string, string>();
  const resolutionStack: string[] = [];

  for (const key of Object.keys(envValues)) {
    resolveValue(key);
  }

  return Object.fromEntries(resolvedValues.entries());

  function resolveValue(key: string): string {
    const cachedValue = resolvedValues.get(key);
    if (cachedValue !== undefined) {
      return cachedValue;
    }

    if (resolutionStack.includes(key)) {
      const cycleStartIndex = resolutionStack.indexOf(key);
      const cycle = [...resolutionStack.slice(cycleStartIndex), key].join(" -> ");
      throw new EnvExpansionError(`Cyclic .env variable reference detected: ${cycle}`);
    }

    resolutionStack.push(key);

    const rawValue = envValues[key] ?? "";
    const expandedValue = rawValue.replaceAll(VARIABLE_REFERENCE_PATTERN, (_match, bareName, bracketedName) => {
      const referenceName = bareName ?? bracketedName;
      if (!referenceName || !(referenceName in envValues)) {
        return "";
      }

      return resolveValue(referenceName);
    });

    resolutionStack.pop();
    resolvedValues.set(key, expandedValue);
    return expandedValue;
  }
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
