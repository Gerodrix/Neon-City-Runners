import { copyFile, mkdir } from 'node:fs/promises';

// TypeScript does not copy JSON read with fs at runtime.
const target = new URL('../dist/config/', import.meta.url);
await mkdir(target, { recursive: true });
await copyFile(new URL('../src/config/paytable.json', import.meta.url), new URL('paytable.json', target));
