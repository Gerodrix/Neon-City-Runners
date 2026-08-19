import express from 'express';
import cors from 'cors';
import { spin, buyBonus } from './slot/SlotEngine.js';
import { spinFreeSpins } from './slot/FreeSpinsLogic.js';
import { getOrCreateBalance, adjustBalance } from './slot/PlayerBalance.js';
import { MIN_BET_PER_LINE, MAX_BET_PER_LINE, BET_STEPS, MIN_TOPUP_AMOUNT, MAX_TOPUP_AMOUNT, BUY_BONUS_MULTIPLIER, CORE_BOOST_MULTIPLIER } from './config/SlotConfig.js';

const app = express();
const PORT = 4000;

app.use(cors());
app.use(express.json());

// El frontend pide los límites acá en vez de hardcodearlos — si el servidor
// cambia BET_STEPS/MIN/MAX, la UI se actualiza sola sin tocar el cliente.
app.get('/bet-config', (_req, res) => {
  res.json({
    minBetPerLine: MIN_BET_PER_LINE,
    maxBetPerLine: MAX_BET_PER_LINE,
    betSteps: BET_STEPS,
    buyBonusMultiplier: BUY_BONUS_MULTIPLIER,
    coreBoostMultiplier: CORE_BOOST_MULTIPLIER,
  });
});

app.get('/topup-config', (_req, res) => {
  res.json({ minTopupAmount: MIN_TOPUP_AMOUNT, maxTopupAmount: MAX_TOPUP_AMOUNT });
});

app.get('/balance', (req, res) => {
  const playerId = String(req.query.playerId ?? '');

  if (!playerId) {
    return res.status(400).json({ error: 'playerId es requerido' });
  }

  const balance = getOrCreateBalance(playerId);
  res.json({ balance });
});

// Recarga de saldo para pruebas — no existiría en un sistema real con dinero (D-16).
// El monto lo elige el jugador (antes era fijo en 1000).
app.post('/balance/topup', (req, res) => {
  const playerId = String(req.body?.playerId ?? '');
  const amount = Number(req.body?.amount);

  if (!playerId) {
    return res.status(400).json({ error: 'playerId es requerido' });
  }
  if (!Number.isFinite(amount) || amount < MIN_TOPUP_AMOUNT || amount > MAX_TOPUP_AMOUNT) {
    return res
      .status(400)
      .json({ error: `amount debe estar entre ${MIN_TOPUP_AMOUNT} y ${MAX_TOPUP_AMOUNT}` });
  }

  const balance = adjustBalance(playerId, amount);
  res.json({ balance });
});

app.post('/spin', (req, res) => {
  const betPerLine = Number(req.body?.betPerLine ?? 1);
  const playerId = String(req.body?.playerId ?? '');
  const coreBoostEnabled = Boolean(req.body?.coreBoostEnabled ?? false);

  if (!playerId) {
    return res.status(400).json({ error: 'playerId es requerido' });
  }
  if (!Number.isFinite(betPerLine) || betPerLine < MIN_BET_PER_LINE || betPerLine > MAX_BET_PER_LINE) {
    return res
      .status(400)
      .json({ error: `betPerLine debe estar entre ${MIN_BET_PER_LINE} y ${MAX_BET_PER_LINE}` });
  }

  const response = spin(betPerLine, playerId, coreBoostEnabled);

  if (!response.ok) {
    return res.status(400).json({ error: response.error });
  }

  res.json(response.result);
});

app.post('/buy-bonus', (req, res) => {
  const betPerLine = Number(req.body?.betPerLine ?? 1);
  const playerId = String(req.body?.playerId ?? '');

  if (!playerId) {
    return res.status(400).json({ error: 'playerId es requerido' });
  }
  if (!Number.isFinite(betPerLine) || betPerLine < MIN_BET_PER_LINE || betPerLine > MAX_BET_PER_LINE) {
    return res
      .status(400)
      .json({ error: `betPerLine debe estar entre ${MIN_BET_PER_LINE} y ${MAX_BET_PER_LINE}` });
  }

  const response = buyBonus(betPerLine, playerId);

  if (!response.ok) {
    return res.status(400).json({ error: response.error });
  }

  res.json(response.result);
});

app.post('/free-spin', (req, res) => {
  const sessionId = String(req.body?.sessionId ?? '');

  if (!sessionId) {
    return res.status(400).json({ error: 'sessionId es requerido' });
  }

  const response = spinFreeSpins(sessionId);

  if (!response.ok) {
    return res.status(400).json({ error: response.error });
  }

  res.json(response.result);
});

app.listen(PORT, () => {
  console.log(`Neon City Runners server escuchando en http://localhost:${PORT}`);
});
