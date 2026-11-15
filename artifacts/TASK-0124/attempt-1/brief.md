---
type: Task Brief
title: "TASK-0124: brief del intento 1"
description: Configuración jugador a jugador con roster, variante y nombre.
task: TASK-0124
attempt: 1
status: stable
brief_bytes: 2554
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T09:10:00Z }
---

# Objetivo

Conectar «Continuar» con la pantalla jugador a jugador: arquetipo (9), variante
(2) y nombre (12); «Siguiente» avanza y el último emite la party al punto de
extensión del resumen; «Atrás» conserva lo escrito. Sin resumen ni partida.

# No objetivos

- Ficha y miniaturas (0125), resumen y partida (0126), variante en mapa/HUD
  (0127), carga (0141) y E2E completo (0129).
- Motor, roster, balance, dependencias, persistencia o reordenar.

# Invariantes

- Pantalla DOM opaca dentro del marco, tokens `--ui-*` y relieve existente.
- `?test=1` sigue saltando el arranque; «Cargar» sigue igual. No cambies
  aserciones de specs existentes.
- Tras el paso 1, N y semilla son fijos: sin control ni vuelta al paso 1.
- Defaults: Guerrero, variante 1 y nombre vacío. Cambiar arquetipo devuelve la
  variante a 1. Repetir arquetipo, variante y nombre está permitido.
- Nombre: NFC, letras/dígitos/espacio, 12 code points, truncado en vivo sin
  error y recortado al aceptar; vacío se emite `''` y el motor resuelve el
  nombre del arquetipo.
- `Esc`/«Cancelar» confirman en cualquier jugador; al confirmar se descarta todo
  y se vuelve al menú principal. Sin tests debilitados.

# Criterios de aceptación

En la ficha, sección «Criterios de aceptación»; no se copian aquí.

# Contexto mínimo

- `src/host/start-screen.ts` y `-view.ts`: paso 1 y `onContinue`, hoy anuncio.
- `src/host/main.ts` (boot y keydown), `index.html` y `src/host/ui.css`.
- `src/game/roster.ts` (`ROSTER`) y `src/game/config.ts` (`PlayerConfig`,
  `GameConfig`); no redefinir el roster.
- REQ-016 R-005, R-007, R-008, R-011, T-005, T-006 y T-007.
- Contrato de modelo, DOM, integración y matriz de tests: `brief-detalle.md`.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`commit.txt` y capturas en `tests/e2e/player-screen/screenshots/`.

# Riesgos y decisiones abiertas

- N borradores viven en la pantalla; el paso 1 no se reescribe. El último
  «Siguiente» solo emite `GameConfig`; `main.ts` lo anuncia sin sesión hasta
  TASK-0126.
- Code points con `Array.from`, no `slice` UTF-16.
- Foco: arquetipo actual al cambiar de jugador; confirmación con foco atrapado.
- Timeouts: unit 120 s; `pnpm run verify` y E2E 240 s.
