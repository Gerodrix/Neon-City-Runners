import { GRID_REELS, GRID_ROWS, REEL_STRIP_COUNTS, REEL_0_STRIP_COUNTS, CORE_MIN_WILDS, CORE_MAX_WILDS, SCATTER_MIN_TO_TRIGGER, FREE_SPINS_AWARDED, SCATTER_PAYOUT_MULTIPLIER, BUY_BONUS_MULTIPLIER, CORE_BOOST_MULTIPLIER } from '../config/SlotConfig.js';
import { SymbolId, SYMBOL_DEFINITIONS } from './Symbol.js';
import { buildReelStrip, spinReel } from './ReelStrip.js';
import { PAYLINES } from './Paylines.js';
import { RNG } from './RNG.js';
import { randomUUID } from 'node:crypto';
import { createFreeSpinsSession } from './FreeSpinsSession.js';
import { getOrCreateBalance, adjustBalance } from './PlayerBalance.js';

export interface GridPosition {
  reel: number;
  row: number;
}

export interface LineWin {
  lineIndex: number;
  symbol: SymbolId;
  count: number;
  win: number;
  /** Celdas exactas que formaron la combinación, para que el frontend las resalte sin recalcular nada. */
  positions: GridPosition[];
}

export interface SpinResult {
  spinId: string;
  grid: SymbolId[][]; // grid[reel][row]
  corePositions: GridPosition[];
  coreWildPositions: GridPosition[];
  scatterCount: number;
  lineWins: LineWin[];
  totalLineWin: number;
  scatterWin: number;
  totalWin: number;
  freeSpinsTriggered: boolean;
  freeSpinsAwarded: number;
  /** Presente solo si freeSpinsTriggered es true — usar en POST /free-spin. */
  freeSpinsSessionId: string | null;
  /** Saldo del jugador después de este giro, calculado por el servidor (Zero Trust). */
  balance: number;
}

export type SpinResponse =
  | { ok: true; result: SpinResult }
  | { ok: false; error: string };

// Un strip por rodillo. En v1 los 5 usan el mismo conteo de símbolos.
// Un strip por rodillo. El rodillo 1 (índice 0) usa su propio strip sin Core (D-27);
// los rodillos 2 a 5 comparten la misma distribución.
const REEL_STRIPS: SymbolId[][] = Array.from({ length: GRID_REELS }, (_, index) =>
  buildReelStrip(index === 0 ? REEL_0_STRIP_COUNTS : REEL_STRIP_COUNTS)
);

function toIndex(reel: number, row: number): number {
  return reel * GRID_ROWS + row;
}

export function generateGrid(): SymbolId[][] {
  return REEL_STRIPS.map((strip) => spinReel(strip, GRID_ROWS));
}

/** Encuentra todas las posiciones donde cayó CORE AI. */
export function findCorePositions(grid: SymbolId[][]): GridPosition[] {
  const positions: GridPosition[] = [];
  for (let reel = 0; reel < GRID_REELS; reel++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[reel][row] === 'CORE') positions.push({ reel, row });
    }
  }
  return positions;
}

/**
 * Por cada Core AI en el grid, convierte una cantidad de posiciones aleatorias en WILD,
 * evitando pisar CORE o SCATTER existentes.
 *
 * D-19: en vez de un tope duro, la cantidad de wilds por Core baja a medida que el
 * tablero ya está más ocupado (occupiedRatio) — así nunca se llega al 100% de saturación
 * que se vio en la ronda de Free Spins que motivó esta corrección, sin que se sienta
 * una regla artificial (se autorregula giro a giro y dentro del mismo giro si caen
 * varios Cores juntos).
 */
export function applyCoreWildGeneration(grid: SymbolId[][], corePositions: GridPosition[]): GridPosition[] {
  const totalPositions = GRID_REELS * GRID_ROWS;
  const excluded = new Set<number>();

  // No se puede pisar ningún CORE ni SCATTER existente.
  for (let reel = 0; reel < GRID_REELS; reel++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const symbol = grid[reel][row];
      if (symbol === 'CORE' || symbol === 'SCATTER') {
        excluded.add(toIndex(reel, row));
      }
    }
  }

  const generatedWilds: GridPosition[] = [];

  for (const _core of corePositions) {
    const availablePositions = totalPositions - excluded.size;
    if (availablePositions <= 0) break; // tablero ya lleno, este Core no genera nada más

    const occupiedRatio = excluded.size / totalPositions;
    const scaledMax = Math.max(1, Math.round(CORE_MAX_WILDS * (1 - occupiedRatio)));
    const scaledMin = Math.min(CORE_MIN_WILDS, scaledMax);

    const wildsToGenerate = Math.min(RNG.randomIntInRange(scaledMin, scaledMax), availablePositions);
    const chosenIndices = RNG.uniqueRandomPositions(wildsToGenerate, totalPositions, excluded);

    for (const index of chosenIndices) {
      const reel = Math.floor(index / GRID_ROWS);
      const row = index % GRID_ROWS;
      grid[reel][row] = 'WILD';
      generatedWilds.push({ reel, row });
      excluded.add(index); // no volver a elegir esta posición para otro Core
    }
  }

  return generatedWilds;
}

