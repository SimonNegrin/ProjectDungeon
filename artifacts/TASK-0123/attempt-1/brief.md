---
type: Task Brief
title: "TASK-0123: brief del intento 1"
description: Menú principal y paso 1 (N y semilla) sin arrancar partida.
task: TASK-0123
attempt: 1
status: stable
brief_bytes: 2497
read_detail: true
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T00:20:00Z }
---

# Objetivo

Añadir el menú principal como primera pantalla —«Nueva» y «Cargar»— y el paso 1
con N de 1 a 6 y semilla editable, validación, `?seed=` y cancelación
confirmada al menú. No se arranca ninguna partida.

# No objetivos

- Jugador, roster, ficha, resumen, «Empezar», partida, guardado o carga real.
- Motor, fórmulas, roster, dependencias o persistencia entre sesiones.

# Invariantes

- La pantalla vive en DOM dentro del marco y usa tokens/relieve existentes.
- `?test=1` conserva el bypass: los E2E de juego abren directos sin menú; el
  flujo real se prueba sin `test=1`. No cambies aserciones para ello.
- `?seed` se consume una sola vez en la carga; cada entrada posterior genera
  semilla nueva. N=1 por defecto; sin persistencia al recargar.
- `Esc` en el menú no hace nada. En paso 1, `Esc`/«Cancelar» abren confirmación;
  confirmar descarta y vuelve al menú; cancelar el aviso no cambia nada.
- «Continuar» válido emite `{playerCount, seed}` al punto de extensión y avisa
  con `aria-live`; no pinta jugador ni inicia partida. «Cargar» llama a su punto
  de extensión sin abrir selector.
- No borrar, saltar ni debilitar tests. Sin dependencias nuevas.

# Criterios de aceptación

`docs/tasks/TASK-0123-host-menu-principal-paso-1.md#criterios-de-aceptación`.

# Contexto mínimo

- `src/host/seed.ts` (`parseSeedParam`, `nextSeed`), `src/host/main.ts`
  (boot, keydown, `isEditableTarget`), `index.html` y `src/host/ui.css`.
- `src/game/config.ts` (contrato de TASK-0122); no tocar `src/game/`.
- REQ-016 R-001..R-004, R-011, R-012 y T-004/T-005/T-007.
- Contrato de estado, DOM y matriz de tests: `brief-detalle.md`.

# Artefactos

`report.md`, `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
`commit.txt` y capturas del spec en `tests/e2e/start-screen/screenshots/`.

# Riesgos y decisiones abiertas

- El menú tapa el juego existente: resuelve el bypass con `?test=1` y adapta
  como máximo los specs que abren `/` sin él; sin tocar aserciones.
- Semilla pura e inyectable: recibe `random` en tests; sin `Math.random` oculto.
- Foco atrapado en la confirmación y devuelto al control de origen.
- Timeouts: unit 120 s; `pnpm run verify` y E2E 240 s.
