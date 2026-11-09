---
type: Task Brief
title: "TASK-0045: brief del intento 2"
description: Corregir el cómputo de accesos del spawn y reforzar las aserciones de visión y protección.
task: TASK-0045
attempt: 2
status: stable
brief_bytes: 3393
read_detail: false
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T16:35:00Z }
---

# Objetivo

Corregir el intento 1 en `task/TASK-0045` sin rehacerlo: el spawn debe elegir
la sala con menos **puertas + bocas de pasillo ancho** (no contar también las
bocas estrechas que acompañan a una puerta) y desempatar por **superficie libre
sin puertas**; las pruebas deben verificar la protección con la definición
aprobada y la ausencia de visión de **todos** los enemigos, incluidos los
emboscados.

# Evidencia del fallo

`artifacts/TASK-0045/attempt-1/lead-access-check.txt`: con la definición de
`REQ-012`/`EXP-004` (puertas + 2 por pasillo ancho), 33 de 200 semillas eligen
una sala que no tiene el mínimo de accesos; 45 tienen un recuento distinto.
El test `chambers-contents` copia la implementación (`plan.openMouths`) en vez
de la regla, por lo que no lo detecta.

# Hipótesis

`core/spawn.ts` cuenta cada `openMouth`; en un pasillo estrecho con puerta en un
extremo, la puerta ya cuenta para ambas salas y la boca del otro extremo vuelve
a contar. La referencia aprobada cuenta puertas (`roomA`/`roomB`) y, por cada
pasillo `width: 2` que toca la sala, 2 accesos; las bocas estrechas no cuentan.
Además, el desempate usa `roomCellsOf(...).length` (incluye puertas) en vez de
superficie libre.

# Cambios requeridos

1. `core/spawn.ts`: calcular accesos como puertas + 2 por pasillo ancho que toca
   la sala (puedes usar `openMouths` con `reason === 'pasillo-ancho'`, que ya
   emite dos por pasillo y ambos extremos referencian ambas salas; o añadir
   `corridors` al input). Ignorar bocas estrechas. Usar superficie libre
   excluyendo puertas en el desempate y en el fallback, como EXP-004.
2. `tests/unit/game/chambers-contents.test.ts`: el helper de accesos debe usar
   la definición aprobada, no copiar la implementación. Añade una regresión con
   un pasillo estrecho con puerta y boca que, con el cómputo antiguo, cambiaría
   la sala elegida.
3. `tests/unit/game/chambers-enemies.test.ts`: comprobar LOS al spawn para todos
   los enemigos, también `hidden` (o aceptar la relajación solo con warning
   explícito). En el barrido de contenidos, añadir `enemies.length <= total`,
   `T` 10-12 en 22×18 y ausencia de LOS salvo warning.
4. BSP: mejora opcional y recomendada. `enemyAnchor` devuelve el mejor punto de
   la primera sala aunque tenga LOS. Busca globalmente una celda de sala
   no-spawn, fuera de puertas/armas/huecos y sin LOS; si no existe, usa la más
   lejana con aviso. Añade una aserción de ancla sin LOS en las 25 semillas.
   No cambies el cupo de 4 ni añadas salida.

# Invariantes y criterios

Los del brief del intento 1. Criterios en
`docs/tasks/TASK-0045-motor-spawn-enemigos-salida.md#criterios-de-aceptación`.
No tocar `src/host/`, `experiments/`, `index.html`, dependencias, bestiario,
percepción, alarma, IA ni combate. No crear `variants/growth.ts`. Sin
`Math.random`, relojes, DOM ni estado global.

# Artefactos

`artifacts/TASK-0045/attempt-2/{report,test-output,verify-output,seed-sweep,bsp-regression}.txt`
y commit en `task/TASK-0045`. Re-ejecuta `pnpm run verify`; no debilites BSP.
