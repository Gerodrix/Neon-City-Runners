# Neon City Runners

Prototipo de slot HTML5 de estética cyberpunk, desarrollado como proyecto de portfolio. Implementa un motor de juego en el servidor y un cliente gráfico con PixiJS. Usa saldo de demostración en memoria: no procesa dinero real ni es un producto certificado para operar apuestas.

## Stack y estructura

- `client/`: TypeScript, Vite y PixiJS.
- `server/`: Node.js, TypeScript y Express; configuración de pagos en `src/config/paytable.json`.
- `docs/`: reglas, arquitectura y decisiones de implementación.

## Ejecutar localmente

Requisitos: Node.js 22 y npm. Abrí dos terminales **desde la raíz del repositorio**.

Terminal 1 — API en `http://localhost:4000`:

```sh
npm --prefix server ci
npm --prefix server run dev
```

Terminal 2 — cliente en `http://localhost:5173`:

```sh
npm --prefix client ci
npm --prefix client run dev
```

El cliente usa la API local en el puerto 4000. El saldo y las sesiones se reinician al cerrar el servidor.

## Compilar y validar

```sh
npm --prefix server run build
npm --prefix server test
npm --prefix client run build
npm --prefix server start
```

El build del servidor incluye la tabla de pagos en `server/dist/config/`. Las pruebas verifican que el código compilado carga esa configuración y respeta invariantes del motor; el CI también compila el cliente. No sustituyen una revisión visual ni una certificación matemática.

## Mecánicas y alcance

Grilla 5×4 con 12 líneas, generación de Wilds mediante Core AI, Scatter, Free Spins, compra de bonus y Core Boost. El estado detallado y el trabajo pendiente se mantienen en el [backlog](docs/project-management/pending-features-plan.md). El prototipo mantiene saldos en memoria y no implementa autenticación ni persistencia de una plataforma comercial.

## Documentación

- [Diseño del juego](docs/GDD.md)
- [Matemática del juego](docs/math.md)
- [Arquitectura](docs/architecture.md)
- [Guía de contribución](CONTRIBUTING.md)
