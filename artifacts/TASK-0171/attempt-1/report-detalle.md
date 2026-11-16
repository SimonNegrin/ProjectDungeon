---
type: Task Report Detail
title: "TASK-0171: detalle de E2E, QA visual y playtest"
description: Evidencia ampliada del ciclo de cofres, guardado/carga, curva y guion de playtest de la maza.
task: TASK-0171
attempt: 1
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T18:55:00Z }
artifacts: artifacts/TASK-0171/attempt-1/
---

# Alcance ejecutado

`tests/e2e/chests.spec.ts` cubre REQ-020 R-001/R-003/R-004/R-005/R-010/R-011/
R-012 y T-007/T-008 con una partida nueva real, generador por defecto y semilla
fija `295`. No se inyecta ningún cofre: el estado de la página se compara con
`createInitialState({ seed: 295 })` y coincide en id, posición, capacidad,
estado y contenido (incluidos los ids de instancia `item-chest-1-0/1`).

La semilla 295 genera un solo cofre en `(13,9)`, sala 1, con spawn en sala 0;
contiene `arcane-dagger` (mejora de arma) y `circular-mace` (pieza de traits
garantizada). El jugador arranca en `(13,5)`.

# Tests

| Comando | Resultado | Evidencia |
|---|---|---|
| `pnpm run verify` | OK: 116 archivos, 1890 tests, docs, config, `tsc`, build y bundle | `verify-output.txt` |
| `pnpm exec playwright test` (suite completa) | OK: 290 tests | `e2e-output.txt` |
| `pnpm exec playwright test tests/e2e/chests.spec.ts` | OK: 3/3 | `chests/screenshots/`, `chests/logs/` |
| `pnpm run verify:task TASK-0171` | fail esperado: 7/7 criterios sin firma; informe y capturas OK | `verify-task-output.txt` |

`verify:task` no puede pasar mientras `game-lead` no firme los criterios en la
ficha; `docs/**` no es propiedad de `task-runner` y no se ha editado.

# Casos E2E

1. **Ciclo real**: partida nueva, comparación con la generación de Node, cofre
   en sala no-spawn, HUD cerrado sin contenido, apertura con `Espacio` (2→1
   acciones), panel «Cofre 2/4», coger todo (gratis), cofre vacío que permanece,
   depósito (gratis, MP 3→3), HUD abierto con contenido, «Suelo» sin mezclar
   fuentes y reapertura gratis. Costes en `chests/logs/ciclo-cofre.json`.
2. **Guardado/carga**: guardado real desde la pausa a `.zip`, lectura del
   manifiesto y la partida, carga desde el menú y comparación exacta de
   contenedores antes/después. El objeto depositado conserva
   `item-chest-1-0`, prueba de que no hay nueva tirada. Después de cargar, el
   cofre se reabre, se vacía y sigue en el mundo abierto y vacío.
   Evidencia: `chests/logs/guardado-carga.json` y `chests/saves/`.
3. **Curva (integración Node, 1 y 6 jugadores)**: semillas `295` y `9270170`,
   todos los cofres ofrecen al menos una mejora sobre el mejor equipo inicial
   del grupo. Las semillas fijas `1..4` reparten las cuatro piezas de traits
   (`lifesteal-ring`, `mana-necklace`, `circular-mace`, `action-gloves`).

# QA visual

Capturas en `chests/screenshots/`:

