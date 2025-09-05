#!/usr/bin/env bun

import { copyFile, readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";

async function copyFileWithLog(src: string, dest: string): Promise<void> {
  try {
    await copyFile(src, dest);
    console.log(`Copied: ${src} → ${dest}`);
  } catch (error) {
    throw new Error(`Failed to copy ${src} to ${dest}: ${error}`);
  }
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

async function main() {
  try {
    // Get the script directory equivalent (packages/contracts/scripts/../ = packages/contracts/)
    const scriptDir = dirname(import.meta.path);
    const contractsDir = join(scriptDir, "..");

    console.log(`Working in contracts directory: ${contractsDir}`);
    process.chdir(contractsDir);

    console.log("Moving escrow artifacts...");
    // Move the escrow artifacts
    await copyFileWithLog(
      "./target/otc_escrow-OTCEscrowContract.json",
      "./ts/src/artifacts/escrow/OTCEscrowContract.json"
    );
    await copyFileWithLog(
      "./artifacts/OTCEscrowContract.ts",
      "./ts/src/artifacts/escrow/OTCEscrowContract.ts"
    );

    console.log("Moving token artifacts...");
    // Move the token artifacts
    await copyFileWithLog(
      "../../deps/aztec-standards/target/token_contract-Token.json",
      "./ts/src/artifacts/token/Token.json"
    );
    await copyFileWithLog(
      "./artifacts/Token.ts",
      "./ts/src/artifacts/token/Token.ts"
    );

    console.log("Fixing imports...");
    // Fix imports using string replacement instead of sed
    await replaceInFile(
      "./ts/src/artifacts/escrow/OTCEscrowContract.ts",
      "../target/otc_escrow-OTCEscrowContract.json",
      "./OTCEscrowContract.json"
    );

    await replaceInFile(
      "./ts/src/artifacts/token/Token.ts",
      "../target/token_contract-Token.json",
      "./Token.json"
    );

    console.log("Artifacts moved and imports fixed successfully!");

  } catch (error) {
    console.error("Script failed:", error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}