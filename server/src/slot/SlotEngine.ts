import { GRID_REELS, GRID_ROWS, REEL_STRIP_COUNTS, CORE_MIN_WILDS, CORE_MAX_WILDS, SCATTER_MIN_TO_TRIGGER, FREE_SPINS_AWARDED, SCATTER_PAYOUT_MULTIPLIER } from '../config/SlotConfig.js';
import { SymbolId, SYMBOL_DEFINITIONS } from './Symbol.js';
import { buildReelStrip, spinReel } from './ReelStrip.js';
import { PAYLINES } from './Paylines.js';
import { RNG } from './RNG.js';
import { createFreeSpinsSession } from './FreeSpinsSession.js';

export interface GridPosition {
  reel: number;
  row: number;
}

export interface LineWin {
  lineIndex: number;
  symbol: SymbolId;
  count: number;
  win: number;
}

export interface SpinResult {
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
}

// Un strip por rodillo. En v1 los 5 usan el mismo conteo de símbolos.
const REEL_STRIPS: SymbolId[][] = Array.from({ length: GRID_REELS }, () => buildReelStrip(REEL_STRIP_COUNTS));

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
 * Por cada Core AI en el grid, convierte entre CORE_MIN_WILDS y CORE_MAX_WILDS
 * posiciones aleatorias del grid en WILD, evitando pisar CORE o SCATTER,
 * y evitando repetir una posición ya convertida.
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
    const wildsToGenerate = RNG.randomIntInRange(CORE_MIN_WILDS, CORE_MAX_WILDS);
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

  return { lineIndex, symbol: effectiveSymbol, count, win };
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

export function spin(betPerLine: number): SpinResult {
  const grid = generateGrid();

  const corePositions = findCorePositions(grid);
  const coreWildPositions = applyCoreWildGeneration(grid, corePositions);

  const { lineWins, totalLineWin } = evaluateAllLines(grid, betPerLine);

  const totalBet = betPerLine * PAYLINES.length;
  const { scatterCount, scatterWin, freeSpinsTriggered } = evaluateScatter(grid, totalBet);

  const freeSpinsAwarded = freeSpinsTriggered ? FREE_SPINS_AWARDED : 0;
  // El giro que activa Free Spins es base game: sus Cores NO quedan sticky (ver GDD, decisión D-05).
  // La ronda de Free Spins arranca sin ningún Core pegado todavía.
  const freeSpinsSession = freeSpinsTriggered ? createFreeSpinsSession(betPerLine, freeSpinsAwarded) : null;

  return {
    grid,
    corePositions,
    coreWildPositions,
    scatterCount,
    lineWins,
    totalLineWin,
    scatterWin,
    totalWin: totalLineWin + scatterWin,
    freeSpinsTriggered,
    freeSpinsAwarded,
    freeSpinsSessionId: freeSpinsSession?.sessionId ?? null,
  };
}