| Captura | Contenido |
|---|---|
| `hud-cofre-cerrado-1280x720.png` | Cursor sobre el cofre cerrado; «Cerrado», sin contenido |
| `cofre-apertura-feedback-1280x720.png` | Banner «Cofre abierto» sobre el mapa |
| `panel-cofre-1280x720.png` / `-900x700.png` | «Cofre 2/4» con dos objetos; sin Suelo ni cadáveres |
| `transferencia-take-all-900x700.png` | Banner «+ 2 objetos»; HUD ya vacío |
| `cofre-vacio-1280x720.png` | «Cofre 0/4» y «Cofre vacío» |
| `transferencia-deposito-1280x720.png` | Banner «Daga arcana → Cofre»; HUD con el objeto |
| `hud-cofre-abierto-1280x720.png` | HUD «Abierto» con «Daga arcana» |
| `panel-suelo-1280x720.png` / `-900x700.png` | «Suelo»; nada del cofre |
| `cofre-cargado-1280x720.png` | Cofre abierto tras cargar el `.zip` |
| `cofre-vacio-cargado-1280x720.png` | Cofre cargado y vaciado, sigue en el mundo |
| `hud-cofre-vacio-cargado-1280x720.png` | HUD «Abierto / Vacío» tras cargar |

CLS: `startLayoutShiftAudit` + `expectNoForbiddenShifts` en apertura, coger
todo, depósito, Suelo y reapertura. Única entrada registrada:
`strong[hud-action]`, valor 1,64e-6, `hadRecentInput: true`, no prohibida. La
geometría de marco/panel se compara entre «Cofre» y «Suelo» a 1280×720 y
900×700 (`ciclo-cofre.json`).

# Playtest de la maza circular

Ruta reproducible (no requiere `?test=1`):

1. `Nueva partida`; 1 jugador; semilla `295`; valores por defecto (Guerrero).
2. Desde el spawn `(13,5)` bajar tres casillas: `(13,6)` puerta, `(13,7)`,
   `(13,8)`. El cofre está en `(13,9)`, justo al sur.
3. Cursor sobre el cofre y `Espacio`. En el panel «Cofre», `Enter` sobre la
   primera fila y «Coger todo»: entran «Daga arcana» y «Maza circular».
4. En la Bolsa, seleccionar «Maza circular», `Enter` → «Equipar». Es a dos
   manos: el escudo pasa a la mochila y el HUD muestra la maza.
5. Cerrar el panel, moverse a `(14,8)` (una casilla al este) y atacar al
   centinela de `(15,8)`. El centinela de `(15,9)` también está en el anillo.
6. Alternativa de combate: `(14,9)` es adyacente a ambos y deja el ataque en
   diagonal.

Qué debe mirar el usuario:

- **Alcance**: el golpe alcanza las 8 casillas adyacentes (diagonales
  incluidas), no la casilla propia; solo hostiles.
- **Daño y feedback**: una tirada y un texto por objetivo; dos impactos con dos
  banners/marcas; coste de 1 acción.
- **Sensación de mejora**: la maza tiene menos acierto que la espada
  (`+2` frente a `+3`) y el mismo daño base; comparar un ataque a un solo
  enemigo con el círculo a dos. Decidir si compensa perder el escudo.
- **Ritmo de cofres**: la semilla 295 tiene un solo cofre; valorar si la
  densidad 50 %/20 % da recompensa suficiente al explorar. No se ajustan
  valores en esta tarea.

# Desviaciones y problemas

- El banner de feedback (`z-index: 5`) queda oculto tras el panel abierto
  (`z-index: 20`). El evento existe y se anuncia (`role="status"`), pero el
  usuario no lo ve hasta cerrar el panel; las capturas de feedback se toman con
  el panel cerrado. No se cambia la capa porque es una decisión de UI y el
  alcance prohíbe rediseñar; queda como problema conocido para `game-lead`.
- «¡Alarma! Te han visto» aparece en las capturas por acercarse al cofre, no
  por abrirlo ni transferir: `lastEvents` no contiene `AlarmRaised` en apertura,
  coger todo ni depósito.
- El primer intento E2E falló por una aserción del propio test
  (`toContainText` sobre una fila que solo expone `aria-label`); se corrigió a
  `toHaveAttribute`. No fue un fallo de producto.

# Fricción reutilizable

Ninguna entrada nueva: el filtro de specs (`pnpm run test:e2e -- <spec>` no
filtra) ya está documentado en `docs/harness/workflow.md`; el resto son
problemas del hito.
