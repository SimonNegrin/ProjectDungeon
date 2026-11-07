---
type: Task Report
title: "TASK-0007 — Intento 2: roles de sala y R-002 en EXP-001"
description: Reserva determinista de 2 salas grandes y 3 pequeñas en A/B/C, métricas Grandes/Pequeñas, tests de tres semillas y E2E actualizado.
task: TASK-0007
attempt: 2
status: stable
result: implemented
branch: task/TASK-0007
commit: fc6e002c0f7c7377cdd020adc73ab342567466a8
created_at: 2026-11-07T19:30:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T19:30:00Z }
---

# Estado

`implemented`. La tarea **no** se marca como `done`: la decisión creativa y el
cierre siguen siendo del `task-lead` y de `human:simon`. No se ha elegido
variante ganadora.

# Resumen

Se corrige el fallo de R-002 del intento 1. Con los parámetros por defecto y la
semilla `20261107`, las tres variantes generan ahora al menos 2 salas grandes
(7×7 a 11×11) y 3 pequeñas (3×3 a 5×5), mantienen 8-12 salas, conectividad
100 %, pasillos de 1 tile y 1-3 bucles.

Cambios principales en `experiments/EXP-001-generador-mazmorra/src/dungeon.ts`:

- **Programa de roles determinista**: 2 grandes (7-9), 3 pequeñas (3-5) y el
  resto medianas (6-8). Si `roomMin > 5`, no se inventan salas pequeñas: se
  normaliza y se emite un aviso visible que menciona que no se pueden reservar
  las 3 pequeñas.
- **Variante A (BSP)**: la partición se reintenta de forma determinista y los
  roles se asignan a hojas con capacidad suficiente (las mayores primero para
  los roles grandes), sin depender de `leafIndex` ni del azar.
- **Variantes B y C**: se colocan primero las 2 grandes y las 3 pequeñas y
  después las medianas, con reintentos deterministas. Si la colocación aleatoria
  no cabe, se usa un empaquetado determinista de respaldo que garantiza los
  roles y se registra en `warnings`; no se reduce el mínimo por defecto.
- **Métricas visibles**: `computeMetrics` añade `Grandes` (hint `7×7 a 11×11`) y
  `Pequeñas` (hint `3×3 a 5×5`), calculadas a partir de las dimensiones reales
  del mapa.
- **Conectividad**: se mantiene el árbol de expansión + L/Z de B, el relleno
  laberíntico de C y la conexión de hermanos BSP. Se rechazan intentos con
  salas sin conectar y se reintenta con el mismo PRNG; no se falsean métricas.

# Commit

- Implementación, tests, E2E y artefactos:
  `fc6e002c0f7c7377cdd020adc73ab342567466a8`
  (`fix(EXP-001): reserve large and small rooms for R-002`).
- Este informe se añade en un commit posterior sobre la misma rama.

# Archivos cambiados

```text
experiments/EXP-001-generador-mazmorra/src/dungeon.ts
experiments/EXP-001-generador-mazmorra/src/dungeon.test.ts
experiments/EXP-001-generador-mazmorra/src/variants.test.ts
tests/e2e/experiment-generator.spec.ts
artifacts/TASK-0007/attempt-2/**
```

No se han modificado `src/`, `index.html`, `public/`, `package.json`, el
lockfile, `experiments/_shell/`, `docs/requirements/REQ-003`, `experiment.md`,
`experiments/manifest.ts` ni los specs E2E existentes.

# Comandos ejecutados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run test` | 120 s | 18 archivos, **145 tests**, OK |
| `pnpm run verify` | 180 s | docs 56/7/2, config 3/9, 145 tests, `tsc` y build 39 módulos, OK |
| `pnpm run test:e2e` | 300 s | **11 tests E2E**, OK (incluye `experiment-generator.spec.ts`) |
| `pnpm exec tsc --noEmit` | 120 s | OK |

Salida completa en `artifacts/TASK-0007/attempt-2/test-output.txt`. Playwright usó
su `webServer` en el puerto 4173 y lo cerró al terminar; no se han dejado
servidores vivos.

# Métricas con la semilla de referencia

Semilla `20261107`, parámetros por defecto (`roomTarget=10`, `roomMin=3`,
`roomMax=11`, `loopRatio=20`, `showDoors=true`, mapa 32×32). Los valores salen
del estado generado; el JSON completo está en
`artifacts/TASK-0007/attempt-2/metrics-defaults.json`. El tiempo de generación
solo se mide en el host (no en la función pura); se indica el valor leído de la
captura.

| Métrica | A · BSP | B · Salas + pasillos | C · Híbrido |
|---|---:|---:|---:|
| Salas | 10 | 10 | 10 |
| **Grandes** | **3** | **2** | **3** |
| **Pequeñas** | **3** | **3** | **3** |
| Área mín. | 15 | 9 | 9 |
| Área mediana | 45 | 36 | 36 |
| Área máx. | 63 | 49 | 81 |
| Suelo | 47.7 % | 33.5 % | 59.8 % |
| Pasillos (tiles fuera de sala) | 102 | 38 | 231 |
| Esquinas | 14 | 4 | 11 |
| Callejones | 0 | 0 | 73 |
| Bucles | 2 | 2 | 2 |
| Huecos | 22 | 22 | 22 |
| Conectividad | 100 % | 100 % | 100 % |
| Distancia jugador→enemigo | 64 | 42 | 75 |
| Huella | `a590dc2b` | `6317bc90` | `9568a9eb` |
| Tiempo en captura | 250.9 ms | 169.5 ms | 79.7 ms |

