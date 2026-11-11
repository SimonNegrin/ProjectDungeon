---
type: Task Brief Detail
title: "TASK-0066: detalle del brief del intento 1"
description: Contrato técnico esperado para el módulo de datos del banco de ajuste.
task: TASK-0066
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-11T20:30:00Z }
---

# Contrato técnico esperado

El modulo debe ser puro (sin DOM) y exportarse desde
`experiments/EXP-003-mesa-combate/src/v2/index.ts`. Los nombres son orientativos;
lo obligatorio es que el contrato quede claro, tipado y exportado.

## Objetivos

- `GUIDE_TARGETS`: guia inicial `{ centinela: 75, cobarde: 85, bruto: 30 }`.
- `MARGIN_PP = 5`.
- Crear objetivos a partir de la guia; validar entero 0-100 (rechaza 101, 75.5,
  `NaN`, texto); reset de un objetivo, de un enemigo y global.

## Catalogo de trabajo

- `createWorkingCatalog(base = CATALOG, overrides)`: devuelve un `Catalog`
  nuevo. No muta `base` ni sus arrays/objetos.
- Overrides de enemigo: `stats` (habilidad, fuerza, defensa, resistencia),
  `maxHp`, `maxActions`, `armorId`, `shieldId`, `weaponId`.
- Overrides de arma: `accuracy` y `damage`.
- `emptyOverrides()`; reset por enemigo, por arma y global. Sin overrides, el
  catalogo de trabajo es equivalente al base.

## Filas afectadas y recalculo

- Por enemigo: sus 4 filas (Guerrero, Picaro, Mago, Clerigo).
- Por arma: todas las filas de las unidades que la equipan, deduplicadas. Con el
  catalogo base: espada -> Guerrero (3) + Centinela (4); daga -> Picaro (3) +
  Cobarde (4); hacha -> Bruto (4); cuchillo -> 0.
- `recalculateMatchups(payload, catalog, selection)`: recalcula solo esas filas
  con `runMatchup(heroId, enemyId, payload.seed, payload.duels, catalog)`,
  conserva el resto de `matchups` sin cambios y mantiene el orden fijo.

## Diagnostico

- `diagnoseEnemy(matchups, target, margin = MARGIN_PP)`:
  - por fila: `heroId`, `heroWinRate`, `target`, `delta` (real - objetivo,
    redondeado a 4), `inside` (`|delta| <= margin`);
  - `insideCount` 0-4 y `outside` con la desviacion firmada;
  - `min`, `max` y `dispersion` (max - min) de los win %;
  - `problems`: dispersion > 10 pp (bloque compartido que no centra las 4
    filas), filas fuera, y arma del enemigo usada tambien por heroes (efecto
    global en ambos bandos). Avisos legibles y serializables; no bloquean ni
    corrigen nada.
- El 4-de-4 es diagnostico, no aprobacion: ningun helper lanza por filas fuera.

## Export

- `buildBenchExport(...)`: incluye catálogo ajustado, objetivos, overrides,
  semilla, duelos, resultados, diagnostico y `overridesId` determinista.
- `overridesId`: hash estable del JSON canonico de overrides; mismos valores =>
  mismo id. Sin timestamp ni aleatoriedad.
- `benchExportJson`: dos ejecuciones con el mismo estado producen el mismo texto.
- `benchExportFileName`: distingue la ejecucion ajustada de la base y no
  sobrescribe el export base (`EXP-003-v2.0-seed-...json`).

## Tests obligatorios

- overlay y reset; `CATALOG` intacto tras aplicar y resetear.
- objetivos: guia, validacion entera y reset.
- filas afectadas por enemigo y por arma (incluye deduplicacion y arma sin
  usuarios).
- diagnostico 4-de-4, delta, min/max/dispersion, filas fuera y avisos.
- determinismo del export y del `overridesId`.
- integracion: dos mediciones con los mismos overrides producen el mismo
  payload; cambiar un enemigo no altera las filas de los otros.

## Fuera de alcance

- No modificar `main.ts`, `ui.ts`, CSS, HTML ni la API `window.__experiment`
  (eso es TASK-0067). No crear E2E. No editar `experiment.md` ni docs.
