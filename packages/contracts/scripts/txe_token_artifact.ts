#!/usr/bin/env bun

import { copyFile, mkdir } from "fs/promises";
import { dirname, join } from "path";

async function copyFileWithLog(src: string, dest: string): Promise<void> {
  try {
    await copyFile(src, dest);
    console.log(`Copied: ${src} → ${dest}`);
  } catch (error) {
    throw new Error(`Failed to copy ${src} to ${dest}: ${error}`);
  }
}

async function main() {
  try {
    // Get the script directory equivalent
    const scriptDir = dirname(import.meta.path);

    // Copy token artifact from node_modules to target directory
    const src = join(scriptDir, "../../../node_modules/@aztec/noir-contracts.js/artifacts/token_contract-Token.json");
    const dest = join(scriptDir, "../target/otc_escrow-Token.json");
    const targetDir = dirname(dest);

    console.log("Ensuring target directory exists...");
    await mkdir(targetDir, { recursive: true });

    console.log("Copying token artifact...");
    await copyFileWithLog(src, dest);

    console.log("Token artifact copied successfully!");

  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}