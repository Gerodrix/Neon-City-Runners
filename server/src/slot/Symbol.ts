// Tipos base de símbolos y su definición (nombre, si es wild/scatter/core, tabla de pago).
// Los pagos viven en paytable.json (config externa) — se pueden ajustar sin
// tocar este archivo ni recompilar, algo que un motor de slots real necesita
// (ver comparación con matriz de referencia, GDD decisión D-14).
//
// D-19: el Wild ahora tiene tabla de pago propia (antes solo sustituía),
// como parte de la corrección de la saturación de Free Spins.

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
  /** Pago en monedas por unidad de apuesta por línea. Ausente = sin pago directo (CORE, SCATTER usa su propia tabla). */
  payout?: SymbolPayout;
}

interface SymbolSpec {
  id: SymbolId;
  name: string;
  isWild: boolean;
  isScatter: boolean;
  isCore: boolean;
  hasPayout: boolean;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const paytablePath = path.join(__dirname, '../config/paytable.json');
const paytable: Record<string, SymbolPayout> = JSON.parse(readFileSync(paytablePath, 'utf-8'));

const SYMBOL_SPECS: SymbolSpec[] = [
  { id: 'RUNNER', name: 'Runner', isWild: false, isScatter: false, isCore: false, hasPayout: true },
  { id: 'NETRUNNER', name: 'Netrunner', isWild: false, isScatter: false, isCore: false, hasPayout: true },
  { id: 'CYBERDOG', name: 'CyberDog', isWild: false, isScatter: false, isCore: false, hasPayout: true },
  { id: 'DRONE', name: 'Drone', isWild: false, isScatter: false, isCore: false, hasPayout: true },
  { id: 'A', name: 'A', isWild: false, isScatter: false, isCore: false, hasPayout: true },
  { id: 'K', name: 'K', isWild: false, isScatter: false, isCore: false, hasPayout: true },
  { id: 'Q', name: 'Q', isWild: false, isScatter: false, isCore: false, hasPayout: true },
  { id: 'J', name: 'J', isWild: false, isScatter: false, isCore: false, hasPayout: true },
  { id: 'CORE', name: 'Core AI', isWild: false, isScatter: false, isCore: true, hasPayout: false },
  { id: 'SCATTER', name: 'Data Vault', isWild: false, isScatter: true, isCore: false, hasPayout: false },
  { id: 'WILD', name: 'Glitch', isWild: true, isScatter: false, isCore: false, hasPayout: true }, // D-19
];

export const SYMBOL_DEFINITIONS: Record<SymbolId, SymbolDefinition> = {} as Record<SymbolId, SymbolDefinition>;

for (const spec of SYMBOL_SPECS) {
  const payout = spec.hasPayout ? paytable[spec.id] : undefined;
  if (spec.hasPayout && !payout) {
    throw new Error(`Falta el símbolo "${spec.id}" en paytable.json`);
  }
  SYMBOL_DEFINITIONS[spec.id] = {
    id: spec.id,
    name: spec.name,
    isWild: spec.isWild,
    isScatter: spec.isScatter,
    isCore: spec.isCore,
    payout,
  };
}
