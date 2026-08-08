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

// Límites de apuesta por línea (NCR-E13). Multi-moneda queda fuera de esta iteración —
// ver docs/project-management/pending-features-plan.md.
export const MIN_BET_PER_LINE = 0.1;
export const MAX_BET_PER_LINE = 10;

/** Valores discretos que ofrece el selector del frontend — igual criterio que un slot real. */
export const BET_STEPS = [0.1, 0.2, 0.5, 1, 2, 5, 10];
