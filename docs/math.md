# Matemática del juego — v1

## Símbolos

| Símbolo | Rol | Paga línea (3/4/5) | Sustituye |
|---|---|---|---|
| Runner (high) | Alto | 8.9 / 46.4 / 185.6 | — |
| Netrunner (high) | Alto | 7.6 / 36.9 / 140.6 | — |
| CyberDog (high) | Medio-alto | 5.9 / 28.7 / 94.2 | — |
| Drone (high) | Medio | 3.7 / 18.5 / 64.9 | — |
| A (low) | Bajo | 1.8 / 8.9 / 37.1 | — |
| K (low) | Bajo | 1.8 / 7.6 / 29.2 | — |
| Q (low) | Bajo | 1 / 5.9 / 18.5 | — |
| J (low) | Bajo | 1 / 3.7 / 14.6 | — |
| Glitch (WILD) | Especial | 10.9 / 54.4 / 218.8 | sí, a todo excepto Scatter y Core |
| Core AI | Generador | sin pago directo | no |
| Data Vault (SCATTER) | Trigger | 2x / 10x / 50x apuesta total (3/4/5 en cualquier posición) | no |

Pagos en "monedas por línea apostada". **Recalibrados tras D-27** (sacar el Core del rodillo 1 bajó la frecuencia general de Cores ~20%, hubo que subir toda la tabla ~32% para volver a acercarse al objetivo de RTP).

## Reel strips (v3, tras D-27)

**D-27:** el rodillo 1 (el más a la izquierda) no tiene Core AI en su strip. Motivo: como las líneas se evalúan de izquierda a derecha, un Core en la columna 1 mata las 12 líneas a la vez — medido, esto costaba en promedio el 47% de la ganancia esperada de ese giro comparado con si esa celda hubiera sido Wild. Ningún otro rodillo tiene ese problema con el mismo peso (un Core en la columna 3, por ejemplo, todavía deja cobrar con 3 símbolos desde la izquierda). El conteo de Core (2) se redistribuyó en A y K en el rodillo 1.

**Rodillo 1 (sin Core):**

| Símbolo | Cantidad / 40 | Prob. por posición |
|---|---|---|
| Runner | 2 | 5% |
| Netrunner | 3 | 7.5% |
| CyberDog | 3 | 7.5% |
| Drone | 4 | 10% |
| A | 7 | 17.5% |
| K | 7 | 17.5% |
| Q | 6 | 15% |
| J | 7 | 17.5% |
| Data Vault (Scatter) | 1 | 2.5% |

**Rodillos 2 a 5 (igual entre sí):**

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

Validado con `npm run simulate` (`server/src/scripts/simulate.ts`), que reutiliza el motor real (`SlotEngine` + `FreeSpinsLogic`), no una fórmula aparte.

### Por qué un solo número de una sola corrida no alcanza
`Math.random()` no está seedeado, así que cada corrida da un resultado distinto. Con pocos millones de giros el margen de error todavía es grande — hay eventos raros pero de alto impacto (combinaciones de 5 símbolos altos, rondas de Free Spins muy cargadas de Cores) que mueven bastante el promedio si caen o no caen dentro de la muestra:

| Giros simulados | RTP medido |
|---|---|
| 1,000,000 | 90.02% – 104.55% (rango de 6 corridas independientes) |
| 10,000,000 | 100.37% |
| 30,000,000 | 95.14% |

### Número validado (agrupando todas las corridas)
En vez de quedarse con la última corrida, se agrupan (weighted average) los **46,000,000 de giros** simulados en total:

**RTP validado: 96.77%**

Esto es más honesto que reportar el resultado de una sola corrida de 1-3M como si fuera definitivo — a esa escala el número individual todavía puede estar ±5-8 puntos del valor real. Está dentro del objetivo de diseño (~96%) sin necesidad de un ajuste adicional.

Las métricas que no dependen de eventos raros de alto pago se estabilizan mucho más rápido — estas ya eran consistentes entre corridas de 1M y de 30M:

| Métrica | Valor (estable entre corridas) |
|---|---|
| Hit frequency (base game) | ~57.5-58% |
| Frecuencia de trigger de Free Spins | ~0.86% (1 cada ~116-117 giros) |
| Aporte de Free Spins al RTP | ~12% |

### Cómo se llegó a la tabla de pagos actual
La primera versión de la matemática (Core y Scatter al 5% cada uno, tabla de pagos original) midió ~140% de RTP — el juego pagaba mucho más de lo que se apostaba, y activaba Free Spins 1 cada 16 giros (demasiado frecuente para un feature de bonus). La calibración fue iterativa, verificada por simulación en cada paso:
1. Se bajó Scatter de 2 a 1 por strip (5% → 2.5%), llevando el trigger de Free Spins a ~1 cada 116-117 giros — estable en todas las corridas posteriores, independientemente del tamaño de muestra.
2. Se probó bajar también Core de 2 a 1, pero el RTP cayó a ~36% (sobrecorrección) — se mantuvo Core en 2.
3. Con esa base, se escaló la tabla de pagos completa (~1.36x sobre los valores originales) en tres pasadas, hasta acercarse al objetivo.
4. Una vez cerca, se corrieron múltiples simulaciones grandes (hasta 30M de giros) para confirmar que el número no era ruido de una sola corrida — así se llegó al 96.77% agrupado.

### Metodología (para referencia)
El RTP se compone de: (1) valor esperado de líneas base, (2) contribución del Core AI vía wilds generados, y (3) contribución de Scatter/Free Spins — los tres puntos (2) y (3) no tienen fórmula cerrada simple por la aleatoriedad de posiciones y el estado acumulado entre giros de Free Spins, por eso se miden con simulación en vez de calcularse a mano.

