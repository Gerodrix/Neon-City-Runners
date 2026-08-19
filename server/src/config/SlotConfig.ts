import { SymbolId } from '../slot/Symbol.js';

export const GRID_REELS = 5;
export const GRID_ROWS = 4;
export const TOTAL_LINES = 12;

/** Cantidad de cada símbolo dentro de un strip de 40 posiciones — rodillos 2 a 5. */
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

/**
 * D-27: el rodillo 1 (el más a la izquierda) NUNCA tiene Core AI en su strip.
 * Motivo: como las líneas se evalúan de izquierda a derecha, un Core justo en la
 * columna 1 mata las 12 líneas de una sola vez (medido: ~47% menos de ganancia
 * esperada en esos giros comparado con si esa celda fuera Wild) — un golpe mucho
 * más grande que el mismo Core cayendo en cualquier otra columna. El conteo de
 * Core (2) se redistribuye en A y K para mantener el strip en 40.
 */
export const REEL_0_STRIP_COUNTS: Partial<Record<SymbolId, number>> = {
  RUNNER: 2,
  NETRUNNER: 3,
  CYBERDOG: 3,
  DRONE: 4,
  A: 7,
  K: 7,
  Q: 6,
  J: 7,
  SCATTER: 1,
  // Sin CORE acá a propósito (D-27). Sin WILD, igual que el resto.
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

// Límites de recarga de saldo (herramienta de demo/testing, D-16). El monto lo elige
// el jugador — esto solo evita valores absurdos (negativos, cero, o excesivos).
// Multi-moneda queda fuera de esta iteración — ver pending-features-plan.md.
export const MIN_TOPUP_AMOUNT = 1;
export const MAX_TOPUP_AMOUNT = 100000;

// NCR-E11 — Buy Bonus: costo de activar Free Spins directamente, en múltiplos de la
// apuesta total (betPerLine * 12). Calibrado con npm run simulate para que el RTP de
// la compra sea igual al RTP general del juego — no es un número arbitrario, ver D-21.
// Recalibrado en D-27 (el rodillo 1 sin Core hizo que las rondas de FS paguen más).
export const BUY_BONUS_MULTIPLIER = 32.0;

// NCR-E12 — Core Boost: multiplicador de apuesta a cambio de asegurar al menos 1 Core AI
// en el giro (si no cae de forma natural, se fuerza uno — nunca en el rodillo 1, D-27).
// Alcance v1: solo afecta el giro base en sí, no persiste dentro de una ronda de Free
// Spins que dispare desde acá — ver GDD, D-31. Calibrado por simulación, no a ojo.
export const CORE_BOOST_MULTIPLIER = 1.3; // calibrado por simulación (2 corridas de 3M: 1.315x y 1.295x)
