#!/usr/bin/env bun

import { spawn } from 'child_process';

const extraProfiles = process.argv.slice(2);  // Get additional args (e.g., 'orderflow')

const cmd = ['docker', 'compose'];
const usedProfiles = new Set<string>();
const allowedProfiles = ['testnet', 'api', 'local-network'];


for (const profile of extraProfiles) {
    if (!allowedProfiles.includes(profile)) {
        console.error(`Invalid profile: ${profile}`);
        process.exit(1);
    }
    if (usedProfiles.has(profile)) {
        console.error(`Duplicate profile: ${profile}`);
        process.exit(1);
    }
    usedProfiles.add(profile);
    cmd.push('--profile', profile);
}

cmd.push('up');

console.log("Running Aztec Stack with profiles:", extraProfiles.join(', ') || 'none');
const proc = spawn(cmd[0], cmd.slice(1), { stdio: 'inherit' });
proc.on('exit', (code) => {
    process.exit(code);
});