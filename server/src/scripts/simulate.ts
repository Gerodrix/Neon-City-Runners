// Simulación Monte Carlo del juego completo (base game + Free Spins).
// Reutiliza el motor real (SlotEngine / FreeSpinsLogic) — no reimplementa
// ninguna probabilidad a mano, así que mide exactamente lo que jugaría un usuario real.
//
// Uso: npm run simulate           (1,000,000 giros por defecto)
//      npm run simulate -- 5000000 (cantidad custom)

import { spin } from '../slot/SlotEngine.js';
import { spinFreeSpins } from '../slot/FreeSpinsLogic.js';
import { PAYLINES } from '../slot/Paylines.js';
import { FREE_SPINS_AWARDED } from '../config/SlotConfig.js';

const BET_PER_LINE = 1;
const BET_PER_BASE_SPIN = BET_PER_LINE * PAYLINES.length;

const spinCountArg = Number(process.argv[2]);
const SPIN_COUNT = Number.isFinite(spinCountArg) && spinCountArg > 0 ? spinCountArg : 1_000_000;

let totalBet = 0;
let totalWin = 0;
let baseWinningSpins = 0;
let freeSpinsTriggeredCount = 0;
let freeSpinsWinTotal = 0;

// Para D-08: suma y cantidad de spinWin agrupados por posición dentro de la ronda de FS (1..8).
const winByPositionSum: number[] = new Array(FREE_SPINS_AWARDED).fill(0);
const winByPositionCount: number[] = new Array(FREE_SPINS_AWARDED).fill(0);
const zeroWinByPositionCount: number[] = new Array(FREE_SPINS_AWARDED).fill(0);

const startedAt = Date.now();

for (let i = 0; i < SPIN_COUNT; i++) {
  totalBet += BET_PER_BASE_SPIN;

  const result = spin(BET_PER_LINE);
  totalWin += result.totalWin;
  if (result.totalWin > 0) baseWinningSpins++;

  if (result.freeSpinsTriggered && result.freeSpinsSessionId) {
    freeSpinsTriggeredCount++;
    let position = 0;

    while (true) {
      const response = spinFreeSpins(result.freeSpinsSessionId);
      if (!response.ok) break; // no debería pasar; corta por seguridad

      totalWin += response.result.spinWin; // los giros de FS no cuestan apuesta nueva
      freeSpinsWinTotal += response.result.spinWin;

      winByPositionSum[position] += response.result.spinWin;
      winByPositionCount[position]++;
      if (response.result.spinWin === 0) zeroWinByPositionCount[position]++;

      position++;
      if (response.result.sessionOver) break;
    }
  }
}

const elapsedSeconds = (Date.now() - startedAt) / 1000;

const rtp = (totalWin / totalBet) * 100;
const baseGameRtp = ((totalWin - freeSpinsWinTotal) / totalBet) * 100;
const bonusContributionRtp = (freeSpinsWinTotal / totalBet) * 100;
const hitFrequency = (baseWinningSpins / SPIN_COUNT) * 100;
const triggerFrequency = (freeSpinsTriggeredCount / SPIN_COUNT) * 100;
const spinsPerTrigger = triggerFrequency > 0 ? (100 / triggerFrequency).toFixed(0) : 'N/A';

console.log('='.repeat(60));
console.log(`Neon City Runners — Simulación Monte Carlo`);
console.log('='.repeat(60));
console.log(`Giros base simulados: ${SPIN_COUNT.toLocaleString('es-AR')}`);
console.log(`Tiempo de simulación: ${elapsedSeconds.toFixed(1)}s`);
console.log('-'.repeat(60));
console.log(`RTP total:                 ${rtp.toFixed(2)}%`);
console.log(`  - Aporte de base game:    ${baseGameRtp.toFixed(2)}%`);
console.log(`  - Aporte de Free Spins:   ${bonusContributionRtp.toFixed(2)}%`);
console.log(`Hit frequency (base game): ${hitFrequency.toFixed(2)}%`);
console.log(`Frecuencia de trigger FS:  ${triggerFrequency.toFixed(3)}% (1 cada ~${spinsPerTrigger} giros)`);
console.log('-'.repeat(60));
console.log('D-08 — spinWin promedio por posición dentro de la ronda de FS:');
for (let position = 0; position < FREE_SPINS_AWARDED; position++) {
  const count = winByPositionCount[position];
  const avg = count > 0 ? winByPositionSum[position] / count : 0;
  const zeroPct = count > 0 ? (zeroWinByPositionCount[position] / count) * 100 : 0;
  console.log(
    `  Giro ${position + 1}/${FREE_SPINS_AWARDED}: promedio ${avg.toFixed(3)} | % de giros en 0: ${zeroPct.toFixed(1)}% | muestras: ${count.toLocaleString('es-AR')}`
  );
}
console.log('='.repeat(60));
