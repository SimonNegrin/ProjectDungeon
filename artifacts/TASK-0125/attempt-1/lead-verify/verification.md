---
type: Verification
title: "TASK-0125: verificación independiente"
description: Revisión del diff, reejecución de verify/E2E y comprobación de criterios.
task: TASK-0125
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T09:45:00Z }
---

# Alcance revisado

Diff completo `main...task/TASK-0125` (24 archivos): `src/host/archetype-sheet.ts`,
`player-screen-view.ts`, `ui.css`, `index.html`, tests y artefactos. Sin cambios
en `src/game/roster.ts`, motor, `hud.ts`, `package.json`, `pnpm-lock.yaml`,
requisitos, arnés ni plantillas. La ficha solo cambia `task_status` a
`in_progress`.

# Comandos reejecutados por el lead

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` (240 s) | 98 archivos / 1434 tests, tsc, build y bundle OK | Salida del lead |
| `E2E_ARTIFACTS_DIR=<temp> pnpm run test:e2e` (240 s) | 224/224 OK | Salida del lead |
| `git diff --check` | Sin errores de código; solo una línea en blanco final en `test-output.txt` | Salida del lead |
| `lsof -nP -iTCP:4173 -sTCP:LISTEN` | Sin listener tras E2E | Salida del lead |

`verify` solo emite avisos preexistentes de tamaño de handoffs y de tareas
antiguas; ninguno es un fallo. El informe (2557 B) y el brief (2475 B) quedan
bajo el tope duro de 4 KB.

# Criterios de aceptación

- [x] La ficha muestra las nueve filas inherentes (habilidad, fuerza, defensa,
      resistencia, puntería, nivel de magia, PV, MP y acciones), el arma temática
      y el nivel de magia; `buildArchetypeSheet` lee `ROSTER`, `ITEMS` y
      `profileRows` sin copiar valores.
- [x] Las dos miniaturas salen de las 18 celdas de 32×32 de `rogues.png` de la
      tabla de REQ-016; el test unitario comprueba las 18 celdas y la rejilla
      7×7.
- [x] La variante seleccionada se distingue con contorno, `aria-pressed` y
      «Seleccionada»; las etiquetas son «Variante 1/2», sin género.
- [x] Cambiar de arquetipo actualiza ficha y miniaturas juntas y devuelve la
      variante a 1 (unit, E2E y capturas de Guerrero/Mago).
- [x] Teclado: `Tab` recorre los nueve arquetipos y las dos miniaturas, `Enter`
      actualiza la ficha y selecciona variante; las miniaturas tienen nombre
      accesible `«<Arquetipo>, variante N»`.
- [x] Sin sprites nuevos, dependencias ni cambios de valores del roster; los
      únicos cambios de `index.html` retiran la sección estática de variantes.
- [x] Tests de mapeo arquetipo → atributos, arma, magia y celdas; reset de
      variante; `pnpm run verify` pasa.

# Tests existentes

No se borró ni se saltó ningún test. El contador E2E de arquetipos pasa de
`player-archetypes` a `player-archetype-options` para no contar las dos
miniaturas; la reentrada comprueba además una sola ficha y testids únicos, y el
resto de aserciones de TASK-0124 se conserva. E2E completo 224/224, incluidos
los 5 casos de `player-screen`, los 4 de `start-screen` y el bypass `?test=1`.

# Evidencia visual

Capturas revisadas en `tests/e2e/player-screen/screenshots/`:
`ficha-guerrero-1280x720.png` y `ficha-mago-1280x720.png` muestran las nueve
filas, «Espada»/«bastón (futura)», magia 0/4, las dos miniaturas y la variante
activa con texto y contorno. A 1280×720 no hay scroll. A 900×700 la pantalla
admite scroll interno; el manual de la tarea pide 1280×720 y el flujo de teclado
sigue pasando.

# Conclusión

Aprobada. El runner no cerró la tarea; el lead actualiza la ficha, fusiona y
registra el cierre.
