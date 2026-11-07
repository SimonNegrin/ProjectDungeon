---
type: Task Report
title: "TASK-0007 — Informe de implementación de EXP-001"
description: Construcción del comparador de generadores A/B/C con render 32rogues, métricas, decisión, tests y E2E.
task: TASK-0007
attempt: 1
status: stable
result: implemented
branch: task/TASK-0007
commit: 1164fcd1e47a72d8329607e069f2123f9392883c
created_at: 2026-11-07T18:04:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T18:04:00Z }
---

# Estado

`implemented`. La tarea **no** se marca como `done`: la decisión creativa, la
actualización de `REQ-003` y el cierre corresponden a `task-lead` y al usuario.

# Resumen

Se ha construido `EXP-001` en `experiments/EXP-001-generador-mazmorra/` usando
el shell compartido. La página compara tres generadores con la misma semilla y
parámetros:

- **A · BSP**: partición recursiva, salas en hojas, conexión de hermanos y bucles.
- **B · Salas + pasillos**: colocación sin solape, árbol de expansión y pasillos L/Z.
- **C · Híbrido**: salas + árbol + relleno laberíntico determinista en el espacio libre.

Cada variante renderiza un mapa de 32×32 con los tiles reales de
`public/assets/32rogues/tiles.png`, overlays de salas, huecos de puerta y
apariciones, métricas comparables y panel de decisión con exportación JSON.
El modo `?test=1&seed=...` es determinista y `window.__experiment` sigue
exponiendo parámetros, semilla, métricas y decisión.

# Commit

- Implementación + tests + artefactos: `1164fcd1e47a72d8329607e069f2123f9392883c`
  (`feat(EXP-001): add dungeon generator comparison experiment`).
- El informe se añade en un commit posterior sobre la misma rama.

# Archivos cambiados

Nuevos:

```text
experiments/EXP-001-generador-mazmorra/index.html
experiments/EXP-001-generador-mazmorra/src/main.ts
experiments/EXP-001-generador-mazmorra/src/dungeon.ts
experiments/EXP-001-generador-mazmorra/src/render.ts
experiments/EXP-001-generador-mazmorra/src/dungeon.test.ts
experiments/EXP-001-generador-mazmorra/src/variants.test.ts
experiments/EXP-001-generador-mazmorra/src/experiment.css
tests/e2e/experiment-generator.spec.ts
artifacts/TASK-0007/attempt-1/**
```

Modificados (solo dentro de `experiments/`):

```text
experiments/manifest.ts   # entrada EXP-001, estado ready
experiments/index.md      # EXP-001 pasa de "Propuesto" a "Listo para probar"
```

No se ha modificado `src/`, `index.html`, `public/`, `package.json`,
`pnpm-lock.yaml`, `playwright.config.ts`, `experiments/_shell/`, los specs E2E
existentes, `docs/requirements/REQ-003` ni `experiment.md`.

# Decisiones técnicas

- **Generación pura separada de DOM/Canvas.** `dungeon.ts` no importa el shell
  ni nada de `src/host/`; usa un PRNG local `mulberry32` con sal por variante y
  no lee relojes ni estado global. `main.ts` mide el tiempo con
  `performance.now()` alrededor de la llamada pura.
- **Mapa y salas.** 32×32 fijo en la UI; el generador acepta `width`/`height`
  para tests. Las salas se colocan con al menos 1 tile de separación y el borde
  queda cerrado por muro.
- **Conexiones.** Se eligen huecos de puerta en los cuatro lados, se reservan
  los muros perpendiculares y se rutea con L/Z; si no hay L/Z válida se usa un
  BFS acotado. Las conexiones extra se limitan a 3 y se validan contra el
  máximo de 3 huecos por sala.
- **Normalización visible.** Si una combinación no cabe, se reduce el objetivo
  efectivo o el tamaño máximo y se emite un `warning` que aparece en la métrica
  `Ajuste`. Si una sala queda atrapada sin pasillo válido, se descarta y se
  reconstruye el mapa con las salas restantes; también se informa.
- **Huecos.** Son tiles de suelo fuera de la sala, con muro a ambos lados
  perpendiculares al paso y sin tocar otra sala. `isDoorValid` lo comprueba.
- **Muros.** `wallTileFor` es puro: `wallSide1` solo si el sur es suelo;
  `wallTop` en el resto; el renderer nunca referencia `wallSide2`.
- **Suelo determinista.** `floor1`/`floor2`/`floor3` se eligen con un hash
  estable de `seed + x + y`, sin RNG de render.
