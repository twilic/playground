#!/usr/bin/env node
/**
 * Ensures ../twilic/runtimes/javascript has WASM (+ TS) build output, then copies
 * wasm/pkg into playground/wasm/pkg so TypeScript + Vite can resolve
 * `import "*.wasm"` from inside this workspace (runs before `tsc -b` during `bun run build`).
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const playgroundDir = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const twilicJsRoot = path.resolve(playgroundDir, '..', 'twilic', 'runtimes', 'javascript');
const source = path.join(twilicJsRoot, 'wasm', 'pkg');
const distEntry = path.join(twilicJsRoot, 'dist', 'index.js');
const dest = path.join(playgroundDir, 'wasm', 'pkg');

function run(command, args, cwd) {
  console.log(`[sync-twilic-wasm] ${command} ${args.join(' ')} (cwd: ${cwd})`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.error) {
    console.error(`[sync-twilic-wasm] Failed to run ${command}:`, result.error.message);
    process.exit(1);
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

if (!fs.existsSync(twilicJsRoot)) {
  console.error(`[sync-twilic-wasm] Missing ${twilicJsRoot}`);
  console.error('  Clone the twilic monorepo beside this workspace (see README).');
  process.exit(1);
}

if (!fs.existsSync(source)) {
  console.log('[sync-twilic-wasm] wasm/pkg missing; running bun run build:wasm …');
  run('bun', ['run', 'build:wasm'], twilicJsRoot);
}

if (!fs.existsSync(distEntry)) {
  console.log('[sync-twilic-wasm] dist missing; compiling TypeScript …');
  // Prefer the package script when deps are installed; otherwise use bunx so we do not
  // rewrite runtimes/javascript/bun.lock when the local Bun is older than packageManager.
  if (fs.existsSync(path.join(twilicJsRoot, 'node_modules', 'typescript'))) {
    run('bun', ['run', 'build:ts'], twilicJsRoot);
  } else {
    run('bunx', ['typescript', 'tsc', '-p', 'tsconfig.json'], twilicJsRoot);
  }
}

if (!fs.existsSync(source)) {
  console.error(`[sync-twilic-wasm] Still missing ${source} after build:wasm`);
  process.exit(1);
}

fs.mkdirSync(dest, { recursive: true });
fs.cpSync(source, dest, { recursive: true });
console.log(`[sync-twilic-wasm] Synced → ${dest}`);
