#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { checkbox } from "@inquirer/prompts";
import figures from "@inquirer/figures";
import { parse } from "dotenv";
import {
  EnvExpansionError,
  expandEnvVariables,
  openTablePlusConnections,
  parseConnectionCandidates,
  type ConnectionCandidate,
} from "./db-connect.js";

export const CHECKBOX_THEME = {
  icon: {
    cursor: figures.pointer,
    checked: ` ${figures.circleFilled}`,
    unchecked: ` ${figures.circle}`,
    disabledChecked: ` ${figures.circleDouble}`,
    disabledUnchecked: " -",
  },
} as const;

export async function run(): Promise<number> {
  if (process.platform !== "darwin") {
    console.error("tp-connect currently supports macOS only because it launches TablePlus with the macOS open command.");
    return 1;
  }

  const envPath = path.resolve(process.cwd(), ".env");
  const envContents = await loadEnvContents(envPath);

  if (envContents === null) {
    console.error(`No .env file found at ${envPath}.`);
    return 1;
  }

  const candidates = parseConnectionCandidates(expandEnvVariables(parse(envContents)));

  if (candidates.length === 0) {
    console.error("No database connection URLs were found in .env.");
    return 1;
  }

  const selected = await selectConnections(candidates);

  if (selected.length === 0) {
    console.log("No connections selected.");
    return 0;
  }

  await openTablePlusConnections(selected);
  console.log(`Opened ${selected.length} connection${selected.length === 1 ? "" : "s"} in TablePlus.`);

  return 0;
}

export async function selectConnections(candidates: ConnectionCandidate[]): Promise<ConnectionCandidate[]> {
  return checkbox({
    message: "Select the database connections to open in TablePlus",
    choices: candidates.map((candidate) => ({
      name: candidate.displayLabel,
      value: candidate,
    })),
    loop: false,
    theme: CHECKBOX_THEME,
  });
}

async function loadEnvContents(envPath: string): Promise<string | null> {
  try {
    return await readFile(envPath, "utf8");
  } catch (error) {
    const readError = error as NodeJS.ErrnoException;
    if (readError.code === "ENOENT") {
      return null;
    }

    throw error;
  }
}

async function main(): Promise<void> {
  try {
    process.exitCode = await run();
  } catch (error) {
    if (error instanceof Error && error.name === "ExitPromptError") {
      console.error("Selection cancelled.");
      process.exitCode = 130;
      return;
    }

    if (error instanceof EnvExpansionError) {
      console.error(`Failed to expand .env variables: ${error.message}`);
      process.exitCode = 1;
      return;
    }

    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}

void main();
