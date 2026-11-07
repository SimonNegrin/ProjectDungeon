---
type: ADR
title: "ADR-002: stack técnico"
description: TypeScript, Vite, Canvas 2D, DOM para HUD, Vitest y Playwright.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-07T14:33:11Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Contexto

El juego es 2D, por turnos, de rejilla y con una pantalla host. Necesitamos algo
fácil de testear, rápido de iterar y que no imponga un motor grande.

# Decisión

- **TypeScript** para motor, host, herramientas y tests.
- **Vite** para desarrollo y build.
- **Canvas 2D** para el tablero del host.
- **DOM/CSS** para HUD, controles y experimentos.
- **Vitest** para unitarios e integración.
- **Playwright** para E2E, capturas y QA visual.
- **Node** para scripts y, más adelante, servidor.

No se adopta Phaser, ECS ni un framework de juego en el primer hito.

# Consecuencias

- El motor puede ser puro y testeable.
- El render se puede cambiar sin reescribir reglas.
- El HUD DOM es accesible y fácil de testear.
- Hay que construir el loop de Canvas, cámara y tilemap a mano, pero el alcance
  es pequeño.
- Los experimentos pueden compartir el shell y el lenguaje.

# Alternativas descartadas

- **JavaScript puro**: más fricción en un motor compartido entre host, tests y
  futuro servidor.
- **Phaser**: añade escenas, assets y ciclo de vida que no necesitamos para una
  rejilla por turnos.
- **ECS**: complejidad innecesaria para el número de entidades previsto.