/** Evalúa una línea: el símbolo de la línea es el primer símbolo no-wild de izquierda a derecha. */
function evaluateLine(grid: SymbolId[][], line: number[], lineIndex: number, betPerLine: number): LineWin | null {
  const symbolsInLine = line.map((row, reel) => grid[reel][row]);

  let effectiveSymbol: SymbolId | null = null;
  for (const symbol of symbolsInLine) {
    if (symbol !== 'WILD') {
      effectiveSymbol = symbol;
      break;
    }
  }
  if (effectiveSymbol === null) effectiveSymbol = 'WILD'; // línea entera de wilds

  const definition = SYMBOL_DEFINITIONS[effectiveSymbol];
  if (!definition.payout) return null; // CORE, SCATTER o WILD (sin tabla propia en v1) no pagan como línea

  let count = 0;
  for (const symbol of symbolsInLine) {
    if (symbol === effectiveSymbol || symbol === 'WILD') count++;
    else break;
  }

  if (count < 3) return null;

  const payoutKey = count === 3 ? 'three' : count === 4 ? 'four' : 'five';
  const win = definition.payout[payoutKey] * betPerLine;

  const positions: GridPosition[] = line.slice(0, count).map((row, reel) => ({ reel, row }));

  return { lineIndex, symbol: effectiveSymbol, count, win, positions };
}

/** Evalúa las 12 líneas sobre un grid ya armado y devuelve las ganadoras + el total. */
export function evaluateAllLines(grid: SymbolId[][], betPerLine: number): { lineWins: LineWin[]; totalLineWin: number } {
  const lineWins: LineWin[] = [];
  for (let lineIndex = 0; lineIndex < PAYLINES.length; lineIndex++) {
    const result = evaluateLine(grid, PAYLINES[lineIndex], lineIndex, betPerLine);
    if (result) lineWins.push(result);
  }
  const totalLineWin = lineWins.reduce((sum, lineWin) => sum + lineWin.win, 0);
  return { lineWins, totalLineWin };
}

export function evaluateScatter(grid: SymbolId[][], totalBet: number): { scatterCount: number; scatterWin: number; freeSpinsTriggered: boolean } {
  let scatterCount = 0;
  for (let reel = 0; reel < GRID_REELS; reel++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[reel][row] === 'SCATTER') scatterCount++;
    }
  }

  const multiplier = SCATTER_PAYOUT_MULTIPLIER[scatterCount] ?? 0;
  const scatterWin = multiplier * totalBet;
  const freeSpinsTriggered = scatterCount >= SCATTER_MIN_TO_TRIGGER;

  return { scatterCount, scatterWin, freeSpinsTriggered };
}

/**
 * NCR-E12 — Fuerza un Core AI en el grid si no cayó ninguno de forma natural.
 * Nunca en el rodillo 1 (D-27) ni pisando un Scatter existente. No hace nada si
 * ya hay al menos un Core — el boost garantiza "al menos uno", no agrega de más.
 */
function forceCoreGuarantee(grid: SymbolId[][]): void {
  for (let reel = 0; reel < GRID_REELS; reel++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[reel][row] === 'CORE') return; // ya hay al menos uno, no hace falta forzar
    }
  }

  const candidates: number[] = [];
  for (let reel = 1; reel < GRID_REELS; reel++) {
    // arranca en 1: nunca en el rodillo 1 (D-27)
    for (let row = 0; row < GRID_ROWS; row++) {
      if (grid[reel][row] !== 'SCATTER') candidates.push(toIndex(reel, row));
    }
  }
  if (candidates.length === 0) return; // no debería pasar nunca, pero por las dudas

  const index = candidates[RNG.randomInt(candidates.length)];
  const reel = Math.floor(index / GRID_ROWS);
  const row = index % GRID_ROWS;
  grid[reel][row] = 'CORE';
}

