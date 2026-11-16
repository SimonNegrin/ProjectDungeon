---
type: Verification
title: "TASK-0171: verificación del intento 1"
description: "E2E del ciclo real de cofres, QA visual con feedback visible, guardado/carga y curva; playtest de la maza preparado."
task: TASK-0171
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T19:00:20Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0171` pasa: ficha, estado, informe, siete
criterios firmados, alcance dentro de `qa`, catorce capturas y `pnpm run verify`
completo. La salida mecánica está en `verify-task.txt`.

# Criterios

Los siete quedan firmados:

- E2E con partida nueva real (semilla 295): el estado de la página coincide con
  `createInitialState`, el cofre está en una sala no-spawn, se abre con
  `Espacio` gastando una acción, se coge todo y se deposita sin coste. Sin
  inyección de estado ni teletransporte.
- «Cofre» y «Suelo» no se mezclan: en «Cofre» desaparecen suelo y cadáveres; en
  «Suelo» desaparece el contenido del cofre. El HUD muestra cerrado sin contenido
  y abierto con los objetos.
- El cofre vacío sigue en el mundo; el guardado `.zip` y la carga conservan
  posición, capacidad, `opened: true`, contenido y el id de instancia original;
  no se regenera ni se repite la tirada.
- QA visual a 1280×720 y 900×700: «Cofre» y «Suelo», HUD cerrado/abierto/vacío,
  cofre cargado y feedback de apertura, coger todo y depósito. CLS sin
  desplazamientos prohibidos.
- Curva: con 1 y 6 jugadores y dos semillas fijas, cada cofre ofrece al menos una
  mejora sobre el mejor equipo del grupo; las cuatro piezas de traits salen con
  semillas fijas.
- Playtest preparado con ruta, objetivo y qué mirar; queda en el informe y se
  traslada al usuario antes de cerrar el hito.
- `pnpm run verify` en verde: 1890 tests, docs, tsc, build y bundle; E2E 290/290.

# Defecto corregido en la revisión

La primera versión ocultaba el banner de feedback detrás del panel (`z-index` 5
frente a 20) y el E2E lo esquivaba cerrando el panel antes de capturar. Se
corrigió en `398fbdef`: con el panel abierto el banner sube a `z-index` 25,
`top: 0` y relleno reducido, sin tapar los títulos ni bloquear input; con el
submenú contextual vuelve detrás del panel. El E2E comprueba visibilidad,
apilado, no solape de títulos y `pointer-events: none`, y las capturas de
feedback se toman con el panel abierto.

# Diff revisado

`git diff main...HEAD`: `tests/e2e/chests.spec.ts` (nuevo, 3 tests) y
`src/host/ui.css` (capa del banner). Artefactos: capturas, logs, `.zip` de
guardado y salidas. Sin cambios en `src/game/`, reglas, botín, panel ni tests
existentes.

# Evidencia visual revisada

- `cofre-apertura-feedback-1280x720.png` y `...-900x700.png`: banner «Cofre
  abierto» sobre el panel, títulos «Equipo / Bolsa / Cofre 2/4» legibles.
- `transferencia-take-all-900x700.png`: «+ 2 objetos» con «Cofre 0/4 / Cofre
  vacío» y la bolsa llena.
- `transferencia-deposito-1280x720.png`: «Daga arcana → Cofre» con «Cofre 1/4».
- `hud-cofre-cerrado/abierto/vacio-cargado`: el HUD no revela contenido antes de
  abrir y lo muestra después.

# Qué debe probar el usuario

Playtest de la maza circular: nueva partida, 1 jugador, semilla 295, Guerrero.
Bajar de (13,5) a (13,8) —puerta en (13,6)—, cursor al cofre (13,9), `Espacio`,
«Coger todo», equipar «Maza circular» desde la bolsa (dos manos: el escudo pasa a
la mochila). Ir a (14,8) y atacar al centinela de (15,8); el de (15,9) también
entra en el anillo. Alternativa diagonal: (14,9).

Mirar: alcance de las 8 casillas (diagonales, sin centro), daño y feedback por
objetivo, coste de 1 acción, comparación con la espada (menos acierto y pierde el
escudo) y si un cofre por nivel basta. El aviso de alarma del trayecto viene del
acercamiento; abrir y transferir no generan `AlarmRaised`.
