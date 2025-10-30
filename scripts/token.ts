#!/usr/bin/env bun

import { spawn } from "bun";
import { existsSync } from "fs";
import { writeFile } from "fs/promises";
import { readFile } from "fs/promises";
import { mkdir, rm } from "fs/promises";
import { join } from "path";

interface ScriptOptions {
  skipSubmodules: boolean;
}

function parseArgs(): ScriptOptions {
  const args = process.argv.slice(2);
  let skipSubmodules = false;

  for (const arg of args) {
    switch (arg) {
      case '--skip-submodules':
        skipSubmodules = true;
        break;
      default:
        console.error(`Invalid option: ${arg}`);
        process.exit(1);
    }
  }

  return { skipSubmodules };
}

async function replaceInFile(filePath: string, searchText: string, replaceText: string): Promise<void> {
  try {
    const content = await readFile(filePath, "utf-8");
    const updatedContent = content.replace(new RegExp(searchText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), replaceText);
    await writeFile(filePath, updatedContent, "utf-8");
    console.log(`Updated imports in: ${filePath}`);
  } catch (error) {
    throw new Error(`Failed to update file ${filePath}: ${error}`);
  }
}

async function execCommand(command: string, args: string[] = [], cwd?: string): Promise<void> {
  const proc = spawn({
    cmd: [command, ...args],
    cwd,
    stdout: "inherit",
    stderr: "inherit",
  });

  const exitCode = await proc.exited;
  if (exitCode !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(' ')} (exit code: ${exitCode})`);
  }
}

async function main() {
  const options = parseArgs();

  try {
    if (!options.skipSubmodules) {
      console.log("Updating git submodules...");
      await execCommand("git", ["submodule", "update", "--init", "--recursive"]);
      console.log("Fetching tags in aztec-standards...");
      await execCommand("git", ["fetch", "--tags"], "deps/aztec-standards");
      console.log("Checking out aztec-standards v3.0.0-devnet.2...");
      await execCommand("git", ["checkout", "chore/v3-devnet.2"], "deps/aztec-standards");
    } else {
      console.log("Skipping submodule update, removing target directory...");
      const targetPath = "deps/aztec-standards/target";
      if (existsSync(targetPath)) {
        await rm(targetPath, { recursive: true, force: true });
      }
    }

    console.log("Compiling token contract...");
    await execCommand("aztec-nargo", ["compile", "--package", "token_contract"], "deps/aztec-standards");

    console.log("Postprocessing contract...");
    await execCommand("aztec-postprocess-contract");

    console.log("Generating TypeScript bindings...");
    await execCommand("aztec", [
      "codegen",
      "./target/token_contract-Token.json",
      "-o", "./target",
      "-f"
    ], "deps/aztec-standards");

    console.log("Copy token artifacts to ts library");
    await execCommand("cp", [
      "./target/token_contract-Token.json",
      "../../packages/contracts/ts/src/artifacts/token/Token.json"
    ], "deps/aztec-standards");

    await execCommand("cp", [
      "./target/Token.ts",
      "../../packages/contracts/ts/src/artifacts/token/Token.ts"
    ], "deps/aztec-standards");

    console.log("Fixing import paths...");
    await replaceInFile(
      "./packages/contracts/ts/src/artifacts/token/Token.ts",
      "./token_contract-Token.json",
      "./Token.json"
    );

    console.log("Copying token artifact to imported in TXE...")
    if (!existsSync("packages/contracts/target")) {
      await mkdir("packages/contracts/target", { recursive: true });
    }

    await execCommand("cp", [
      "./target/token_contract-Token.json",
      "../../packages/contracts/target/otc_escrow-Token.json"
    ], "deps/aztec-standards");

    console.log("Token contract build completed successfully!");

  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}