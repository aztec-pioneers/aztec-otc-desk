#!/usr/bin/env bun

import { spawn } from "bun";
import { existsSync } from "fs";
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
    } else {
      console.log("Skipping submodule update, removing target directory...");
      const targetPath = "deps/aztec-standards/target";
      if (existsSync(targetPath)) {
        await rm(targetPath, { recursive: true, force: true });
      }
    }

    console.log("Compiling token contract...");
    await execCommand("aztec-nargo", ["compile", "--package", "token_contract"], "deps/aztec-standards");

    console.log("Generating TypeScript bindings...");
    await execCommand("aztec", [
      "codegen",
      "./target/token_contract-Token.json",
      "-o", "../../packages/contracts/artifacts",
      "-f"
    ], "deps/aztec-standards");

    console.log("Copying artifact to target directory...");
    const targetDir = "packages/contracts/target";
    if (!existsSync(targetDir)) {
      await mkdir(targetDir, { recursive: true });
    }
    
    await execCommand("cp", [
      "deps/aztec-standards/target/token_contract-Token.json",
      "packages/contracts/target/"
    ]);

    console.log("Token contract build completed successfully!");

  } catch (error) {
    console.error("Build failed:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}