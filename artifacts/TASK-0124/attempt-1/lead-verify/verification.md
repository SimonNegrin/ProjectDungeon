---
type: Verification
title: "TASK-0124: verificación independiente"
description: Revisión del diff, reejecución de verify/E2E y comprobación de criterios.
task: TASK-0124
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T01:00:00Z }
---

# Alcance revisado

Diff completo `main...task/TASK-0124` (27 archivos): solo `src/host/`
(`player-screen*`, `start-screen*`, `main.ts`), `index.html`, `src/host/ui.css`,
tests y artefactos. Sin cambios en `src/game/`, `package.json`,
`pnpm-lock.yaml`, requisitos, arnés ni plantillas. La ficha solo cambia
`task_status` a `in_progress`.

# Defecto encontrado y corregido

En la primera pasada, `createPlayerScreenView` añadía los 9 botones de
arquetipo en cada montaje y `destroy()` no vaciaba el contenedor: al cancelar y
volver a entrar había 18 botones con `data-testid` duplicados y listeners del
modelo destruido. Evidencia: `reentry-check.txt` (18 botones). Relanzado el
runner con hipótesis; `b999d61` añade `archetypes.replaceChildren()` y una
regresión E2E de reentrada. Reejecutado el mismo check: 9 botones y testids
únicos (`reentry-check-after-fix.txt`).

# Comandos reejecutados por el lead

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | 97 archivos / 1426 tests, tsc, build y bundle OK | `verify-lead.txt` |
| `pnpm run test:e2e` (suite completa) | 223/223 OK | `e2e-lead-full.txt` |
| Playwright reentrada (spec del lead) | 9 botones, testids únicos | `reentry-check-after-fix.txt` |

`verify` solo emite avisos preexistentes de tamaño de handoffs y de tareas
antiguas; ninguno es un fallo. El informe (3612 B) queda bajo el tope duro de
4 KB.

# Criterios de aceptación

- [x] Nueve arquetipos y dos variantes por jugador, sin género; repetir
      arquetipo/variante/nombre no se bloquea.
- [x] Cambiar de arquetipo devuelve la variante a 1 (unit y E2E); atrás/adelante
      conserva arquetipo, variante y nombre (unit y E2E).
- [x] Nombre NFC, recortado al aceptar, 12 code points con `Array.from`, solo
      letras/dígitos/espacio, truncado en vivo sin error (unit).
- [x] Vacío queda `''` y `effectiveName` resuelve el del arquetipo; duplicados
      permitidos (unit); el motor resuelve el vacío (TASK-0122).
- [x] Flujo jugador a jugador: «Siguiente» avanza y el último emite
      `PlayerPartyConfig` a `onComplete`; `main.ts` solo anuncia y no crea
      sesión. «Atrás» deshabilitado en el jugador 1, sin ruta al paso 1.
- [x] `Esc`/«Cancelar» abren confirmación en cualquier jugador; confirmar
      descarta y vuelve al menú con N=1 y semilla nueva (unit y E2E).
- [x] Teclado completo, foco visible con tokens, confirmación con foco atrapado
      y progreso/aviso en `role="status" aria-live="polite"` (E2E).
- [x] Tests de variantes, reset, acentos, truncado, vacío, duplicados, avance y
      retroceso; `pnpm run verify` pasa.

# Tests existentes

No se borró ni se saltó ningún test. `start-screen.spec.ts` solo añade el paso
por la pantalla de jugador para seguir probando el paso 1, sin cambiar
aserciones. El unit de `start-screen` añade el caso de `returnToMenu`.

# Evidencia visual

Capturas en `player-screen/screenshots/` (1280×720 y 900×700): roster completo,
variantes 1/2, selección con contorno interior, foco visible, nombre con
acentos/espacios, aviso de party, confirmación y menú restaurado. Revisadas:
layout dentro del marco, sin sombras ni radios, foco perceptible sin color.

# Conclusión

Aprobada. Sin regresiones: E2E completo 223/223, incluidos los 4 casos de
`player-screen`, los 4 de `start-screen` y el bypass `?test=1`.
