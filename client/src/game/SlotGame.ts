import { Application, Container, Graphics, Sprite, Text } from 'pixi.js';
import { getSymbolTexture } from './SymbolAssets';
import { getPlayerId } from './PlayerId';
import { tweenValue, delay, Easing } from './Tween';

const GRID_REELS = 5;
const GRID_ROWS = 4;
const CELL_SIZE = 120;
const SERVER_URL = 'http://localhost:4000';

// Color placeholder por símbolo, hasta tener sprites reales.
const SYMBOL_COLORS: Record<string, number> = {
  RUNNER: 0xff2e88,
  NETRUNNER: 0x2effe0,
  CYBERDOG: 0xffb02e,
  DRONE: 0x8a2eff,
  A: 0x444455,
  K: 0x444455,
  Q: 0x444455,
  J: 0x444455,
  CORE: 0x00ffaa,
  SCATTER: 0xffee00,
  WILD: 0xff0055,
};

// Símbolos que se usan para el "blur" de giro — cualquiera de estos, es solo cosmético.
const SPIN_CYCLE_POOL = Object.keys(SYMBOL_COLORS);

interface GridPosition {
  reel: number;
  row: number;
}

interface LineWin {
  lineIndex: number;
  symbol: string;
  count: number;
  win: number;
  positions: GridPosition[];
}

interface SpinResult {
  spinId: string;
  grid: string[][];
  corePositions: GridPosition[];
  coreWildPositions: GridPosition[];
  lineWins: LineWin[];
  totalWin: number;
  freeSpinsTriggered: boolean;
  freeSpinsAwarded: number;
  freeSpinsSessionId: string | null;
  balance: number;
}

interface FreeSpinResult {
  spinId: string;
  grid: string[][];
  corePositions: GridPosition[];
  coreWildPositions: GridPosition[];
  lineWins: LineWin[];
  spinWin: number;
  sessionTotalWin: number;
  spinsRemaining: number;
  sessionOver: boolean;
  balance: number;
}

export class SlotGame {
  private gridContainer: Container;
  private fxLayer: Container;
  // Contenedores persistentes por celda — se actualizan in-place, nunca se destruyen,
  // así se puede animar cada rodillo por separado sin reconstruir todo el grid.
  private cellContainers: Container[][] = [];

  // El saldo que se ve en pantalla es siempre el que devuelve el servidor
  // (ver server/src/slot/PlayerBalance.ts) — el cliente nunca lo calcula.
  private balance = 0;
  private playerId: string;
  // Valores por defecto hasta que /bet-config y /topup-config respondan —
  // el servidor es la fuente de verdad real (D-20).
  private betSteps: number[] = [0.1, 0.2, 0.5, 1, 2, 5, 10];
  private betIndex = 3; // arranca en 1 (índice del array por defecto)
  private minTopupAmount = 1;
  private maxTopupAmount = 100000;
  private buyBonusMultiplier = 0; // 0 hasta que /bet-config responda — el botón queda deshabilitado mientras tanto
  private isSpinning = false;
  private wasInsufficientFunds = false;

  private get betPerLine(): number {
    return this.betSteps[this.betIndex];
  }

  constructor(private app: Application) {
    this.playerId = getPlayerId();
    this.gridContainer = new Container();
    this.gridContainer.x = 40;
    this.gridContainer.y = 40;
    this.app.stage.addChild(this.gridContainer);

    this.fxLayer = new Container();
    this.gridContainer.addChild(this.fxLayer); // mismas coordenadas que las celdas, se dibuja arriba

    this.buildGridCells();
    this.bindSpinButton();
    this.bindTopupControl();
    this.bindBetControls();
    this.bindBuyBonusButton();
    this.loadBetConfig();
    this.loadTopupConfig();
    this.loadInitialBalance();
  }

  private async loadBetConfig(): Promise<void> {
    try {
      const response = await fetch(`${SERVER_URL}/bet-config`);
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      const data: { minBetPerLine: number; maxBetPerLine: number; betSteps: number[]; buyBonusMultiplier: number } =
        await response.json();
      this.betSteps = data.betSteps;
      this.buyBonusMultiplier = data.buyBonusMultiplier;
      this.betIndex = Math.min(this.betIndex, this.betSteps.length - 1);
      this.updateBetDisplay();
      this.refreshSpinAvailability();
    } catch (error) {
      console.error('Error al obtener la configuración de apuesta:', error);
    }
  }

