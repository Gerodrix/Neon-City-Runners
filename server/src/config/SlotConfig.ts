import { SymbolId } from '../slot/Symbol.js';

export const GRID_REELS = 5;
export const GRID_ROWS = 4;
export const TOTAL_LINES = 12;

/** Cantidad de cada símbolo dentro de un strip de 40 posiciones. Igual para los 5 rodillos en v1. */
export const REEL_STRIP_COUNTS: Partial<Record<SymbolId, number>> = {
  RUNNER: 2,
  NETRUNNER: 3,
  CYBERDOG: 3,
  DRONE: 4,
  A: 6,
  K: 6,
  Q: 6,
  J: 7,
  CORE: 2,
  SCATTER: 1,
  // WILD no está en el strip: solo lo genera el Core AI.
};

export const CORE_MIN_WILDS = 2;
export const CORE_MAX_WILDS = 4;

export const SCATTER_MIN_TO_TRIGGER = 3;
export const FREE_SPINS_AWARDED = 8;

export const SCATTER_PAYOUT_MULTIPLIER: Record<number, number> = {
  3: 2,
  4: 10,
  5: 50,
};