export function spin(betPerLine: number, playerId: string, coreBoostEnabled = false): SpinResponse {
  const baseBet = betPerLine * PAYLINES.length;
  const totalBet = coreBoostEnabled ? baseBet * CORE_BOOST_MULTIPLIER : baseBet;
  const currentBalance = getOrCreateBalance(playerId);

  if (currentBalance < totalBet) {
    return { ok: false, error: 'Saldo insuficiente' };
  }

  const grid = generateGrid();
  if (coreBoostEnabled) forceCoreGuarantee(grid);

  const corePositions = findCorePositions(grid);
  const coreWildPositions = applyCoreWildGeneration(grid, corePositions);

  const { lineWins, totalLineWin } = evaluateAllLines(grid, betPerLine);

  const { scatterCount, scatterWin, freeSpinsTriggered } = evaluateScatter(grid, totalBet);

  const freeSpinsAwarded = freeSpinsTriggered ? FREE_SPINS_AWARDED : 0;
  // El giro que activa Free Spins es base game: sus Cores NO quedan sticky (ver GDD, decisión D-05).
  // La ronda de Free Spins arranca sin ningún Core pegado todavía. El boost de este giro
  // NO se propaga a la ronda de Free Spins (alcance v1, ver GDD, D-31).
  const freeSpinsSession = freeSpinsTriggered ? createFreeSpinsSession(betPerLine, freeSpinsAwarded, playerId) : null;

  const totalWin = totalLineWin + scatterWin;
  // Saldo calculado y guardado en el servidor — el cliente solo va a mostrar este número.
  const balance = adjustBalance(playerId, totalWin - totalBet);

  return {
    ok: true,
    result: {
      spinId: randomUUID(),
      grid,
      corePositions,
      coreWildPositions,
      scatterCount,
      lineWins,
      totalLineWin,
      scatterWin,
      totalWin,
      freeSpinsTriggered,
      freeSpinsAwarded,
      freeSpinsSessionId: freeSpinsSession?.sessionId ?? null,
      balance,
    },
  };
}

export interface BuyBonusResult {
  spinId: string;
  grid: SymbolId[][];
  corePositions: GridPosition[];
  coreWildPositions: GridPosition[];
  buyCost: number;
  freeSpinsAwarded: number;
  freeSpinsSessionId: string;
  balance: number;
}

export type BuyBonusResponse =
  | { ok: true; result: BuyBonusResult }
  | { ok: false; error: string };

/**
 * Fuerza suficientes Scatter en el grid para llegar al mínimo de trigger (3+),
 * sin pisar Cores ni Scatters que ya hayan caído naturalmente. Solo se usa en
 * Buy Bonus — el giro normal nunca fuerza nada, ahí el trigger es 100% orgánico.
 */
function forceScatterTrigger(grid: SymbolId[][]): void {
  const totalPositions = GRID_REELS * GRID_ROWS;
  let scatterCount = 0;
  const candidatePositions: number[] = [];

  for (let reel = 0; reel < GRID_REELS; reel++) {
    for (let row = 0; row < GRID_ROWS; row++) {
      const symbol = grid[reel][row];
      if (symbol === 'SCATTER') scatterCount++;
      else if (symbol !== 'CORE') candidatePositions.push(toIndex(reel, row));
    }
  }

  if (scatterCount >= SCATTER_MIN_TO_TRIGGER) return;

  const shuffled = RNG.shuffle(candidatePositions);
  let i = 0;
  while (scatterCount < SCATTER_MIN_TO_TRIGGER && i < shuffled.length) {
    const index = shuffled[i++];
    const reel = Math.floor(index / GRID_ROWS);
    const row = index % GRID_ROWS;
    grid[reel][row] = 'SCATTER';
    scatterCount++;
  }
}

/**
 * NCR-E11 — Activa una ronda de Free Spins directamente, sin necesidad de 3+ Scatter,
 * a cambio de un costo fijo en múltiplos de la apuesta total. El precio (BUY_BONUS_MULTIPLIER)
 * está calibrado por simulación para que el RTP de la compra sea igual al RTP general
 * del juego — no es un número puesto a ojo (ver GDD, D-21).
 *
 * D-23: el giro que confirma la compra es puramente visual — genera un grid con el
 * trigger garantizado (como en cualquier slot real al comprar el bonus), pero NO evalúa
 * líneas ni paga nada por ese giro. El precio ya está calibrado asumiendo que lo único
 * que se compra es la ronda de Free Spins — pagar líneas acá encima rompería esa
 * calibración y regalaría valor no contemplado en D-21.
 */
export function buyBonus(betPerLine: number, playerId: string): BuyBonusResponse {
  const totalBet = betPerLine * PAYLINES.length;
  const buyCost = totalBet * BUY_BONUS_MULTIPLIER;
  const currentBalance = getOrCreateBalance(playerId);

  if (currentBalance < buyCost) {
    return { ok: false, error: 'Saldo insuficiente' };
  }

  const grid = generateGrid();
  forceScatterTrigger(grid);
  const corePositions = findCorePositions(grid);
  const coreWildPositions = applyCoreWildGeneration(grid, corePositions);

  const freeSpinsSession = createFreeSpinsSession(betPerLine, FREE_SPINS_AWARDED, playerId);
  const balance = adjustBalance(playerId, -buyCost);

  return {
    ok: true,
    result: {
      spinId: randomUUID(),
      grid,
      corePositions,
      coreWildPositions,
      buyCost,
      freeSpinsAwarded: FREE_SPINS_AWARDED,
      freeSpinsSessionId: freeSpinsSession.sessionId,
      balance,
    },
  };
}
