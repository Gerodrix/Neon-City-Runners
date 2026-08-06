import { SymbolId } from './Symbol.js';
import { RNG } from './RNG.js';

/** Arma un strip a partir de conteos por símbolo y lo mezcla. */
export function buildReelStrip(counts: Partial<Record<SymbolId, number>>): SymbolId[] {
  const strip: SymbolId[] = [];
  for (const [symbol, count] of Object.entries(counts) as [SymbolId, number][]) {
    for (let i = 0; i < count; i++) strip.push(symbol);
  }
  return RNG.shuffle(strip);
}

/** Devuelve `visibleRows` símbolos consecutivos del strip, arrancando en una posición aleatoria (rueda circular). */
export function spinReel(strip: SymbolId[], visibleRows: number): SymbolId[] {
  const startIndex = RNG.randomInt(strip.length);
  const result: SymbolId[] = [];
  for (let row = 0; row < visibleRows; row++) {
    result.push(strip[(startIndex + row) % strip.length]);
  }
  return result;
}