### v3 — D-27: rodillo 1 sin Core (número vigente)
Se detectó (por observación directa del juego, no por simulación) que un Core en la columna 1 mataba las 12 líneas de una sola vez, con un costo medido del 47% de la ganancia esperada de ese giro. Se sacó el Core del strip del rodillo 1 y se redistribuyó su conteo en A y K. Esto bajó la frecuencia general de Core ~20%, así que hubo que recalibrar:

| Cambio | RTP medido |
|---|---|
| Recién sacado el Core del rodillo 1, tabla sin ajustar | 70.72% |
| Tabla escalada +36% | 98.65% |
| Ajuste fino -2.5% | 97.43% / 96.68% (dos corridas de 15M) |

**RTP validado (v3): 97.06%**, agrupando 30M de giros. Un poco por encima del objetivo de 96% pero dentro de un margen razonable — no se lo sobre-ajustó más, mismo criterio que en v2 de no perseguir el último decimal a costa de correr simulaciones indefinidamente.

Métricas estables de la v3 (10M de giros):

| Métrica | Valor |
|---|---|
| Hit frequency (base game) | ~51-52% (bajó de ~57% en v2 — menos Cores generando menos wilds en el rodillo 1) |
| Frecuencia de trigger de Free Spins | ~0.86% — sin cambios, el Scatter no se tocó |
| Aporte de Free Spins al RTP | ~26-27% (subió del ~12% de v2 — las rondas de FS ahora pagan mucho mejor al no perder líneas por el rodillo 1) |

**Buy Bonus recalibrado también:** el precio (D-21) dependía de cuánto paga en promedio una ronda de FS, que subió de 28.42x a ~31.5x la apuesta tras esta corrección. Nuevo multiplicador: **32.0x** (antes 29.5x) — ver GDD, D-28.

## D-19 — Corrección de la saturación de Free Spins (post-lanzamiento)

**Síntoma real observado:** en una ronda de Free Spins, el tablero llegó a estar 100% ocupado por Core AI y Wild — ni un solo símbolo normal en las 20 celdas. Como en ese momento (v1/v2) ni el Core ni el Wild pagaban por sí mismos, ese giro no podía pagar nada por más lleno de símbolos especiales que estuviera el tablero. Esto era el hallazgo D-08 llevado a su caso extremo.

**Diagnóstico:** dos causas independientes se combinaban:
1. El Wild no tenía tabla de pago propia (decisión original D-02, para simplificar el balanceo inicial).
2. Cada Core generaba entre 2 y 4 wilds sin importar cuán lleno ya estuviera el tablero, así que una ronda larga con varios Cores sticky terminaba saturándolo por completo.

**Solución aplicada (reemplaza la decisión original D-02):**
1. El Wild ahora tiene tabla de pago propia (ver tabla de arriba) — una línea toda-Wild ya paga en vez de dar 0.
2. La cantidad de wilds que genera cada Core baja a medida que el tablero ya está más ocupado (`occupiedRatio` en `applyCoreWildGeneration`), en vez de un tope duro fijo. Se autorregula giro a giro y también dentro de un mismo giro si caen varios Cores juntos.

**Resultado medido (15M de giros agrupados, misma metodología que el RTP general):**

| Giro dentro de la ronda | Antes (D-08 original) | Después de D-19 | Después de D-27 (vigente) |
|---|---|---|---|
| 1 | 9.90 | 8.72 | 8.22 |
| 2 | 23.71 | 20.18 | 19.59 |
| 3 | 31.90 | 32.65 | 33.27 |
| 4 | 32.05 | 43.44 | 46.66 |
| 5 | 27.08 | 50.92 | 57.42 |
| 6 | 20.14 | 55.65 | 65.33 |
| 7 | 13.90 | 57.16 | 70.95 |
| 8 | 8.96 | 56.77 | 72.84 |

Antes, el premio subía hasta el giro 3-4 y después se desplomaba (el pilar de "progresión dentro del bonus" se rompía en la segunda mitad de la ronda). Con D-19 se sostenía, pero se aplanaba cerca del final. Con D-27 (sin Core en el rodillo 1) sigue subiendo hasta el final de la ronda — ya no se pierden líneas enteras por un Core mal ubicado, así que el crecimiento es más limpio.

**RTP recalibrado tras D-19:** 95.99% (15M de giros). **RTP recalibrado tras D-27:** 97.06% (30M de giros) — ver sección de RTP más arriba para el detalle completo.

**Limitación que sigue existiendo:** un Core en el medio de una línea todavía la "bloquea" (no paga y no es sustituible) — la corrección reduce mucho la saturación pero no la elimina al 100%. Se evaluó también rediseñar el Core como un multiplicador global en vez de un generador físico de wilds (eliminaría el problema de raíz), pero se descartó para esta versión: es un cambio de identidad de la mecánica central, con riesgo matemático más alto (los multiplicadores acumulativos son notoriamente difíciles de calibrar sin que el RTP se dispare), y hubiera invalidado buena parte de las animaciones y la narrativa ya construidas. Queda anotado como posible dirección de v2 si en el futuro se justifica.

**Confirmado, parcialmente mitigado:** con la matemática recalibrada, el premio sube y llega a su pico en el giro 3-4 (el patrón de "progresión" del pilar de diseño se cumple en la primera mitad de la ronda), pero cae fuerte en la segunda mitad — para el giro 8, el 84.6% de los giros no paga nada. La causa sigue siendo la misma: demasiados Cores sticky acumulados saturan el grid de Wilds sin tabla de pago propia (D-02). No se corrige en v1 — queda anotado en el roadmap del GDD como mejora futura (ej. limitar la cantidad máxima de Cores sticky, o darle tabla de pago propia al Wild).
