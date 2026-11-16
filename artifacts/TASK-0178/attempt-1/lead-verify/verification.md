---
type: Verification
title: "TASK-0178: verificación del intento 1"
description: "Curación adyacente y autocuración con 8/6, rechazo a PV completo y Resurrección por 12, verificado en motor y tests."
task: TASK-0178
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-16T23:17:20Z }
---

# Resultado

`ok`. `pnpm run verify:task TASK-0178` pasa con 5 criterios firmados, informe
`success` y `pnpm run verify` verde (118 archivos, 1909 tests, build y bundle).
La salida mecánica está en `verify-task.txt`.

# Criterios

- **Catálogo:** Curación III 8 de maná, alcance 1–1, 6 PV, objetivo aliado;
  Resurrección IV 12. Los tests leen `SPELLS` y no duplican los números.
- **Curación adyacente:** los tests cubren ortogonal y diagonal, `min(6, PV
  máximo − actual)`, 8 de maná, 1 acción y 1 hueco del tope de 2.
- **Autocuración:** válida a distancia 0, mismo coste; enemigo y cadáver siguen
  rechazados; a 2 casillas se rechaza por alcance.
- **PV completo:** `target-full-hp`, sin consumir maná, acción, hueco ni RNG; el
  test compara el estado intacto.
- **Tests:** `magic`, `damage-matrix` y `engine` actualizados; no se eliminaron
  casos de tope, determinismo, maná insuficiente ni resurrección. `verify` pasa.

# Diff revisado

`src/game/spells.ts`, `src/game/magic.ts`, `src/game/types.ts` y tests de
`magic`, `damage-matrix` y `engine`. Todo dentro de `feature`; sin host, HUD ni
E2E. La autocuración actualiza gasto y PV en una sola unidad para no pisar el
estado. El caso «sin LOS» deja de ser observable a alcance 1 porque no hay casilla
intermedia; el motor conserva la comprobación y el informe lo declara.

Observación menor: el test de autocuración usa 16 de maná con nivel 3 para aislar
dos lanzamientos. Es un fixture sintético, no una regla de juego; el tope real y
la recuperación +4 se prueban en TASK-0177. No invalida el criterio.

# Qué debe probar el usuario

- Con el Clérigo junto a un aliado: `Q` → Curación III → `Enter` sobre el aliado;
  debe curar **6 PV** y gastar **8 de maná**.
- Curarse a uno mismo con `X`/`Enter` sobre la casilla propia.
- Intentar curar a un aliado a PV completo: debe rechazar sin gastar maná ni
  acción (el aviso legible llega en TASK-0179).
- Intentar curar a 2 casillas: debe seguir rechazando.
- **Los E2E antiguos siguen rojos** hasta TASK-0179; no es una regresión de juego.

# Cierre

Se fusiona TASK-0178. `pnpm run test:e2e` queda temporalmente rojo por los specs
que asumen curación a 2 casillas y 4 PV; TASK-0179 los actualiza y aporta el
aviso y las capturas. No se toca ningún otro documento.
