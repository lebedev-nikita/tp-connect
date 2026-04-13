import { describe, expect, it } from "vitest";
import {
  buildConnectionCandidate,
  formatConnectionTarget,
  openTablePlusConnections,
  parseConnectionCandidates,
  type ConnectionCandidate,
} from "../src/db-connect.js";

describe("parseConnectionCandidates", () => {
  it("detects supported database URLs and sorts them by env key", () => {
    const connections = parseConnectionCandidates({
      Z_REPORTING_URL: "mongodb://reporter:secret@localhost:27017/reporting",
      DATABASE_URL: "postgresql://postgres:secret@db.internal:5432/app",
      PLAIN_TEXT: "hello",
      EMPTY_VALUE: "",
    });

    expect(connections.map((connection: ConnectionCandidate) => connection.key)).toEqual([
      "DATABASE_URL",
      "Z_REPORTING_URL",
    ]);

    expect(connections.map((connection: ConnectionCandidate) => connection.displayLabel)).toEqual([
      "DATABASE_URL - postgresql://db.internal:5432/app",
      "Z_REPORTING_URL - mongodb://localhost:27017/reporting",
    ]);
  });
});

describe("buildConnectionCandidate", () => {
  it("ignores unsupported or invalid values", () => {
    expect(buildConnectionCandidate("API_KEY", "not-a-url")).toBeNull();
    expect(buildConnectionCandidate("SEARCH_URL", "https://example.com")).toBeNull();
  });
});

describe("formatConnectionTarget", () => {
  it("omits credentials while preserving host, port, and database", () => {
    const url = new URL("postgresql://user:password@db.internal:5432/app");
    expect(formatConnectionTarget(url)).toBe("postgresql://db.internal:5432/app");
  });

  it("formats sqlite paths without credentials", () => {
    const url = new URL("sqlite:///tmp/local-dev.sqlite");
    expect(formatConnectionTarget(url)).toBe("sqlite:///tmp/local-dev.sqlite");
  });
});

describe("openTablePlusConnections", () => {
  it("opens every selected connection in order", async () => {
    const openedUrls: string[] = [];
    const candidates: ConnectionCandidate[] = [
      {
        key: "DATABASE_URL",
        rawValue: "postgresql://postgres:secret@db.internal:5432/app",
        normalizedUrl: "postgresql://postgres:secret@db.internal:5432/app",
        displayLabel: "DATABASE_URL - postgresql://db.internal:5432/app",
      },
      {
        key: "CACHE_URL",
        rawValue: "redis://cache.internal:6379/0",
        normalizedUrl: "redis://cache.internal:6379/0",
        displayLabel: "CACHE_URL - redis://cache.internal:6379/0",
      },
    ];

    await openTablePlusConnections(candidates, async (url: string) => {
      openedUrls.push(url);
    });

    expect(openedUrls).toEqual([
      "postgresql://postgres:secret@db.internal:5432/app",
      "redis://cache.internal:6379/0",
    ]);
  });
});
