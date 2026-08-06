import { Application, Container, Graphics, Text } from 'pixi.js';

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

interface SpinResult {
  grid: string[][];
  totalWin: number;
  freeSpinsTriggered: boolean;
  freeSpinsAwarded: number;
  freeSpinsSessionId: string | null;
}

interface FreeSpinResult {
  grid: string[][];
  spinWin: number;
  sessionTotalWin: number;
  spinsRemaining: number;
  sessionOver: boolean;
}

export class SlotGame {
  private gridContainer: Container;
  private balance = 1000;
  private betPerLine = 1;
  private isSpinning = false;

  constructor(private app: Application) {
    this.gridContainer = new Container();
    this.gridContainer.x = 40;
    this.gridContainer.y = 40;
    this.app.stage.addChild(this.gridContainer);

    this.drawEmptyGrid();
    this.bindSpinButton();
  }

  private drawEmptyGrid(): void {
    this.gridContainer.removeChildren();
    for (let reel = 0; reel < GRID_REELS; reel++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        const cell = new Graphics()
          .rect(0, 0, CELL_SIZE - 8, CELL_SIZE - 8)
          .fill({ color: 0x1a1a2a });
        cell.x = reel * CELL_SIZE;
        cell.y = row * CELL_SIZE;
        this.gridContainer.addChild(cell);
      }
    }
  }

  private renderGrid(grid: string[][]): void {
    this.gridContainer.removeChildren();
    for (let reel = 0; reel < GRID_REELS; reel++) {
      for (let row = 0; row < GRID_ROWS; row++) {
        const symbol = grid[reel][row];
        const color = SYMBOL_COLORS[symbol] ?? 0x444455;

        const cell = new Graphics()
          .rect(0, 0, CELL_SIZE - 8, CELL_SIZE - 8)
          .fill({ color });
        cell.x = reel * CELL_SIZE;
        cell.y = row * CELL_SIZE;
        this.gridContainer.addChild(cell);

        const label = new Text({ text: symbol, style: { fontSize: 12, fill: 0xffffff } });
        label.x = cell.x + 6;
        label.y = cell.y + 6;
        this.gridContainer.addChild(label);
      }
    }
  }

  private bindSpinButton(): void {
    const button = document.getElementById('spin-btn') as HTMLButtonElement;
    button.addEventListener('click', () => this.handleSpin(button));
  }

  private async handleSpin(button: HTMLButtonElement): Promise<void> {
    if (this.isSpinning) return;
    this.isSpinning = true;
    button.disabled = true;

    try {
      const response = await fetch(`${SERVER_URL}/spin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betPerLine: this.betPerLine }),
      });

      if (!response.ok) throw new Error(`Error del servidor: ${response.status}`);

      const result: SpinResult = await response.json();
      console.log('Resultado del giro:', result);

      this.renderGrid(result.grid);
      this.balance = this.balance - this.betPerLine * 12 + result.totalWin;
      this.updateUI(result.totalWin);

      if (result.freeSpinsTriggered && result.freeSpinsSessionId) {
        await this.playFreeSpinsRound(result.freeSpinsSessionId);
      }
    } catch (error) {
      console.error('Error al girar:', error);
    } finally {
      this.isSpinning = false;
      button.disabled = false;
    }
  }

  /**
   * Juega automáticamente todos los giros de una ronda de Free Spins, uno tras otro,
   * hasta que el servidor indica que la sesión terminó (D-11: sin click adicional del jugador).
   */
  private async playFreeSpinsRound(sessionId: string): Promise<void> {
    this.setFreeSpinsStatus('🔓 ACCESS GRANTED — Entrando a Heist Free Spins...');
    await this.delay(700);

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

      this.renderGrid(result.grid);
      this.setFreeSpinsStatus(
        `HEIST MODE — Giros restantes: ${result.spinsRemaining} | Ganancia de la ronda: ${result.sessionTotalWin.toFixed(2)}`
      );

      await this.delay(800);

      if (result.sessionOver) {
        this.balance += result.sessionTotalWin;
        this.updateUI(result.sessionTotalWin);
        this.setFreeSpinsStatus(`Heist completado — Ganancia total: ${result.sessionTotalWin.toFixed(2)}`);
        await this.delay(2000);
        this.hideFreeSpinsStatus();
        break;
      }
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
