---
type: Task Brief Detail
title: "TASK-0135: detalle del intento 1"
description: Contrato técnico del render de cadáveres desde contenedores y evidencia visual.
task: TASK-0135
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-15T12:22:28Z }
---

# Alcance exacto

Solo presentación en Canvas. `src/game/**`, `src/host/inventory-panel*.ts`,
`tests/unit/host/inventory-panel.test.ts` y las reglas de botín/muerte quedan
fuera. TASK-0136 implementa el panel de saqueo y sus costes.

# Contrato de render

1. Sustituye el bucle de `src/host/renderer.ts` que hoy recorre
   `[...state.enemies, ...state.players]` y pinta los `hp <= 0` por un mapeo de
   `state.containers ?? []`.
2. Solo entran contenedores con `kind === 'corpse'`; los cofres/fixtures sin
   `kind` no se dibujan nunca como cadáver.
3. Agrupa por tile `(x, y)` conservando el orden estable de `state.containers`.
   Cada grupo produce una marca con `x`, `y`, `count`, ids de contenedor y un
   rect de decal. Un helper puro exportado (por ejemplo `corpseMarks`) facilita
   los tests de mapeo; no debe mutar el estado.
4. El decal de cada marca reutiliza `corpseRectFor({ id: corpseOf ?? id, x, y })`
   con el primer contenedor del grupo. No se añade arte ni se cambia
   `corpse-22a/b`.
5. Si `count > 1`, dibuja además una indicación determinista de pila sobre el
   mismo tile: contador textual `×N` en un fondo oscuro pequeño y legible, sin
   sprite nuevo. Es la información de que hay más de uno; el decal no se
   duplica encima de sí mismo.
6. La marca se dibuja en la capa actual de cadáveres (después de los decals de
   suelo y antes de muros/unidades). El contador puede usar `fillRect` y
   `fillText`; si el fake context de los tests no implementa `measureText` /
   `fillText`, extiéndelo en el test sin cambiar el render real.
7. Respeta `tileVisible` y el viewport/cámara como el resto del render.

# Beat de muerte

`presentationState` no rebobina `containers`; durante una animación el
contenedor del estado final ya existe. Para que el cadáver no se adelante:

- oculta una marca cuyo `corpseOf` esté en `options.dyingUnitIds` (muerte futura);
- ocúltala también mientras `options.effects?.has(corpseOf)` (cue de muerte en
  curso; también cubre el ataque previo, que es anterior al cadáver);
- sin animación (`dyingUnitIds`/`effects` ausentes) dibuja el contenedor tal cual.

Un `corpseOf` ausente no se puede asociar a un beat: se dibuja desde el estado.
No añadas un estado paralelo de muertos ni cambies `src/game/`.

# Retirada y persistencia

- El cadáver de enemigo desaparece porque su contenedor lo elimina el motor
  (TASK-0133); el render no inventa otra retirada. Al volver a renderizar sin ese
  contenedor no debe quedar decal.
- El cadáver de jugador se dibuja aunque su contenedor esté vacío; no filtres por
  contenido.
- Una unidad `hp <= 0` sin contenedor no produce ninguna marca.

# Tests unitarios

- `tests/unit/host/renderer.test.ts`:
  - contenedor de cadáver produce el decal en su tile;
  - unidad muerta sin contenedor no produce decal (sin `sy === 672`);
  - dos contenedores en el mismo tile producen un decal y un contador de pila
    (no dos decales apilados);
  - contenedor retirado del estado no deja marca;
  - `dyingUnitIds` y `effects` ocultan la marca; sin ellos reaparece;
  - no muta el estado y conserva el orden de capas.
  - Actualiza el test existente “dibuja el cadáver sobre el suelo…” para que su
    cadáver venga de un contenedor; conserva su intención de orden y rejilla.
- `tests/unit/host/presentation-feedback.test.ts`: añade la comprobación de que
  `presentationState` deja el contenedor pero el render lo oculta hasta acabar
  el beat (`dyingUnitIds` + `effects`), y lo muestra después.

# E2E / visual

Spec nueva y acotada: `tests/e2e/corpse-containers-render-qa.spec.ts`.

- Construye en Node un estado BSP con un jugador y dos contenedores de cadáver
  en la misma casilla visible; añade una unidad muerta sin contenedor en otro
  tile visible. Carga con `openState`.
- Comprueba el snapshot: contenedores presentes y sin cadáver para la unidad
  sin contenedor.
- Captura `screenshots/mapa-dos-cadaveres.png` (evidencia pedida) y, si ayuda,
  `screenshots/sin-contenedor.png` con el mismo estado sin contenedores.
- No ejecutes la suite completa; TASK-0142 la cubre. No toques fixtures de otras
  specs.

Comando previsto:

```bash
E2E_ARTIFACTS_DIR=artifacts/TASK-0135/attempt-1 pnpm run test:e2e tests/e2e/corpse-containers-render-qa.spec.ts
```

# Evidencia y cierre

- `report.md` (≤ 2 KB), `test-output.txt`, `verify-output.txt`, `e2e-output.txt`,
  `commit.txt` y capturas bajo el directorio del spec.
- No edites `docs/**`: el lead actualiza ficha, diseño, log y tablero.
- Si un criterio no se puede cumplir sin tocar el panel o el motor, devuelve
  `blocked` con la evidencia; no amplíes el alcance.
