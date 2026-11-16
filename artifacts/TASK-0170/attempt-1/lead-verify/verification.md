---
type: Verification
title: "TASK-0170: verificación del intento 1"
description: "Apertura por teclado, panel Cofre/Suelo exclusivo, HUD por cursor y feedback con beat; criterios firmados y verify:task en verde."
task: TASK-0170
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T17:42:40Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0170` pasa: ficha, estado, informe, siete
criterios firmados, alcance dentro de `feature` sin cambios, seis capturas y
`pnpm run verify` completo. La salida mecánica está en `verify-task.txt`.

# Criterios

Los siete quedan firmados:

- Con el cursor sobre un cofre, `Espacio`/`Enter` envían `OpenContainer`; el E2E
  comprueba que se gasta una acción y que sin acción o a distancia se rechaza con
  el aviso actual, el panel no se abre y el jugador no se mueve.
- Abrir un cofre abre el panel en «Cofre» con su contenido; `I` abre «Suelo» con
  suelo y cadáveres del tile. El E2E verifica que cadáveres y suelo están ocultos
  en «Cofre» y que el contenido del cofre está oculto en «Suelo».
- Con el panel cerrado, el HUD derecho muestra «Cofre / Cerrado» sin contenido y,
  tras abrirlo, «Abierto» con los objetos. Las capturas de mapa lo muestran.
- Coger, depositar y coger todo usan la navegación y el submenú existentes; el
  depósito anuncia «sin coste» y el E2E comprueba que el motor no gasta acción ni
  MP. El fantasma no abre el panel, así que su coste de una acción por objeto no
  se representa en la interfaz.
- Abrir produce cue y banner `Cofre abierto` con beat de 300 ms; coger, coger todo
  y depositar producen `+ <Objeto>`, `+ N objetos` o `<Objeto> → Cofre` con 250 ms,
  y el cambio de zona se aplica al acabar el beat. La matriz de REQ-017 gana las
  dos filas en el commit de cierre `1170a6d`; la ficha no declaraba `docs/` en
  alcance, así que la fila la escribe `game-lead` fuera del diff medido.
- Tests unitarios de input, panel, HUD, feedback, renderer y HTML; E2E del ciclo
  completo con dos capturas por vista a 1280×720 y 900×700.
- `pnpm run verify` en verde: 1890 tests, docs, tsc, build y bundle; suite E2E
  287/287.

# Evidencia visual revisada

- `panel-cofre-1280x720.png` y `panel-cofre-900x700.png`: «Cofre 2/4», dos
  objetos, sin cadáveres ni suelo; el layout se mantiene legible a 900×700.
- `panel-suelo-1280x720.png` y `panel-suelo-900x700.png`: «Suelo» con el cadáver
  «Centinela sin coste» y el objeto del tile; sin contenido de cofre.
- `mapa-cofre-cerrado-1280x720.png`: marcador provisional de cofre y HUD con
  estado cerrado sin contenido.
- `mapa-cofre-abierto-1280x720.png`: cofre abierto, HUD con los tres objetos y
  banner `Daga → Cofre`.

# Diff revisado

`git diff main...HEAD`: `input.ts` y `keymap.ts` (tecla y ayuda), `main.ts`
(apertura y fuente del panel), `inventory-panel*.ts` (modelo y vista de cofre),
`hud-detail.ts`, `presentation.ts`, `motion.ts`, `feedback-*`, `renderer.ts`,
`index.html`, `ui.css` y tests unitarios/E2E. Sin cambios en `src/game/`, sin
atajos nuevos y sin tocar el saqueo de cadáveres.

# Fricción

- La ficha pedía una fila de REQ-017 sin declarar `docs/` en `scope:`. Se resolvió
  como corrección documental del lead en el cierre, no dentro del diff medido.
  Propuesta para el próximo milestone: cuando una tarea de UI dependa de una fila
  documental, enlazarla a la tarea `docs` o declarar `docs/` en `scope:`.
- El cofre del mapa es un marcador provisional declarado; no hay arte definitivo.

# Qué debe probar el usuario

Abrir un cofre con `Espacio` desde una casilla vecina, comprobar la acción
gastada, coger uno, depositar, coger todo y volver a «Suelo» con `I`. Mirar que
el HUD derecho no revele contenido antes de abrir y que el panel se lea bien a
900×700. En el playtest, valorar si el marcador provisional de cofre se distingue
del suelo y si el banner de transferencia estorba.
