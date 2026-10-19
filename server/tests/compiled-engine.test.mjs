import assert from 'node:assert/strict';
import { cp, mkdtemp, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

test('compiled engine runs with its packaged paytable, without source files', async () => {
  const standalone = await mkdtemp(join(tmpdir(), 'neon-engine-'));
  try {
    await cp(new URL('../dist/', import.meta.url), standalone, { recursive: true });
    // Declare ESM even when the standalone artifact is outside the repository.
    const { writeFile } = await import('node:fs/promises');
    await writeFile(join(standalone, 'package.json'), '{"type":"module"}');
    const engine = await import(pathToFileURL(join(standalone, 'slot/SlotEngine.js')));
    const paytable = JSON.parse(await readFile(join(standalone, 'config/paytable.json'), 'utf8'));
    const grid = Array.from({ length: 5 }, () => Array(4).fill('RUNNER'));
    const winnings = engine.evaluateAllLines(grid, 1);
    assert.equal(winnings.lineWins.length, 12);
    assert.ok(Math.abs(winnings.totalLineWin - 12 * paytable.RUNNER.five) < 1e-9);
    for (let index = 0; index < 100; index++) {
      const generated = engine.generateGrid();
      assert.equal(generated.length, 5);
      assert.ok(generated.every(reel => reel.length === 4));
      assert.ok(!generated[0].includes('CORE'));
      assert.ok(generated.every(reel => !reel.includes('WILD')));
    }
    const result = engine.spin(1, 'compiled-smoke-player');
    assert.equal(result.ok, true);
    assert.ok(Number.isFinite(result.result.balance));
    assert.ok(result.result.spinId.length > 0);
  } finally {
    assert.equal(dirname(resolve(standalone)), resolve(tmpdir()));
    assert.ok(basename(standalone).startsWith('neon-engine-'));
    await rm(standalone, { recursive: true, force: true });
  }
});
