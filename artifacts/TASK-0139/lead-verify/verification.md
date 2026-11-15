---
type: Task Verification
title: "TASK-0139: verificación independiente del lead"
description: Revisión del diff, criterios, tests y E2E de pausa global.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T17:33:26Z }
---

# Resultado

`done`. Intentos 1-2 verificados; fusión `ff99ae2` desde `task/TASK-0139`.

# Diff revisado

- `src/host/keymap.ts`, `input.ts` y `hud.ts`: mapa único de teclas, `R` fuera.
- `src/host/pause-menu.ts` y `pause-menu-view.ts`: modelo puro, cinco acciones,
  controles, confirmaciones, foco y consumo de teclas.
- `src/host/main.ts`: pausa, congelación de `tick`/`textTick`, input bloqueado,
  reanudación sin comandos y «Nueva» al paso 1.
- `index.html` y `ui.css`: diálogo modal y controles.
- Tests unitarios y E2E nuevos; 10 E2E que pulsaban `R` migrados a `restart(page)`.

Sin cambios en `src/game/**`, requisitos, arnés, dependencias ni alcance. No se
borraron ni saltaron tests.

# Comandos reejecutados

| Comando | Resultado |
|---|---|
| `pnpm exec vitest run` focalizados (input, pausa, keymap, sesión, HUD, feedback) | 130/130 |
| `pnpm run verify` | 105 archivos / 1649 tests; docs, config, tsc, build y bundle OK |
| `pnpm run test:e2e` | 241/241 |
| Estrés `hud-vertical-lists-qa --repeat-each=40 --workers=4` | 40/40 |
| E2E normal `artifacts/TASK-0139/lead-verify/normal-mode.spec.ts` | 1/1 |

El intento 1 falló la suite completa por un guard global de `defaultPrevented`
que se comía la primera flecha tras cerrar el panel. Se reprodujo 5/40 en la
rama frente a 60/60 en `main`; el intento 2 lo corrigió en la vista de pausa y
añadió un test determinista. La suite completa tuvo después un fallo aislado de
`feedback-clock-loop-qa` bajo carga; el test pasó 20/20 focalizado y la suite
completa volvió a pasar 241/241. Se anota como flake preexistente de reloj real.

# Criterios

1. `Esc` desde personajes, enemiga y animación; panel/lista primero: OK.
2. Congelación de turno/beat/feedback e input ignorado; reanudar sin cambios: OK.
3. Cinco acciones en orden, teclado y foco visible: OK.
4. `Esc` raíz reanuda; submenú/aviso vuelve: OK.
5. Guardar desactivado con motivo por fase, animación o paneo: OK.
6. Confirmaciones de Nueva y Cargar; Nueva abre paso 1: OK.
7. Controles desde `KEY_BINDINGS`, sin remapeo: OK.
8. `R` retirada del input y de la ayuda: OK.
9. Tests y `verify`: OK.

# Evidencia

- `artifacts/TASK-0139/attempt-1/` y `attempt-2/`: informes, salidas y capturas.
- `artifacts/TASK-0139/lead-verify/`: E2E normal y su salida.
- `tests/e2e/pause-menu/screenshots/`: raíz, controles, avisos, guardado
  deshabilitado y pausa durante animación.

# Fricción

| Síntoma | Disposición |
|---|---|
| `docs:check` exige frontmatter OKF a `brief-detalle.md`; la plantilla no lo incluye. | `deferred` — `harness-keeper`/`requirements-writer`; el runner añadió frontmatter mínimo. |

# Riesgos y deuda

- Guardar (`TASK-0140`) y cargar (`TASK-0141`) siguen como no-op.
- El resultado conserva sus botones «Reiniciar»; `TASK-0153` debe sustituirlos
  por «Nueva partida»/«Cargar partida».
- `Esc` después de victoria/derrota abre la pausa; la pantalla de resultado de
  `TASK-0153` debe impedirlo.
