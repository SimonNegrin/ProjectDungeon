---
type: Verification
title: "TASK-0161: verificación del intento 1"
description: Resultado de verify:task, criterios firmados y diff revisado del motor de traits.
task: TASK-0161
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T08:56:00Z }
---

# Resultado

`ok`. `verify:task TASK-0161 --base harness/2agentes` en verde: estado, 9
criterios firmados, informe `success`, 24 archivos dentro de `feature`, `pnpm run
verify` completo. Salida en `verify-task.txt`.

# Criterios

Los nueve firmados. Evidencia revisada: `traits.test.ts` (catálogo, nueve
atributos, suma/único, suelos y topes, área por dato y coste, robo por objetivo,
semilla repetida, serialización), `item-catalog.test.ts` (cuatro piezas, maza
2 manos, daño 3 < hacha 5) y `debug.test.ts` (snapshot con traits, fuente y
`effectiveStats`; eventos por objetivo del círculo).

Dos matices que la firma asume y el playtest debe mirar:

- `resistencia` se aplica como desplazamiento de bandas (tope en
  `vulnerable`/`very-resistant`), no como número: REQ-029 sustituyó el atributo.
  Queda como nota para ADR-024, fuera del piloto.
- En `item-catalog.test.ts` la aserción incidental `lootPolicy: 'common'` de
  todos los objetos desaparece de la prueba de fuente única; el valor sigue
  cubierto por `validateItemCatalog` y las pruebas de botín. No oculta fallos,
  pero un cambio de política de las piezas nuevas ya no lo detectaría esa prueba.

# Diff revisado

`src/game/equipment.ts` (catálogo `TRAITS` y cuatro piezas), `stats.ts`
(agregación única, traits activos, recursos y eventos de equipo), `combat.ts`
(`resolveWeaponAttack` compartido, anillo por offsets fijos, robo por impacto),
más `actions`, `inventory`, `engine`, `magic`, `save`, `turn`, `types` y el
snapshot de `host/debug.ts`. Sin UI, sin E2E, sin dependencias nuevas y sin
imports de `src/host/` en `src/game/`.

Riesgos: el ataque circular no abre réplica (desviación declarada; evita anillos
encadenados) y un `import` de `engine.ts` queda en una sola línea por formato.
Ninguno cambia comportamiento fuera de traits.

# Fricción

`verify:task` exigía capturas a una tarea `feature` sin UI porque el heurístico
detectaba «HUD» y «capturas» en las restricciones. La ficha declara «E2E /
visual: no»; el script ahora lo respeta (`bad6a6b`), alineado con la regla
documentada de [workflow](../../../docs/harness/workflow.md#verificación-determinista).
Clasificación: arnés, aplicado con entrada en `docs/log.md`.

# Qué debe probar el usuario

- En playtest, equipar la maza y un enemigo adyacente: los ocho alrededor deben
  recibir su tirada, aliados y centro no.
- Anillo de robo con la maza: una curación por enemigo golpeado, sin pasar del PV
  máximo.
- Collar y guantes: +2 MP y +1 acción visibles en la ficha y sin acumularse al
  cambiar de turno.