- **Tiempo.** Se mide fuera de la función pura y se muestra en ms con un
  decimal. En los tests puros aparece `—` porque no hay host que lo mida.

# Comandos ejecutados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run test` | 120 s | 18 archivos, 143 tests, OK |
| `pnpm run verify` | 180 s | docs 54/7/2, config 3/9, 143 tests, build 39 módulos, OK |
| `CI=1 pnpm run test:e2e` | 300 s | 11 tests E2E, OK (incluye `experiment-generator.spec.ts`) |
| `pnpm exec tsc --noEmit` | 120 s | OK (también dentro de `build`) |
| `pnpm exec playwright test tests/e2e/experiment-generator.spec.ts` | 300 s | 1 test, OK (pasada intermedia) |

Salida completa en `artifacts/TASK-0007/attempt-1/test-output.txt`. Playwright
usó su `webServer` en el puerto 4173; no se dejaron servidores manuales vivos.

Nota de honestidad: en una primera pasada de `verify`, `tsc` detectó un import
`dirname` sin usar en el spec E2E. Se eliminó y la pasada final pasó. El
`test-output.txt` final contiene solo las pasadas buenas; el incidente se
documenta aquí.

# Criterios de aceptación

1. **Página y registro.** `/experiments/EXP-001-generador-mazmorra/` carga en
   E2E; `experiments/manifest.ts` tiene la entrada `EXP-001` y
   `experiments/index.md` la enlaza. OK.
2. **Tres variantes con misma semilla y parámetros.** A/B/C se montan en la
   misma página, reciben el mismo `seed` y `params` y se reconstruyen juntas.
   El snapshot E2E devuelve 3 variantes. OK.
3. **Semilla editable y reinicio.** E2E cambia la semilla por la UI, comprueba
   que el snapshot la refleja, y pulsa `Reiniciar` para volver a los valores por
   defecto y a la semilla inicial `20261107`. OK.
4. **Parámetros exactos.** `roomTarget` 8-12 (10), `roomMin` 3-6 (3),
   `roomMax` 8-11 (11), `loopRatio` 0-40 % paso 5 (20), `showDoors` (true),
   mapa 32×32. Definidos en `main.ts` y comprobados en E2E. OK.
5. **Mapas por defecto.** Los tests cubren 3 semillas × 3 variantes: 8-12 salas,
   conectividad 100 %, pasillos de 1 tile, 1-3 bucles y huecos válidos. Las
   combinaciones imposibles se normalizan con aviso visible. OK.
6. **Tiles reales y regla de muros.** Render con `tiles.png` precargado;
   `wallSide1` solo con suelo al sur, `wallTop` en el resto y `wallSide2` nunca.
   Tests de tabla y capturas. OK.
7. **Overlays.** Límites de sala, huecos (según `showDoors`), jugador y enemigo
   con marcadores distintos. El toggle se observa en
   `canvas.dataset.showDoors`. OK.
8. **Métricas.** Salas, área mín./mediana/máx., suelo, pasillos, esquinas,
   callejones, bucles, huecos, conectividad, distancia y tiempo. Además
   `Huella` y `Ajuste`. OK.
9. **Decisión.** Opciones A (BSP), B (salas+pasillos), C (híbrido) y
   `none`; el JSON exportado incluye semilla, parámetros, decisión, notas y
   `decidedAt`. E2E lo comprueba con `getDecision()`. OK.
10. **Modo test.** `?test=1&seed=20261107` es determinista; `window.__experiment`
    expone `getParams`, `getSeed`, `snapshot`, `getDecision`, `reset`, etc. OK.
11. **E2E nuevo.** `tests/e2e/experiment-generator.spec.ts` cubre carga, tres
    canvases, métricas, cambio de semilla, toggle de huecos, decisión,
    parámetros extremos, reinicio y capturas. OK.
12. **Verify y E2E.** Ambas pasadas finales pasan sin borrar, saltar ni
    debilitar tests. OK.
13. **Sin cambios fuera de alcance.** El diff final solo toca `experiments/`,
    `tests/e2e/` y `artifacts/`. Los cambios colaterales de capturas existentes
    producidos al ejecutar E2E se revirtieron antes de commitear. OK.

# Métricas de A/B/C con la semilla de referencia

Semilla `20261107`, parámetros por defecto (`roomTarget=10`, `roomMin=3`,
`roomMax=11`, `loopRatio=20`, `showDoors=true`). Tiempos leídos de las capturas
finales; el resto sale del estado puro.

