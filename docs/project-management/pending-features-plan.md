# Plan — Features pendientes (post D-19)

Documento de trabajo, no implementado todavía. Cada sección tiene el diseño pensado y los casos borde identificados, para que implementarlo después sea rápido y no haya que volver a pensar desde cero.

---

## 1. VFX: líneas glitcheadas conectando nodos

**Reemplaza:** el highlight actual (`highlightWinningLines` en `SlotGame.ts`), que dibuja un rectángulo con glow en cada celda ganadora por separado, sin conectarlas.

**Objetivo:** dibujar una línea que conecte las celdas ganadoras de izquierda a derecha (como un circuito/nodo de hackeo), con estética glitch, más un "pop" (escala) + parpadeo en cada símbolo de la combinación.

**Ya tenemos la base necesaria:** el backend manda `positions` exacto por cada `lineWin` (D-18) — no hay que calcular geometría de líneas en el cliente, solo conectar los puntos que ya vienen.

**Casos borde a resolver:**
- Las líneas no son todas horizontales — hay zigzags (ver `Paylines.ts`: patrones como `[0,1,2,1,0]`). El trazo tiene que seguir el `row` real de cada `position`, no asumir una fila fija.
- Varias líneas ganadoras a la vez: si se dibujan todas superpuestas se ve como ruido. Alternativas: colores/tonos distintos por línea, o animarlas en secuencia (una después de la otra) en vez de todas juntas.
- El "pop" de escala en un símbolo que pertenece a *dos* líneas ganadoras a la vez no debería duplicarse/sumarse (spam de animaciones sobre la misma celda) — agrupar por celda antes de animar, no por línea.

---

## 2. "Core Boost" — apuesta con mayor probabilidad de Core

**Qué es:** pagar un multiplicador de apuesta (ej. 1.25x-1.5x) a cambio de asegurar al menos 1 Core AI por giro (o subir su probabilidad base).

**Enfoque técnico más simple:** después de generar el grid normal, si no cayó ningún Core de forma natural, forzar uno en una posición aleatoria (mismo patrón que ya usamos para forzar Cores sticky en Free Spins — `FreeSpinsLogic.applyStickyCores`).

**Casos borde:**
- Al forzar un Core donde había otro símbolo, ese símbolo "desaparece" — hay que decidir si eso puede romper una línea que ya estaba formada antes de forzar el Core (probablemente sí, y hay que aceptarlo como parte del feature, documentado).
- El costo extra de este modo tiene que calibrarse con su propia simulación (correr `spin` con el flag activado miles de veces y medir cuánto sube el RTP efectivo) — no alcanza con "se siente razonable". Mismo método que se usó para calibrar Buy Bonus (NCR-E11, D-21): medir, no asumir.
- Interacción con Buy Bonus: ¿se pueden combinar los dos boosts en el mismo giro? Si sí, hay que simular esa combinación también, no asumir que los costos se suman linealmente.

---

## Cómo se prioriza esto

Ninguna de las 2 depende de la otra para arrancar. Core Boost necesita su propia sesión de simulación (mismo método que Buy Bonus) antes de darse por terminada — no se calibra a ojo. El VFX de líneas no requiere simulación nueva, pero probablemente convenga esperarlo hasta tener arte real de Figma.

*(El selector de apuesta y Buy Bonus que estaban acá se implementaron — ver NCR-E13 y NCR-E11 en `epics.md`.)*
