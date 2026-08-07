// Tipos base de símbolos y su definición (nombre, si es wild/scatter/core, tabla de pago).
// Los pagos viven en paytable.json (config externa) — se pueden ajustar sin
// tocar este archivo ni recompilar, algo que un motor de slots real necesita
// (ver comparación con matriz de referencia, GDD decisión D-14).

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

export type SymbolId =
  | 'RUNNER'
  | 'NETRUNNER'
  | 'CYBERDOG'
  | 'DRONE'
  | 'A'
  | 'K'
  | 'Q'
  | 'J'
  | 'CORE'
  | 'SCATTER'
  | 'WILD';

export interface SymbolPayout {
  three: number;
  four: number;
  five: number;
}

export interface SymbolDefinition {
  id: SymbolId;
  name: string;
  isWild: boolean;
  isScatter: boolean;
  isCore: boolean;
  /** Pago en monedas por unidad de apuesta por línea. Ausente = sin pago directo (CORE, WILD en v1). */
  payout?: SymbolPayout;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const paytablePath = path.join(__dirname, '../config/paytable.json');
const paytable: Record<string, SymbolPayout> = JSON.parse(readFileSync(paytablePath, 'utf-8'));

const SYMBOL_NAMES: Record<SymbolId, string> = {
  RUNNER: 'Runner',
  NETRUNNER: 'Netrunner',
  CYBERDOG: 'CyberDog',
  DRONE: 'Drone',
  A: 'A',
  K: 'K',
  Q: 'Q',
  J: 'J',
  CORE: 'Core AI',
  SCATTER: 'Data Vault',
  WILD: 'Glitch',
};

const PAYING_SYMBOLS: SymbolId[] = ['RUNNER', 'NETRUNNER', 'CYBERDOG', 'DRONE', 'A', 'K', 'Q', 'J'];
const SPECIAL_SYMBOLS: { id: SymbolId; isWild: boolean; isScatter: boolean; isCore: boolean }[] = [
  { id: 'CORE', isWild: false, isScatter: false, isCore: true },
  { id: 'SCATTER', isWild: false, isScatter: true, isCore: false },
  { id: 'WILD', isWild: true, isScatter: false, isCore: false },
];

export const SYMBOL_DEFINITIONS: Record<SymbolId, SymbolDefinition> = {} as Record<SymbolId, SymbolDefinition>;

for (const id of PAYING_SYMBOLS) {
  const payout = paytable[id];
  if (!payout) {
    throw new Error(`Falta el símbolo "${id}" en paytable.json`);
  }
  SYMBOL_DEFINITIONS[id] = { id, name: SYMBOL_NAMES[id], isWild: false, isScatter: false, isCore: false, payout };
}

for (const { id, isWild, isScatter, isCore } of SPECIAL_SYMBOLS) {
  SYMBOL_DEFINITIONS[id] = { id, name: SYMBOL_NAMES[id], isWild, isScatter, isCore };
}
