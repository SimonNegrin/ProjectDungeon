---
type: Task Verification
title: "TASK-0141: verificación independiente del lead"
description: Reejecución de tests, E2E y revisión del cargador único .zip/.json.
status: stable
task: TASK-0141
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T18:20:00Z }
---

# Alcance revisado

Diff `main...task/TASK-0141`: `src/host/load-game.ts` (nuevo), cableado en
`src/host/main.ts`, regiones vivas en `start-screen-view.ts`/`pause-menu-view.ts`,
selector en `index.html`, corrección de `readStats` en `src/game/save.ts`, tests
nuevos y artefactos. Sin cambios en requisitos, arnés, dependencias ni otras
tareas.

Revisión de tests existentes: solo se actualizaron las aserciones de
`tests/e2e/pause-menu.spec.ts` y `tests/e2e/start-screen.spec.ts` que exigían la
ausencia del selector; ahora comprueban el selector único y que cancelarlo deja
el estado intacto. No se borró ni relajó ningún test.

# Comandos

| Comando | Timeout | Resultado |
|---|---|---|
| `pnpm exec vitest run tests/unit/host/load-game.test.ts tests/unit/game/save-schema.test.ts tests/unit/host/session.test.ts` | 120 s | 102/102 |
| `pnpm run verify` | 240 s | 107 archivos/1678 tests; docs 683/160/6; config 4/3; tsc y build (92 módulos) OK; bundle 16 archivos/89 módulos OK |
| `pnpm run test:e2e` | 180 s | 248/248 en 1,7 m, incluidos los 5 de `load-game.spec.ts` |

# Hallazgo del intento 1 y corrección

El intento 1 pasó `verify` y los E2E, pero `readStats` exigía ≥ 0 para
`habilidad`, `fuerza`, `defensa` y `punteria`, mientras el roster usa `-1..3`.
Una partida válida con mago, clérigo, bárbaro, espadachín mágico o granjero se
guardaba y no se podía cargar. El intento 2 acota esos cuatro atributos a
`[-9, 9]`, conserva los límites de `magicLevel` y `acciones` y añade round-trip
de los nueve arquetipos, party mago/clérigo, extremos y rechazo de `1.5`, `10` y
`-10`. El E2E carga un `.zip` real con mago (Fuerza -1) y clérigo y compara
posición, PV, MP y stats.

# Criterios

1. Un solo cargador: `requestGameLoad`/`loadGameFile` sirven a ambos orígenes y
   hay un único `input[type=file]`; sin segunda ruta ni validador.
2. `.zip` y `.json`: E2E de menú para ambos formatos; el selector declara
   `.zip,.json`; la pausa confirma y el menú carga directo.
3. Confirmar cierra la pausa y restaura fase/ronda/activo: E2E de pausa con
   ronda 2 y activo `player-2`, cámara centrada en el activo y HUD «Bru».
4. Cancelar y archivo inválido no tocan la partida: E2E compara RNG, jugadores,
   ronda, turno, activo y cámara; el mensaje se anuncia en la región viva.
5. Sin presentación restaurada: `applyLoadedState` cancela animación, limpia
   feedback/avisos/modales y deja `lastEvents` vacío; E2E comprueba banner y
   aviso ocultos.
6. T-006: el cargador delega en `readSaveZip`, que ya aplica tamaño comprimido y
   descomprimido, número de entradas, rutas y entradas extra; no hay una segunda
   política relajada.
7. Tests: unitarios, integración y E2E pasan; el `readStats` corregido mantiene
   rechazo estricto de tipos y rangos.

# Observaciones

- La cámara se centra en el activo solo en el render posterior a la carga; los
  renders siguientes conservan el centro en `players[0]`. Es el comportamiento
  previo y queda anotado para TASK-0150.
- El informe del runner está en `attempt-1/report.md` e incluye el reintento; el
  directorio de artefactos se mantiene como attempt 1 por continuidad.
- Fricción de umbral de handoff (`docs:check` avisa >2560 B) elevada a
  `harness-keeper`; no bloquea.
