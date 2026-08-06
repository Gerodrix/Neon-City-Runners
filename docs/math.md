# Matemática del juego — v1

## Símbolos

| Símbolo | Rol | Paga línea (3/4/5) | Sustituye |
|---|---|---|---|
| Runner (high) | Alto | 6.5 / 34 / 136 | — |
| Netrunner (high) | Alto | 5.5 / 27 / 103 | — |
| CyberDog (high) | Medio-alto | 4.4 / 21 / 69 | — |
| Drone (high) | Medio | 2.7 / 13.6 / 48 | — |
| A (low) | Bajo | 1.3 / 6.5 / 27 | — |
| K (low) | Bajo | 1.3 / 5.5 / 21 | — |
| Q (low) | Bajo | 0.7 / 4.4 / 14 | — |
| J (low) | Bajo | 0.7 / 2.7 / 11 | — |
| Glitch (WILD) | Especial | sin pago propio en v1 | sí, a todo excepto Scatter y Core |
| Core AI | Generador | sin pago directo | no |
| Data Vault (SCATTER) | Trigger | 2x / 10x / 50x apuesta total (3/4/5 en cualquier posición) | no |

Pagos en "monedas por línea apostada". **Tabla recalibrada por simulación** (ver sección "RTP medido" más abajo) — no son los valores originales de diseño, se ajustaron ~1.36x sobre la v1 inicial para alcanzar el RTP objetivo.

## Reel strips (v2 calibrada, 40 símbolos por rodillo, misma distribución en los 5 rodillos)

| Símbolo | Cantidad / 40 | Prob. por posición |
|---|---|---|
| Runner | 2 | 5% |
| Netrunner | 3 | 7.5% |
| CyberDog | 3 | 7.5% |
| Drone | 4 | 10% |
| A | 6 | 15% |
| K | 6 | 15% |
| Q | 6 | 15% |
| J | 7 | 17.5% |
| Core AI | 2 | 5% |
| Data Vault (Scatter) | 1 | 2.5% |

El Wild **no está en el reel strip**: solo aparece generado por el Core AI.

- **Pro** de este diseño: la matemática es más controlable — se ajusta la volatilidad cambiando cuántos wilds genera cada Core, sin tocar el strip.
- **Contra**: si el Core sale poco, el juego puede sentirse "seco" en tramos largos. Hay que vigilar la hit frequency en la simulación.

## Core AI → Wilds
- Cada Core AI que cae en el grid genera entre **2 y 4 wilds** en posiciones aleatorias del grid (excluyendo posiciones donde ya hay Core o Scatter).
- Puede haber más de un Core AI por giro; cada uno genera su propio set de wilds.

## Scatter → Heist Free Spins
- 3+ Data Vault en cualquier posición → activa **8 Free Spins**.
- En Free Spins: los Core AI que caen quedan **sticky** (pegajosos) y siguen generando wilds en cada giro subsiguiente — lógica pendiente de implementar (requiere estado de sesión entre giros).

## RTP medido (simulación Monte Carlo — NCR-E6)

Validado con `npm run simulate` (3.000.000 giros, `server/src/scripts/simulate.ts`), que reutiliza el motor real (`SlotEngine` + `FreeSpinsLogic`), no una fórmula aparte.

| Métrica | Valor medido |
|---|---|
| **RTP total** | **96.07%** |
| Aporte base game | 84.08% |
| Aporte Free Spins | 12.00% |
| Hit frequency (base game) | 57.44% |
| Frecuencia de trigger de Free Spins | 0.864% (1 cada ~116 giros) |

### Cómo se llegó a este número
La primera versión de la matemática (Core y Scatter al 5% cada uno, tabla de pagos original) midió **140.50% de RTP** — el juego pagaba mucho más de lo que se apostaba, y activaba Free Spins 1 cada 16 giros (demasiado frecuente para un feature de bonus). El proceso de calibración fue iterativo, todo verificado por simulación en cada paso, no ajustado a ojo:
1. Se bajó Scatter de 2 a 1 por strip (5% → 2.5%), llevando el trigger de Free Spins a ~1 cada 116 giros — un rango razonable para un feature de bonus.
2. Se probó bajar también Core de 2 a 1, pero el RTP cayó a 36% (sobrecorrección) — se mantuvo Core en 2.
3. Con esa base (70.45% de RTP), se escaló la tabla de pagos completa (~1.36x sobre los valores originales) en tres pasadas, midiendo con simulación después de cada ajuste, hasta converger en 96.07%.

### Metodología (para referencia)
El RTP se compone de: (1) valor esperado de líneas base, (2) contribución del Core AI vía wilds generados, y (3) contribución de Scatter/Free Spins — los tres puntos (2) y (3) no tienen fórmula cerrada simple por la aleatoriedad de posiciones y el estado acumulado entre giros de Free Spins, por eso se miden con simulación en vez de calcularse a mano.

## D-08 — Distribución del premio dentro de una ronda de Free Spins

La simulación mide el premio promedio de cada uno de los 8 giros de una ronda (posición 1 a 8), para confirmar o descartar el hallazgo D-08 (ver GDD, Registro de decisiones):

| Giro dentro de la ronda | Premio promedio | % de giros en 0 |
|---|---|---|
| 1 | 10.17 | 42.5% |
| 2 | 23.82 | 24.9% |
| 3 | 31.67 | 23.4% |
| 4 | 32.04 | 32.8% |
| 5 | 26.64 | 47.9% |
| 6 | 20.24 | 62.6% |
| 7 | 13.63 | 75.4% |
| 8 | 8.48 | 84.6% |

**Confirmado, parcialmente mitigado:** con la matemática recalibrada, el premio sube y llega a su pico en el giro 3-4 (el patrón de "progresión" del pilar de diseño se cumple en la primera mitad de la ronda), pero cae fuerte en la segunda mitad — para el giro 8, el 84.6% de los giros no paga nada. La causa sigue siendo la misma: demasiados Cores sticky acumulados saturan el grid de Wilds sin tabla de pago propia (D-02). No se corrige en v1 — queda anotado en el roadmap del GDD como mejora futura (ej. limitar la cantidad máxima de Cores sticky, o darle tabla de pago propia al Wild).