  private async loadTopupConfig(): Promise<void> {
    try {
      const response = await fetch(`${SERVER_URL}/topup-config`);
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      const data: { minTopupAmount: number; maxTopupAmount: number } = await response.json();
      this.minTopupAmount = data.minTopupAmount;
      this.maxTopupAmount = data.maxTopupAmount;
      const input = document.getElementById('topup-amount') as HTMLInputElement;
      input.min = String(this.minTopupAmount);
      input.max = String(this.maxTopupAmount);
    } catch (error) {
      console.error('Error al obtener la configuración de recarga:', error);
    }
  }

  private async loadInitialBalance(): Promise<void> {
    try {
      const response = await fetch(`${SERVER_URL}/balance?playerId=${this.playerId}`);
      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);
      const data: { balance: number } = await response.json();
      this.balance = data.balance;
      this.updateUI(0);
      this.refreshSpinAvailability();
    } catch (error) {
      console.error('Error al obtener el saldo inicial:', error);
    }
  }

  private bindTopupControl(): void {
    const button = document.getElementById('topup-btn') as HTMLButtonElement;
    const input = document.getElementById('topup-amount') as HTMLInputElement;

    button.addEventListener('click', async () => {
      const amount = Number(input.value);

      if (!Number.isFinite(amount) || amount < this.minTopupAmount || amount > this.maxTopupAmount) {
        this.setFreeSpinsStatus(`⚠️ El monto tiene que estar entre ${this.minTopupAmount} y ${this.maxTopupAmount}`);
        this.delay2500ThenHideIfNotInsufficient();
        return;
      }

      button.disabled = true;
      try {
        const response = await fetch(`${SERVER_URL}/balance/topup`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId: this.playerId, amount }),
        });
        if (!response.ok) {
          const errorBody = await response.json().catch(() => ({ error: 'Error desconocido' }));
          throw new Error(errorBody.error ?? `Error del servidor: ${response.status}`);
        }
        const data: { balance: number } = await response.json();
        this.balance = data.balance;
        this.updateUI(0);
        this.refreshSpinAvailability();
      } catch (error) {
        console.error('Error al recargar saldo:', error);
        this.setFreeSpinsStatus(`⚠️ ${error instanceof Error ? error.message : 'Error al recargar'}`);
        this.delay2500ThenHideIfNotInsufficient();
      } finally {
        button.disabled = false;
      }
    });
  }

  private refreshSpinAvailability(): void {
    const button = document.getElementById('spin-btn') as HTMLButtonElement;
    const totalBet = this.betPerLine * 12;
    const insufficientNow = this.balance < totalBet;

    if (insufficientNow) {
      button.disabled = true;
      this.setFreeSpinsStatus(`💸 Saldo insuficiente para apostar ${this.betPerLine} por línea — recargá saldo`);
    } else {
      if (!this.isSpinning) button.disabled = false;
      if (this.wasInsufficientFunds) this.hideFreeSpinsStatus();
    }

    this.wasInsufficientFunds = insufficientNow;
    this.refreshBuyBonusAvailability();
  }

  private refreshBuyBonusAvailability(): void {
    const button = document.getElementById('buy-bonus-btn') as HTMLButtonElement;

    if (this.buyBonusMultiplier <= 0) {
      button.textContent = 'Comprar Bonus (—)';
      button.disabled = true;
      return;
    }

    const cost = this.betPerLine * 12 * this.buyBonusMultiplier;
    button.textContent = `Comprar Bonus (${cost.toFixed(2)})`;
    button.disabled = this.isSpinning || this.balance < cost;
  }

  // ---------- Selector de apuesta ----------

  private bindBetControls(): void {
    const decreaseButton = document.getElementById('bet-decrease') as HTMLButtonElement;
    const increaseButton = document.getElementById('bet-increase') as HTMLButtonElement;

    decreaseButton.addEventListener('click', () => {
      if (this.isSpinning || this.betIndex <= 0) return;
      this.betIndex--;
      this.updateBetDisplay();
      this.refreshSpinAvailability();
    });

    increaseButton.addEventListener('click', () => {
      if (this.isSpinning || this.betIndex >= this.betSteps.length - 1) return;
      this.betIndex++;
      this.updateBetDisplay();
      this.refreshSpinAvailability();
    });

    this.updateBetDisplay();
  }

  private updateBetDisplay(): void {
    document.getElementById('bet-value')!.textContent = this.betPerLine.toString();
    (document.getElementById('bet-decrease') as HTMLButtonElement).disabled = this.isSpinning || this.betIndex <= 0;
    (document.getElementById('bet-increase') as HTMLButtonElement).disabled =
      this.isSpinning || this.betIndex >= this.betSteps.length - 1;
  }

  // ---------- Grid: construcción y dibujo de celdas ----------

  private buildGridCells(): void {
    for (let reel = 0; reel < GRID_REELS; reel++) {
      this.cellContainers[reel] = [];
      for (let row = 0; row < GRID_ROWS; row++) {
        const cell = new Container();
        cell.x = reel * CELL_SIZE;
        cell.y = row * CELL_SIZE;
        this.gridContainer.addChildAt(cell, 0); // debajo del fxLayer
        this.cellContainers[reel][row] = cell;
        this.setCellSymbol(reel, row, null);
      }
    }
  }

  /** Dibuja el contenido de una celda in-place: sprite real si existe, si no el placeholder de color. */
  private setCellSymbol(reel: number, row: number, symbol: string | null): void {
    const cell = this.cellContainers[reel][row];
    cell.removeChildren();

    if (!symbol) {
      cell.addChild(new Graphics().rect(0, 0, CELL_SIZE - 8, CELL_SIZE - 8).fill({ color: 0x1a1a2a }));
      return;
    }

    const texture = getSymbolTexture(symbol);
    if (texture) {
      const sprite = new Sprite(texture);
      sprite.width = CELL_SIZE - 8;
      sprite.height = CELL_SIZE - 8;
      cell.addChild(sprite);
      return;
    }

    const color = SYMBOL_COLORS[symbol] ?? 0x444455;
    cell.addChild(new Graphics().rect(0, 0, CELL_SIZE - 8, CELL_SIZE - 8).fill({ color }));
    const label = new Text({ text: symbol, style: { fontSize: 12, fill: 0xffffff } });
    label.x = 6;
    label.y = 6;
    cell.addChild(label);
  }

  private randomSpinSymbol(): string {
    return SPIN_CYCLE_POOL[Math.floor(Math.random() * SPIN_CYCLE_POOL.length)];
  }

  // ---------- Animación de giro ----------

  /**
   * Gira los 5 rodillos con un "blur" de símbolos aleatorios y los va deteniendo
   * en cascada (cada rodillo para un poco después que el anterior), hasta asentarse
   * en el resultado real que ya vino del servidor.
   */
  private async animateSpinAndReveal(finalGrid: string[][]): Promise<void> {
    const reelPromises = Array.from({ length: GRID_REELS }, (_, reel) => {
      const reelDurationMs = 450 + reel * 150; // cascada: reel 0 para primero, reel 4 último
      return this.spinReelColumn(reel, finalGrid, reelDurationMs);
    });
    await Promise.all(reelPromises);
  }

  private spinReelColumn(reel: number, finalGrid: string[][], durationMs: number): Promise<void> {
    const cycleIntervalMs = 55;

    return new Promise((resolve) => {
      const startedAt = performance.now();

      const cycle = () => {
        const elapsed = performance.now() - startedAt;

        if (elapsed >= durationMs) {
          for (let row = 0; row < GRID_ROWS; row++) {
            this.setCellSymbol(reel, row, finalGrid[reel][row]);
          }
          resolve();
          return;
        }

        for (let row = 0; row < GRID_ROWS; row++) {
          this.setCellSymbol(reel, row, this.randomSpinSymbol());
        }
        setTimeout(cycle, cycleIntervalMs);
      };

      cycle();
    });
  }

  // ---------- Efectos: líneas ganadoras, Core AI, Wilds ----------

  private async highlightWinningLines(lineWins: LineWin[]): Promise<void> {
    if (lineWins.length === 0) return;

    const glowRects: Graphics[] = [];
    for (const lineWin of lineWins) {
      for (const pos of lineWin.positions) {
        const glow = new Graphics().rect(-4, -4, CELL_SIZE, CELL_SIZE).stroke({ width: 4, color: 0xff2e88 });
        glow.x = pos.reel * CELL_SIZE;
        glow.y = pos.row * CELL_SIZE;
        glow.alpha = 0;
        this.fxLayer.addChild(glow);
        glowRects.push(glow);
      }
    }

    await tweenValue(0, 1, 200, (v) => glowRects.forEach((g) => (g.alpha = v)));
    await delay(500);
    await tweenValue(1, 0, 300, (v) => glowRects.forEach((g) => (g.alpha = v)));

    glowRects.forEach((g) => this.fxLayer.removeChild(g));
  }

  private async pulseCore(pos: GridPosition): Promise<void> {
    const ring = new Graphics().rect(0, 0, CELL_SIZE - 8, CELL_SIZE - 8).stroke({ width: 4, color: 0x00ffaa });
    ring.x = pos.reel * CELL_SIZE;
    ring.y = pos.row * CELL_SIZE;
    this.fxLayer.addChild(ring);

    await tweenValue(1, 0, 550, (v) => (ring.alpha = v), Easing.linear);
    this.fxLayer.removeChild(ring);
  }

  /** Efecto glitch: la celda parpadea entre colores antes de asentarse en su símbolo final (el Wild). */
  private async glitchFlicker(pos: GridPosition, finalSymbol: string): Promise<void> {
    const flickerColors = [0xffffff, 0x33f2c7, 0xff2e88, 0x0a0a12];
    const cell = this.cellContainers[pos.reel][pos.row];

    for (let i = 0; i < 5; i++) {
      cell.removeChildren();
      cell.addChild(new Graphics().rect(0, 0, CELL_SIZE - 8, CELL_SIZE - 8).fill({ color: flickerColors[i % flickerColors.length] }));
      await delay(45);
    }

    this.setCellSymbol(pos.reel, pos.row, finalSymbol);
  }

  private async playCoreEffects(corePositions: GridPosition[], coreWildPositions: GridPosition[]): Promise<void> {
    if (corePositions.length === 0 && coreWildPositions.length === 0) return;

    await Promise.all([
      ...corePositions.map((pos) => this.pulseCore(pos)),
      ...coreWildPositions.map((pos) => this.glitchFlicker(pos, 'WILD')),
    ]);
  }

  private async showAccessGrantedOverlay(): Promise<void> {
    const text = new Text({
      text: 'ACCESS GRANTED',
      style: { fontSize: 40, fontWeight: 'bold', fill: 0x33f2c7, stroke: { color: 0xff2e88, width: 3 } },
    });
    text.anchor.set(0.5);
    text.x = this.app.screen.width / 2;
    text.y = this.app.screen.height / 2;
    text.alpha = 0;
    this.app.stage.addChild(text);

    // Glitch corto antes de asentarse — tironeo horizontal + parpadeo.
    for (let i = 0; i < 5; i++) {
      text.x = this.app.screen.width / 2 + (Math.random() - 0.5) * 24;
      text.alpha = Math.random() > 0.25 ? 1 : 0;
      await delay(55);
    }
    text.x = this.app.screen.width / 2;
    text.alpha = 1;

    await delay(700);
    await tweenValue(1, 0, 400, (v) => (text.alpha = v));
    this.app.stage.removeChild(text);
  }

  // ---------- Buy Bonus (NCR-E11) ----------

  private bindBuyBonusButton(): void {
    const button = document.getElementById('buy-bonus-btn') as HTMLButtonElement;
    button.addEventListener('click', () => this.handleBuyBonus(button));
  }

  private async handleBuyBonus(button: HTMLButtonElement): Promise<void> {
    if (this.isSpinning) return;
    this.isSpinning = true;
    button.disabled = true;
    (document.getElementById('spin-btn') as HTMLButtonElement).disabled = true;
    this.updateBetDisplay();

    try {
      const response = await fetch(`${SERVER_URL}/buy-bonus`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betPerLine: this.betPerLine, playerId: this.playerId }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorBody.error ?? `Error del servidor: ${response.status}`);
      }

      const result: { spinId: string; buyCost: number; freeSpinsSessionId: string; balance: number } =
        await response.json();
      console.log('Bonus comprado:', result);

      this.balance = result.balance;
      this.updateUI(-result.buyCost);
      this.refreshSpinAvailability();

      await this.showAccessGrantedOverlay();
      await this.playFreeSpinsRound(result.freeSpinsSessionId);
    } catch (error) {
      console.error('Error al comprar el bonus:', error);
      const message = error instanceof Error ? error.message : 'Error al comprar el bonus';
      this.setFreeSpinsStatus(`⚠️ ${message}`);

      if (message !== 'Saldo insuficiente') {
        this.delay2500ThenHideIfNotInsufficient();
      }
    } finally {
      this.isSpinning = false;
      this.refreshSpinAvailability();
      this.updateBetDisplay();
    }
  }

  // ---------- Flujo principal ----------

  private bindSpinButton(): void {
    const button = document.getElementById('spin-btn') as HTMLButtonElement;
    button.addEventListener('click', () => this.handleSpin(button));
  }

  private async handleSpin(button: HTMLButtonElement): Promise<void> {
    if (this.isSpinning) return;
    this.isSpinning = true;
    button.disabled = true;
    (document.getElementById('buy-bonus-btn') as HTMLButtonElement).disabled = true;
    this.updateBetDisplay(); // bloquea también los botones de apuesta mientras gira

    try {
      const response = await fetch(`${SERVER_URL}/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betPerLine: this.betPerLine, playerId: this.playerId }),
      });

      if (!response.ok) {
        const errorBody = await response.json().catch(() => ({ error: 'Error desconocido' }));
        throw new Error(errorBody.error ?? `Error del servidor: ${response.status}`);
      }

      const result: SpinResult = await response.json();
      console.log('Resultado del giro:', result);

      await this.animateSpinAndReveal(result.grid);

      this.balance = result.balance; // saldo autoritativo del servidor, no calculado acá
      this.updateUI(result.totalWin);
      this.refreshSpinAvailability();

      await this.highlightWinningLines(result.lineWins);
      await this.playCoreEffects(result.corePositions, result.coreWildPositions);

      if (result.freeSpinsTriggered && result.freeSpinsSessionId) {
        await this.showAccessGrantedOverlay();
        await this.playFreeSpinsRound(result.freeSpinsSessionId);
      }
    } catch (error) {
      console.error('Error al girar:', error);
      const message = error instanceof Error ? error.message : 'Error al girar';
      this.setFreeSpinsStatus(`⚠️ ${message}`);

      if (message !== 'Saldo insuficiente') {
        this.delay2500ThenHideIfNotInsufficient();
      }
    } finally {
      this.isSpinning = false;
      this.refreshSpinAvailability();
      this.updateBetDisplay();
    }
  }

  private delay2500ThenHideIfNotInsufficient(): void {
    delay(2500).then(() => {
      if (!this.wasInsufficientFunds) this.hideFreeSpinsStatus();
    });
  }

  /**
   * Juega automáticamente todos los giros de una ronda de Free Spins, uno tras otro,
   * hasta que el servidor indica que la sesión terminó (D-11: sin click adicional del jugador).
   */
  private async playFreeSpinsRound(sessionId: string): Promise<void> {
    while (true) {
      const response = await fetch(`${SERVER_URL}/free-spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId }),
      });

      if (!response.ok) {
        console.error('Error en free-spin:', await response.text());
        break;
      }

      const result: FreeSpinResult = await response.json();
      console.log('Giro de Free Spins:', result);

      await this.animateSpinAndReveal(result.grid);

      this.balance = result.balance;
      this.setFreeSpinsStatus(
        `HEIST MODE — Giros restantes: ${result.spinsRemaining} | Ganancia de la ronda: ${result.sessionTotalWin.toFixed(2)}`
      );

      await this.highlightWinningLines(result.lineWins);
      await this.playCoreEffects(result.corePositions, result.coreWildPositions);

      if (result.sessionOver) {
        this.balance = result.balance;
        this.updateUI(result.sessionTotalWin);
        this.setFreeSpinsStatus(`Heist completado — Ganancia total: ${result.sessionTotalWin.toFixed(2)}`);
        await delay(2000);
        this.hideFreeSpinsStatus();
        break;
      }

      await delay(300);
    }
  }

  private setFreeSpinsStatus(text: string): void {
    const el = document.getElementById('fs-status')!;
    el.textContent = text;
    el.style.display = 'inline';
  }

  private hideFreeSpinsStatus(): void {
    document.getElementById('fs-status')!.style.display = 'none';
  }

  private updateUI(lastWin: number): void {
    document.getElementById('balance')!.textContent = `Saldo: ${this.balance.toFixed(2)}`;
    document.getElementById('win')!.textContent = `Último premio: ${lastWin.toFixed(2)}`;
  }
}