## Salas grandes y pequeñas reales (semilla 20261107)

**A · BSP**

- Grandes: `9×7@3,22`, `7×7@22,3`, `7×7@22,12`.
- Pequeñas: `4×4@11,3`, `3×5@17,4`, `5×4@15,15`.

**B · Salas + pasillos**

- Grandes: `7×7@2,2`, `7×7@12,2`.
- Pequeñas: `3×3@12,24`, `3×3@18,24`, `3×3@24,24`.
- Aviso visible: «Colocación de respaldo determinista para garantizar 2 salas
  grandes y 3 pequeñas».

**C · Híbrido**

- Grandes: `9×9@20,7`, `7×8@8,20`, `7×8@23,22`.
- Pequeñas: `3×3@4,23`, `5×4@17,18`, `3×3@26,18`.

Las tres variantes mantienen 8-12 salas, sin solapes, con al menos 1 tile de
separación, conectividad 100 %, pasillos de 1 tile y 2 bucles.

# Criterios de aceptación

1. **2 grandes + 3 pequeñas en A/B/C con `20261107`.** Cumplido; ver tabla y
   dimensiones reales.
2. **Tres semillas por variante (`1`, `123`, `20261107`).** Los tests unitarios
   exigen `large >= 2`, `small >= 3`, 8-12 salas y dimensiones dentro de
   `[roomMin, roomMax]` para las 9 combinaciones. OK.
3. **Sin solapes y 1 tile de separación.** `rectsOverlap(..., 1)` en colocación
   y tests de pares de salas. OK.
4. **Conectividad 100 %, pasillos de 1 tile y 1-3 bucles.** Tests de BFS,
   `countWideFloor === 0` y recuento de bucles. OK.
5. **Métricas `Grandes` y `Pequeñas`.** Añadidas a `computeMetrics` con sus
   hints; un test comprueba que coinciden con el recuento real. OK.
6. **Parámetros extremos (`12/6/8/40`).** La página sigue viva, se normaliza y
   aparece el aviso de que no se pueden reservar 3 salas pequeñas. Test unitario
   y E2E. OK.
7. **E2E actualizado.** Comprueba `Grandes` y `Pequeñas` en los tres paneles y
   en el snapshot (`>= 2` y `>= 3`), mantiene semilla, cambio de semilla,
   `showDoors`, decisión, extremos y reset. OK.
8. **Capturas nuevas.** A/B/C con `20261107`, semilla alternativa `12345` y
   `showDoors` desactivado, viewport 1600×1200. OK.
9. **Sin cambios fuera de alcance.** El diff final solo toca el experimento, el
   spec nuevo y `artifacts/TASK-0007/attempt-2/**`. Las capturas de
   TASK-0003/TASK-0006 que el E2E sobrescribe se revirtieron antes de commitear.

# Desviaciones y limitaciones

- **B usa el empaquetado de respaldo con la semilla `20261107`.** Los intentos
  aleatorios no colocaron el programa completo; el respaldo determinista sí
  garantiza 2 grandes y 3 pequeñas, pero produce una rejilla menos orgánica. El
  ajuste se muestra en la métrica `Ajuste` y no se oculta. Es el
  comportamiento previsto por el brief para este caso.
- **Tiempo de generación.** En la captura, A tarda 250.9 ms y B 169.5 ms, por
  encima del objetivo de 100 ms de T-007 para producción. El intento 1 ya
  documentó que algunas semillas superaban ese umbral; este intento añade
  reintentos de roles y no se ha optimizado el rendimiento porque el brief se
  centra en R-002. C tarda 79.7 ms. No se ha falseado la métrica.
- **Capturas A/B/C.** Son capturas del `stage` de cada variante (324×928 px)
  dentro del viewport 1600×1200; las capturas de semilla alternativa y
  `showDoors` off son de página completa. El viewport del test es 1600×1200.
- No se eligió variante ganadora. `REQ-003` sigue en v1 y `experiment.md` no se
  tocó.

# Artefactos

```text
artifacts/TASK-0007/attempt-2/report.md
artifacts/TASK-0007/attempt-2/test-output.txt
artifacts/TASK-0007/attempt-2/metrics-defaults.json
artifacts/TASK-0007/attempt-2/screenshots/
  variant-a-seed-20261107.png
  variant-b-seed-20261107.png
  variant-c-seed-20261107.png
  alternative-seed.png
  doors-off.png
```

# Qué debe revisar el usuario

1. Abrir `/experiments/EXP-001-generador-mazmorra/` con `?seed=20261107` y
   comprobar que las tres variantes muestran `Grandes`/`Pequeñas` y que las
   salas se leen como tales.
2. Valorar si el empaquetado de respaldo de B para esta semilla es aceptable o
   si prefiere otra semilla/ajuste antes de decidir.
3. Probar varias semillas y los parámetros extremos, y revisar el aviso de
   normalización de salas pequeñas.
4. Registrar la decisión de variante (o `ninguna`) y actualizar `REQ-003` a v2.
   Esa decisión no la toma este informe.
