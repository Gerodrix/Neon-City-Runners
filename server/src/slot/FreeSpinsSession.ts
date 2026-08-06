import { GridPosition } from './SlotEngine.js';

export interface FreeSpinsSession {
  sessionId: string;
  betPerLine: number;
  spinsRemaining: number;
  /** Posiciones de Core AI que quedaron fijas (sticky) en rondas anteriores de esta sesión. */
  stickyCorePositions: GridPosition[];
  totalWin: number;
}

// Estado en memoria del proceso: se pierde si se reinicia el server.
// Suficiente para un portfolio demo — ver GDD, decisión D-07.
const activeSessions = new Map<string, FreeSpinsSession>();

function generateSessionId(): string {
  return `fs_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createFreeSpinsSession(betPerLine: number, spinsAwarded: number): FreeSpinsSession {
  const session: FreeSpinsSession = {
    sessionId: generateSessionId(),
    betPerLine,
    spinsRemaining: spinsAwarded,
    stickyCorePositions: [], // arranca vacío: el giro que activó el bonus no cuenta (ver GDD, decisión D-05)
    totalWin: 0,
  };
  activeSessions.set(session.sessionId, session);
  return session;
}

export function getFreeSpinsSession(sessionId: string): FreeSpinsSession | undefined {
  return activeSessions.get(sessionId);
}

export function saveFreeSpinsSession(session: FreeSpinsSession): void {
  activeSessions.set(session.sessionId, session);
}

export function deleteFreeSpinsSession(sessionId: string): void {
  activeSessions.delete(sessionId);
}
