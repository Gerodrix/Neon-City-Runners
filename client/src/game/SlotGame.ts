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
// Símbolos que se usan para el "blur" de giro — WILD queda afuera a propósito: nunca
// está en el reel strip real (solo lo genera el Core), así que tampoco debería aparecer
// mientras el rodillo gira, como si cayera del carretel.
const SPIN_CYCLE_POOL = Object.keys(SYMBOL_COLORS).filter((s) => s !== 'WILD');
const REGULAR_SYMBOLS = ['RUNNER', 'NETRUNNER', 'CYBERDOG', 'DRONE', 'A', 'K', 'Q', 'J'];

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

    const cellSize = CELL_SIZE - 8;

    // Marco uniforme detrás de TODO — sin esto, los retratos (Runner, CyberDog...) se ven
    // "pelados" al lado de A/K/Q/J/WILD, que ya traen su propio borde HUD dibujado en el PNG.
    // Con este fondo + inset parejo, todas las celdas quedan con el mismo peso visual
    // sin tener que volver a tocar ninguna imagen.
    const frame = new Graphics()
      .roundRect(0, 0, cellSize, cellSize, 6)
      .fill({ color: 0x0f0f1a })
      .stroke({ width: 1.5, color: 0x33f2c7, alpha: 0.35 });
    cell.addChild(frame);

    if (!symbol) return; // celda vacía: queda solo el marco, como placeholder

    const inset = 6;
    const innerSize = cellSize - inset * 2;

    const texture = getSymbolTexture(symbol);
    if (texture) {
      const sprite = new Sprite(texture);
      sprite.width = innerSize;
      sprite.height = innerSize;
      sprite.x = inset;
      sprite.y = inset;
      cell.addChild(sprite);
      return;
    }

    const color = SYMBOL_COLORS[symbol] ?? 0x444455;
    const swatch = new Graphics().roundRect(inset, inset, innerSize, innerSize, 4).fill({ color });
    cell.addChild(swatch);
    const label = new Text({ text: symbol, style: { fontSize: 12, fill: 0xffffff } });
    label.x = inset + 4;
    label.y = inset + 4;
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
   *
   * `wildPositions`: las celdas que el Core convirtió en Wild ese giro. Ahí el rodillo
   * NO se detiene mostrando el Wild directo — se asienta en un símbolo normal cualquiera,
   * y es `playCoreEffects` (glitchFlicker) el que lo transforma después. Así se ve al Core
   * "trabajando" en vez de que el Wild parezca uno más que cayó del carretel.
   */
  private async animateSpinAndReveal(finalGrid: string[][], wildPositions: GridPosition[] = []): Promise<void> {
    const maskSet = new Set(wildPositions.map((p) => `${p.reel}-${p.row}`));
    const reelPromises = Array.from({ length: GRID_REELS }, (_, reel) => {
      const reelDurationMs = 450 + reel * 150; // cascada: reel 0 para primero, reel 4 último
      return this.spinReelColumn(reel, finalGrid, reelDurationMs, maskSet);
    });
    await Promise.all(reelPromises);
  }

  private randomRegularSymbol(): string {
    return REGULAR_SYMBOLS[Math.floor(Math.random() * REGULAR_SYMBOLS.length)];
  }

  private spinReelColumn(reel: number, finalGrid: string[][], durationMs: number, maskSet: Set<string>): Promise<void> {
    const cycleIntervalMs = 55;

    return new Promise((resolve) => {
      const startedAt = performance.now();

      const cycle = () => {
        const elapsed = performance.now() - startedAt;

        if (elapsed >= durationMs) {
          for (let row = 0; row < GRID_ROWS; row++) {
            const isWildToTransform = maskSet.has(`${reel}-${row}`);
            const displaySymbol = isWildToTransform ? this.randomRegularSymbol() : finalGrid[reel][row];
            this.setCellSymbol(reel, row, displaySymbol);
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

  // ---------- Efectos: líneas ganadoras, Core AI, Wilds, cartel de premio ----------

  private cellCenter(pos: GridPosition): { x: number; y: number } {
    const size = CELL_SIZE - 8;
    return { x: pos.reel * CELL_SIZE + size / 2, y: pos.row * CELL_SIZE + size / 2 };
  }

  private readonly WIN_LINE_COLORS = [0xff2e88, 0x33f2c7, 0x8a2eff, 0xffee00];

  private async highlightWinningLines(lineWins: LineWin[]): Promise<void> {
    if (lineWins.length === 0) return;

    // Agrupado por celda (no por línea) — si una celda gana en dos líneas a la vez,
    // el pop y las partículas no se duplican sobre ella.
    const uniqueCells = new Map<string, GridPosition>();
    for (const lineWin of lineWins) {
      for (const pos of lineWin.positions) {
        uniqueCells.set(`${pos.reel}-${pos.row}`, pos);
      }
    }
    const cells = Array.from(uniqueCells.values());

    // Cada línea arranca con un pequeño delay entre sí y un color distinto — si ganan
    // varias a la vez (común con el tablero cargado de Wilds), no se leen como ruido
    // superpuesto, se distinguen una de otra.
    const linePromises = lineWins.map(async (lineWin, index) => {
      await delay(index * 70);
      await this.drawWinLine(lineWin.positions, this.WIN_LINE_COLORS[index % this.WIN_LINE_COLORS.length]);
    });

    await Promise.all([...linePromises, ...cells.map((pos) => this.popCell(pos)), ...cells.map((pos) => this.spawnParticleBurst(pos))]);
  }

  /**
   * Línea que conecta, en orden, las celdas de una combinación ganadora — sigue el
   * patrón real de la línea (incluye zigzags, usa las `positions` que ya manda el
   * servidor). Cada tramo tiene un quiebre a mitad de camino en vez de ser una recta
   * perfecta, para que se lea como un circuito/nodo de hackeo, no una línea de casino genérica.
   */
  private async drawWinLine(positions: GridPosition[], color: number): Promise<void> {
    if (positions.length === 0) return;

    const points = positions.map((p) => this.cellCenter(p));

    const line = new Graphics();
    line.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const midX = (prev.x + curr.x) / 2 + (Math.random() - 0.5) * 10;
      const midY = (prev.y + curr.y) / 2 + (Math.random() - 0.5) * 10;
      line.lineTo(midX, midY);
      line.lineTo(curr.x, curr.y);
    }
    line.stroke({ width: 3, color });
    line.alpha = 0;
    this.fxLayer.addChild(line);

    const nodes = points.map((p) => {
      const node = new Graphics().circle(0, 0, 6).fill({ color });
      node.x = p.x;
      node.y = p.y;
      node.alpha = 0;
      this.fxLayer.addChild(node);
      return node;
    });

    await tweenValue(0, 1, 200, (v) => {
      line.alpha = v;
      nodes.forEach((n) => (n.alpha = v));
    });
    await delay(450);
    await tweenValue(1, 0, 300, (v) => {
      line.alpha = v;
      nodes.forEach((n) => (n.alpha = v));
    });

    this.fxLayer.removeChild(line);
    nodes.forEach((n) => this.fxLayer.removeChild(n));
  }

  /** Pequeño "pop" de escala en la celda — refuerza visualmente que ese símbolo formó parte de un premio. */
  private async popCell(pos: GridPosition): Promise<void> {
    const cell = this.cellContainers[pos.reel][pos.row];
    const size = CELL_SIZE - 8;
    const baseX = pos.reel * CELL_SIZE;
    const baseY = pos.row * CELL_SIZE;

    cell.pivot.set(size / 2, size / 2);
    cell.x = baseX + size / 2;
    cell.y = baseY + size / 2;

    await tweenValue(1, 1.15, 150, (v) => cell.scale.set(v), Easing.easeOutBack);
    await tweenValue(1.15, 1, 150, (v) => cell.scale.set(v));

    // Restaurar transform original — si no, el próximo setCellSymbol queda mal posicionado.
    cell.pivot.set(0, 0);
    cell.x = baseX;
    cell.y = baseY;
  }

  /** Ráfaga de partículas radiando desde el centro de una celda ganadora. */
  private async spawnParticleBurst(pos: GridPosition): Promise<void> {
    const center = this.cellCenter(pos);
    const count = 6;
    const particlePromises: Promise<void>[] = [];

    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const distance = 26 + Math.random() * 12;
      const targetX = center.x + Math.cos(angle) * distance;
      const targetY = center.y + Math.sin(angle) * distance;

      const particle = new Graphics().circle(0, 0, 3).fill({ color: 0xff2e88 });
      particle.x = center.x;
      particle.y = center.y;
      this.fxLayer.addChild(particle);

      const p = tweenValue(0, 1, 450, (v) => {
        particle.x = center.x + (targetX - center.x) * v;
        particle.y = center.y + (targetY - center.y) * v;
        particle.alpha = 1 - v;
      }).then(() => {
        this.fxLayer.removeChild(particle);
      });

      particlePromises.push(p);
    }

    await Promise.all(particlePromises);
  }

  private async pulseCore(pos: GridPosition): Promise<void> {
    const ring = new Graphics().rect(0, 0, CELL_SIZE - 8, CELL_SIZE - 8).stroke({ width: 4, color: 0x00ffaa });
    ring.x = pos.reel * CELL_SIZE;
    ring.y = pos.row * CELL_SIZE;
    this.fxLayer.addChild(ring);

    await tweenValue(1, 0, 550, (v) => (ring.alpha = v), Easing.linear);
    this.fxLayer.removeChild(ring);
  }

  /** Rayo glitch (línea quebrada) desde un Core hasta un Wild que generó — deja claro que uno causó al otro. */
  private async drawGlitchBeam(from: GridPosition, to: GridPosition): Promise<void> {
    const p1 = this.cellCenter(from);
    const p2 = this.cellCenter(to);
    const segments = 4;
    const jitter = 14;

    const line = new Graphics();
    line.moveTo(p1.x, p1.y);
    for (let i = 1; i <= segments; i++) {
      const t = i / segments;
      const jitterX = i < segments ? (Math.random() - 0.5) * jitter * 2 : 0;
      const jitterY = i < segments ? (Math.random() - 0.5) * jitter * 2 : 0;
      line.lineTo(p1.x + (p2.x - p1.x) * t + jitterX, p1.y + (p2.y - p1.y) * t + jitterY);
    }
    line.stroke({ width: 2, color: 0x33f2c7 });
    line.alpha = 0;
    this.fxLayer.addChild(line);

    await tweenValue(0, 1, 90, (v) => (line.alpha = v));
    await delay(140);
    await tweenValue(1, 0, 250, (v) => (line.alpha = v));
    this.fxLayer.removeChild(line);
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

  /**
   * Secuencia causa->efecto: primero el pulso del Core + el rayo hacia el Wild que va a generar,
   * y un poco después (120ms, no full-wait, para que no se sienta lento) el Wild arranca su glitch
   * de asentamiento. Cada wild se conecta con un Core al azar entre los que cayeron — no hace falta
   * la pareja exacta para que se lea bien, y evita dibujar N×M rayos cuando hay varios Cores juntos.
   */
  private async playCoreEffects(corePositions: GridPosition[], coreWildPositions: GridPosition[]): Promise<void> {
    if (corePositions.length === 0 && coreWildPositions.length === 0) return;

    const beamPromises =
      corePositions.length > 0
        ? coreWildPositions.map((wildPos) => {
            const fromCore = corePositions[Math.floor(Math.random() * corePositions.length)];
            return this.drawGlitchBeam(fromCore, wildPos);
          })
        : [];
    const pulsePromises = corePositions.map((pos) => this.pulseCore(pos));

    await delay(120);
    const flickerPromises = coreWildPositions.map((pos) => this.glitchFlicker(pos, 'WILD'));

    await Promise.all([...beamPromises, ...pulsePromises, ...flickerPromises]);
  }

  /** Cartel de premio grande con contador, entre giros — solo aparece si el premio supera 3x la apuesta total. */
  private async showWinBanner(winAmount: number, totalBet: number): Promise<void> {
    const ratio = totalBet > 0 ? winAmount / totalBet : 0;
    let label = '';
    let color = 0x33f2c7;

    if (ratio >= 50) {
      label = 'EPIC WIN';
      color = 0xffee00;
    } else if (ratio >= 20) {
      label = 'MEGA WIN';
      color = 0xff2e88;
    } else if (ratio >= 8) {
      label = 'BIG WIN';
      color = 0x8a2eff;
    } else if (ratio >= 3) {
      label = 'NICE WIN';
      color = 0x33f2c7;
    } else {
      return; // no amerita cartel — el highlight de línea ya alcanza para premios chicos
    }

    const title = new Text({
      text: label,
      style: { fontSize: 36, fontWeight: 'bold', fill: color, stroke: { color: 0x0a0a12, width: 4 } },
    });
    title.anchor.set(0.5);
    title.x = this.app.screen.width / 2;
    title.y = this.app.screen.height / 2 - 30;
    title.alpha = 0;
    title.scale.set(0.5);
    this.app.stage.addChild(title);

    const amountText = new Text({ text: '0.00', style: { fontSize: 26, fontWeight: 'bold', fill: 0xffffff } });
    amountText.anchor.set(0.5);
    amountText.x = this.app.screen.width / 2;
    amountText.y = this.app.screen.height / 2 + 20;
    amountText.alpha = 0;
    this.app.stage.addChild(amountText);

    await Promise.all([
      tweenValue(0, 1, 300, (v) => (title.alpha = v)),
      tweenValue(0.5, 1, 300, (v) => title.scale.set(v), Easing.easeOutBack),
    ]);
    amountText.alpha = 1;
    await tweenValue(0, winAmount, 900, (v) => (amountText.text = v.toFixed(2)));

    await delay(900);

    await Promise.all([
      tweenValue(1, 0, 400, (v) => (title.alpha = v)),
      tweenValue(1, 0, 400, (v) => (amountText.alpha = v)),
    ]);
    this.app.stage.removeChild(title);
    this.app.stage.removeChild(amountText);
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

      const result: {
        spinId: string;
        grid: string[][];
        corePositions: GridPosition[];
        coreWildPositions: GridPosition[];
        buyCost: number;
        freeSpinsSessionId: string;
        balance: number;
      } = await response.json();
      console.log('Bonus comprado:', result);

      this.balance = result.balance;
      this.refreshSpinAvailability();

      // Giro visual que confirma la compra (con el trigger garantizado) — no paga
      // líneas, el precio ya cubre solo la ronda de Free Spins (ver GDD, D-23).
      await this.animateSpinAndReveal(result.grid, result.coreWildPositions);
      this.updateUI(-result.buyCost);
      await this.playCoreEffects(result.corePositions, result.coreWildPositions);

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

      await this.animateSpinAndReveal(result.grid, result.coreWildPositions);

      this.balance = result.balance; // saldo autoritativo del servidor, no calculado acá
      this.updateUI(result.totalWin);
      this.refreshSpinAvailability();

      await this.highlightWinningLines(result.lineWins);
      await this.playCoreEffects(result.corePositions, result.coreWildPositions);
      await this.showWinBanner(result.totalWin, this.betPerLine * 12);

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

      await this.animateSpinAndReveal(result.grid, result.coreWildPositions);

      this.balance = result.balance;
      this.setFreeSpinsStatus(
        `HEIST MODE — Giros restantes: ${result.spinsRemaining} | Ganancia de la ronda: ${result.sessionTotalWin.toFixed(2)}`
      );

      await this.highlightWinningLines(result.lineWins);
      await this.playCoreEffects(result.corePositions, result.coreWildPositions);
      await this.showWinBanner(result.spinWin, this.betPerLine * 12);

      if (result.sessionOver) {
        this.balance = result.balance;
        this.updateUI(result.sessionTotalWin);
        this.setFreeSpinsStatus(`Heist completado — Ganancia total: ${result.sessionTotalWin.toFixed(2)}`);
        await this.showWinBanner(result.sessionTotalWin, this.betPerLine * 12);
        await delay(1200);
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