| Métrica | A · BSP | B · Salas + pasillos | C · Híbrido |
|---|---:|---:|---:|
| Salas | 10 | 10 | 10 |
| Área mín. | 12 | 12 | 9 |
| Área mediana | 20 | 23 | 25 |
| Área máx. | 33 | 64 | 81 |
| Suelo | 25.8 % | 35.9 % | 59.0 % |
| Pasillos (tiles fuera de sala) | 68 | 57 | 292 |
| Esquinas | 18 | 10 | 15 |
| Callejones | 0 | 0 | 103 |
| Bucles | 2 | 2 | 2 |
| Huecos | 22 | 22 | 22 |
| Conectividad | 100 % | 100 % | 100 % |
| Distancia jugador→enemigo | 51 | 57 | 42 |
| Tiempo en captura | 96.8 ms | 91.1 ms | 74.2 ms |
| Huella | `bcc019b1` | `ae120bf5` | `e5589012` |

Los datos completos están en
`artifacts/TASK-0007/attempt-1/logs/metrics-seed-20261107.json`.

# Parámetros extremos (normalización)

Con `roomTarget=12`, `roomMin=6`, `roomMax=8`, `loopRatio=40`:

- **A · BSP**: 7 salas; aviso «Objetivo de salas ajustado a 7: la partición BSP
  no puede dividir más con salas de al menos 6 tiles».
- **B · Salas + pasillos**: 8 salas; avisos de objetivo ajustado a 8 y bucles
  ajustados de 3 a 2.
- **C · Híbrido**: 10 salas; avisos de objetivo ajustado a 10 y tamaño máximo
  ajustado de 8 a 6.

La página sigue viva, las tres variantes renderizan y el aviso se muestra en la
métrica `Ajuste`. No se cambian los valores del panel.

# Capturas

```text
artifacts/TASK-0007/attempt-1/screenshots/
  variant-a-seed-20261107.png   # A + métricas, semilla de referencia
  variant-b-seed-20261107.png   # B + métricas, semilla de referencia
  variant-c-seed-20261107.png   # C + métricas, semilla de referencia
  alternative-seed.png          # página completa con semilla 12345
  doors-off.png                 # página completa con showDoors desactivado
```

Revisadas visualmente: se ven los tiles reales de 32rogues, los límites de sala,
los huecos ámbar, el jugador azul (`J`) y el enemigo rojo (`E`). En
`doors-off.png` desaparecen los marcadores de hueco.

# Desviaciones

- Se actualizaron `experiments/index.md` y `experiments/manifest.ts` para
  registrar el experimento como listo para probar. Está dentro del alcance
  permitido y no toca la decisión.
- No se actualizó `experiment.md` (sigue `proposed`, sin decisión ni parámetros
  cambiados). La decisión creativa queda pendiente del usuario.
- La semilla `123` de la variante B descarta una sala atrapada sin pasillo
  válido y genera 9 salas con avisos visibles. Es normalización, no un fallo
  oculto: el mapa queda conexo y dentro de 8-12 salas.
- La variante C es mucho más densa por diseño (59 % de suelo y 103 callejones).
  No se ha suavizado para que parezca mejor; el usuario debe juzgar si esa
  sensación laberíntica es la buscada.
- El tiempo de generación varía con la semilla. En la semilla de referencia las
  tres variantes quedan por debajo de 100 ms en la captura; en Node, la semilla
  `123` de B puede tardar ~175-200 ms porque descarta una sala y reconstruye el
  mapa. El objetivo de producción `<100 ms` de `REQ-003` no se garantiza para
  todas las semillas en este experimento.

# Limitaciones conocidas

- El canvas lógico es 512×512 y el mapa 32×32, así que cada tile se dibuja a
  16 px lógicos; en la rejilla de tres columnas se ve a ~10 px CSS. Es legible,
  pero no es el encuadre final de producción.
- Los huecos se marcan con overlays; no se dibujan puertas ni bloquean el paso,
  conforme al alcance.
- El relleno de C es un árbol de ramificaciones conectado al suelo existente,
  no un laberinto perfecto con bucles propios. Añade densidad y callejones, pero
  no crea ciclos en el relleno.
- No se ha elegido variante ganadora ni se ha rellenado la decisión de
  `EXP-001`.

# Qué debe revisar el usuario

1. Abrir `/experiments/EXP-001-generador-mazmorra/` y comparar A/B/C con la
   semilla `20261107` y con varias semillas más.
2. Revisar la legibilidad de pasillos, huecos y apariciones, y si C es
   demasiado laberíntico.
3. Probar los parámetros extremos y comprobar que los avisos de normalización
   son comprensibles.
4. Elegir una variante (o `ninguna`), añadir notas y exportar el JSON. Esa
   decisión no la toma este informe.
