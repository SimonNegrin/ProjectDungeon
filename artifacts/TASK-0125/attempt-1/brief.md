---
type: Task Brief
title: "TASK-0125: brief del intento 1"
description: Ficha de arquetipo con nueve atributos, arma, magia y dos miniaturas.
task: TASK-0125
attempt: 1
status: stable
brief_bytes: 2475
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T09:35:00Z }
---

# Objetivo

Al elegir arquetipo en la pantalla de jugador, mostrar su ficha completa —nueve
atributos, arma temática y nivel de magia— y las dos miniaturas de variante,
actualizadas juntas al cambiar de arquetipo y con la variante 1 seleccionada.

# No objetivos

- Resumen, «Empezar», partida (0126), variante en mapa/HUD (0127), carga (0141)
  y QA completa (0129).
- Motor, roster, tabla de sprites de REQ-016/ADR-006, dependencias o arte nuevo.

# Invariantes

- La ficha cuelga de `[data-testid="player-archetypes"]` y se regenera con el
  contenedor en cada montaje; sin nodos ni listeners acumulados.
- Todos los datos salen de `ROSTER`; el host no copia stats, arma ni magia. Las
  celdas 32×32 salen de la tabla de REQ-016.
- Nueve arquetipos y dos variantes: no redefinir el roster ni añadir sprites.
- Cambiar arquetipo actualiza ficha y miniaturas y devuelve la variante a 1.
- La variante seleccionada se distingue con `aria-pressed` y texto visible; sin
  etiquetas de género. Las miniaturas son los controles y tienen nombre
  accesible.
- `?test=1` sigue saltando el arranque; «Cargar» sigue no-op. No tocar nombre,
  avance, cancelación ni paso 1.

# Criterios de aceptación

Viven en `docs/tasks/TASK-0125-host-ficha-arquetipo-miniaturas.md#criterios-de-aceptación`;
no se copian.

# Contexto mínimo

- `src/host/player-screen-view.ts`: montaje y actualización de la ficha.
- `src/host/player-screen.ts`: `setArchetype` ya resetea la variante.
- `ROSTER`, `ITEMS` y `profileRows` como fuentes; `index.html`, `ui.css` y
  `tests/e2e/player-screen.spec.ts`.
- REQ-016 R-005/R-006, tabla de sprites y ADR-006.
- Contrato de modelo, DOM, celdas y matriz: `brief-detalle.md`.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`commit.txt` y capturas en `tests/e2e/player-screen/screenshots/`.

# Riesgos y decisiones abiertas

- Los botones de arquetipo pasan a `player-archetype-options`; los
  `player-variant-1/2` pasan a botones con miniatura. Adapta locators E2E sin
  debilitar aserciones.
- No tocar `hud.ts`: su retrato sigue en variante 1 hasta TASK-0127.
- Timeouts: unit 120 s; `pnpm run verify` y E2E 240 s.
