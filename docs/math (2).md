# Matemática del juego — v1

## Símbolos

| Símbolo | Rol | Paga línea (3/4/5) | Sustituye |
|---|---|---|---|
| Runner (high) | Alto | 5 / 25 / 100 | — |
| Netrunner (high) | Alto | 4 / 20 / 75 | — |
| CyberDog (high) | Medio-alto | 3 / 15 / 50 | — |
| Drone (high) | Medio | 2 / 10 / 35 | — |
| A (low) | Bajo | 1 / 5 / 20 | — |
| K (low) | Bajo | 1 / 4 / 15 | — |
| Q (low) | Bajo | 0.5 / 3 / 10 | — |
| J (low) | Bajo | 0.5 / 2 / 8 | — |
| Glitch (WILD) | Especial | sin pago propio en v1 | sí, a todo excepto Scatter y Core |
| Core AI | Generador | sin pago directo | no |
| Data Vault (SCATTER) | Trigger | 2x / 10x / 50x apuesta total (3/4/5 en cualquier posición) | no |

Pagos en "monedas por línea apostada". El Wild no tiene tabla propia en v1, solo sustituye — decisión para simplificar el balanceo inicial.

## Reel strips (v1, 40 símbolos por rodillo, misma distribución en los 5 rodillos)

| Símbolo | Cantidad / 40 | Prob. por posición |
|---|---|---|
| Runner | 2 | 5% |
| Netrunner | 3 | 7.5% |
| CyberDog | 3 | 7.5% |
| Drone | 4 | 10% |
| A | 6 | 15% |
| K | 6 | 15% |
| Q | 6 | 15% |
| J | 6 | 15% |
| Core AI | 2 | 5% |
| Data Vault (Scatter) | 2 | 5% |

El Wild **no está en el reel strip**: solo aparece generado por el Core AI.

- **Pro** de este diseño: la matemática es más controlable — se ajusta la volatilidad cambiando cuántos wilds genera cada Core, sin tocar el strip.
- **Contra**: si el Core sale poco, el juego puede sentirse "seco" en tramos largos. Hay que vigilar la hit frequency en la simulación.

## Core AI → Wilds
- Cada Core AI que cae en el grid genera entre **2 y 4 wilds** en posiciones aleatorias del grid (excluyendo posiciones donde ya hay Core o Scatter).
- Puede haber más de un Core AI por giro; cada uno genera su propio set de wilds.

## Scatter → Heist Free Spins
- 3+ Data Vault en cualquier posición → activa **8 Free Spins**.
- En Free Spins: los Core AI que caen quedan **sticky** (pegajosos) y siguen generando wilds en cada giro subsiguiente — lógica pendiente de implementar (requiere estado de sesión entre giros).

## Cómo se calcula el RTP
RTP = suma de:
1. **EV de líneas base**: para cada línea y cada combinación posible, `prob(combinación) × payout`, sumado sobre las 12 líneas.
2. **Contribución del Core AI**: los wilds generados aumentan la probabilidad de líneas ganadoras — no es calculable a mano de forma confiable por la aleatoriedad de posiciones, se mide por **simulación Monte Carlo** (ej. 1–5 millones de giros).
3. **Contribución de Scatter/Free Spins**: `prob(trigger) × ganancia promedio de una sesión de Free Spins`.

El RTP real de esta v1 todavía no está validado — próximo paso: script de simulación que reutilice `SlotEngine.ts` para tirar un número honesto (sin inflar métricas en el README/CV).
