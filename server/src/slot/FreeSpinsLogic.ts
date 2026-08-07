import { PAYLINES } from './Paylines.js';
import { SymbolId } from './Symbol.js';
import { randomUUID } from 'node:crypto';
import {
  GridPosition,
  LineWin,
  generateGrid,
  findCorePositions,
  applyCoreWildGeneration,
  evaluateAllLines,
  evaluateScatter,
} from './SlotEngine.js';
import {
  FreeSpinsSession,
  getFreeSpinsSession,
  saveFreeSpinsSession,
  deleteFreeSpinsSession,
} from './FreeSpinsSession.js';
import { adjustBalance } from './PlayerBalance.js';

export interface FreeSpinsSpinResult {
  spinId: string;
  grid: SymbolId[][];
  corePositions: GridPosition[]; // sticky de rondas anteriores + nuevos, todos los CORE del grid actual
  coreWildPositions: GridPosition[];
  scatterCount: number;
  lineWins: LineWin[];
  spinWin: number;
  sessionTotalWin: number;
  spinsRemaining: number;
  sessionOver: boolean;
  /** Saldo del jugador después de este giro, calculado por el servidor (Zero Trust). */
  balance: number;
}

export type FreeSpinResponse =
  | { ok: true; result: FreeSpinsSpinResult }
  | { ok: false; error: string };

/** Fuerza CORE en cada posición sticky, pisando lo que haya salido del reel strip ahí. */
function applyStickyCores(grid: SymbolId[][], stickyPositions: GridPosition[]): void {
  for (const position of stickyPositions) {
    grid[position.reel][position.row] = 'CORE';
  }
}

export function spinFreeSpins(sessionId: string): FreeSpinResponse {
  const session = getFreeSpinsSession(sessionId);

  if (!session) {
    return { ok: false, error: 'Sesión de Free Spins inexistente o expirada' };
  }
  if (session.spinsRemaining <= 0) {
    // No debería pasar (la sesión se borra al llegar a 0), pero se cubre por las dudas.
    deleteFreeSpinsSession(sessionId);
    return { ok: false, error: 'La sesión de Free Spins ya finalizó' };
  }

  const grid = generateGrid();
  applyStickyCores(grid, session.stickyCorePositions);

  // corePositions ahora incluye los sticky (ya forzados) + cualquier CORE nuevo que haya caído.
  const corePositions = findCorePositions(grid);
  const coreWildPositions = applyCoreWildGeneration(grid, corePositions);

  const { lineWins, totalLineWin } = evaluateAllLines(grid, session.betPerLine);

  const totalBet = session.betPerLine * PAYLINES.length;
  // Sin retrigger en v1 (ver GDD, decisión D-06): se ignora freeSpinsTriggered acá a propósito,
  // el Scatter solo aporta su pago, no extiende la ronda.
  const { scatterCount, scatterWin } = evaluateScatter(grid, totalBet);

  const spinWin = totalLineWin + scatterWin;

  const updatedSession: FreeSpinsSession = {
    ...session,
    stickyCorePositions: corePositions, // todos los Core actuales quedan sticky para el próximo giro
    totalWin: session.totalWin + spinWin,
    spinsRemaining: session.spinsRemaining - 1,
  };

  const sessionOver = updatedSession.spinsRemaining <= 0;

  if (sessionOver) {
    deleteFreeSpinsSession(sessionId);
  } else {
    saveFreeSpinsSession(updatedSession);
  }

  // Los giros de Free Spins no cuestan apuesta nueva (ya se pagaron con el giro que activó el bonus),
  // así que acá solo se acredita lo ganado, nunca se descuenta nada.
  const balance = adjustBalance(session.playerId, spinWin);

  return {
    ok: true,
    result: {
      spinId: randomUUID(),
      grid,
      corePositions,
      coreWildPositions,
      scatterCount,
      lineWins,
      spinWin,
      sessionTotalWin: updatedSession.totalWin,
      spinsRemaining: updatedSession.spinsRemaining,
      sessionOver,
      balance,
    },
  };
}
