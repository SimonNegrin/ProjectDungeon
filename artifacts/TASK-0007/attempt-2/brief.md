---
type: Task Brief
title: "Brief — TASK-0007 intento 2: cumplir R-002 en EXP-001"
description: Ajustar los tres generadores para reservar 2 salas grandes y 3 pequeñas, añadir métricas y tests de R-002.
task: TASK-0007
attempt: 2
status: stable
branch: task/TASK-0007
created_at: 2026-11-07T18:20:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T18:20:00Z }
---

# Objetivo

Corregir `EXP-001` para que las tres variantes **aspiren de verdad a `R-002` de
`REQ-003`**: con los parámetros por defecto y la semilla `20261107`, cada variante
debe generar al menos **2 salas grandes** (7×7 a 11×11) y al menos **3 salas
pequeñas** (3×3 a 5×5), manteniendo 8-12 salas, sin solapes, con 1 tile de
separación, conectividad 100 %, pasillos de 1 tile y 1-3 bucles.

El fallo detectado: con la semilla de referencia, A tenía área máxima 33, B 64 y
C 81; no se garantizaban las 2 grandes, y B/C solo tenían una. Hay que reservar
explícitamente las salas grandes y pequeñas, no confiar en que el azar las
produzca.

No se cambia `REQ-003`, ni sus criterios creativos, ni la pregunta/decisión de
`EXP-001`. No se elige variante ganadora. La tarea queda en `review` para el
playtest de `human:simon`.

# Contexto

- Rama: `task/TASK-0007`, sincronizada con `main` en `b2e49da`. Intento 1 en
  `artifacts/TASK-0007/attempt-1/`; no lo borres.
- Requisito: `docs/requirements/REQ-003-generacion-mapa.md`, R-002.
- Experimento: `experiments/EXP-001-generador-mazmorra/`.
- Implementación actual:
  - `src/dungeon.ts`: generadores, validadores y `computeMetrics`.
  - `src/render.ts`: Canvas y overlays.
  - `src/main.ts`: definición del experimento.
  - `src/dungeon.test.ts` y `src/variants.test.ts`.
  - `tests/e2e/experiment-generator.spec.ts`.
- Semilla de referencia: `20261107`. Parámetros por defecto: `roomTarget=10`,
  `roomMin=3`, `roomMax=11`, `loopRatio=20`, `showDoors=true`, mapa 32×32.

# Cambios requeridos

## 1. Programa de salas con roles

Introduce un plan determinista de salas:

- `largeTarget = 2` (mínimo), con lados 7-9 (o 7..min(9, roomMax)) para que
  quepan y cuenten como grandes.
- `smallTarget = 3`, con lados 3..min(5, roomMax) y ≥ roomMin.
- El resto, medianas (6-8 si el rango lo permite).
- Con `roomMin > 5` no se pueden generar pequeñas de 3-5: normaliza, mantén la
  página viva y emite un aviso visible que mencione que no se pueden reservar las
  3 salas pequeñas. Con los valores por defecto **no se permite** ese aviso como
  excusa: debe cumplirse.

Reglas de clasificación para métricas y tests (no las cambies):

```ts
large = width >= 7 && height >= 7 && width <= 11 && height <= 11
small = width >= 3 && height >= 3 && width <= 5 && height <= 5
```

No falsees las dimensiones ni las métricas. Los valores deben salir del mapa
generado.

## 2. Variante A (BSP)

Reserva las salas antes o durante la partición. Opciones válidas:

- BSP con programa de roles: reparte el rectángulo 28×28 asignando roles a
  subregiones y divide solo si cada hijo puede alojar su rol (2 hojas de al menos
  9×9 para grandes, 3 de al menos 5×5 para pequeñas).
- O asigna roles a hojas con capacidad suficiente, eligiendo primero las mayores.

No basta con `leafIndex < 2` / `< 5` como ahora. Si una hoja no puede alojar su
rol, replantea la partición o reintenta con otra división determinista. Con la
semilla de referencia deben salir 2 grandes y 3 pequeñas reales.

## 3. Variantes B y C (salas + pasillos e híbrido)

Coloca primero las 2 grandes y las 3 pequeñas, luego las medianas:

- tamaño grande 7-9, pequeño 3-5, mediano 6-8;
- sin solapes y con al menos 1 tile de separación;
- reintentos deterministas con el mismo PRNG si una colocación falla;
- si tras los reintentos no caben, usa un empaquetado determinista de respaldo
  que garantice los roles (puede ser menos orgánico) y registra el ajuste en
  `warnings`; no reduzcas por debajo de 2 grandes / 3 pequeñas con los valores
  por defecto;
- mantén la estructura propia de cada variante (árbol de expansión + L/Z en B;
  relleno laberíntico en C).

## 4. Métricas visibles

Añade a `computeMetrics`, después de las actuales:

- **Grandes**: número de salas con `large`; hint `7×7 a 11×11`.
- **Pequeñas**: número de salas con `small`; hint `3×3 a 5×5`.

Puedes añadir también "Medianas" si queda claro y no rompe tests, pero no es
obligatorio. Mantén las métricas existentes (salas, áreas, suelo, pasillos,
esquinas, callejones, bucles, huecos, conectividad, distancia, tiempo, huella,
ajuste).

## 5. Tests

Actualiza/añade en `src/dungeon.test.ts` y `src/variants.test.ts`:

- Para cada variante y al menos 3 semillas (`1`, `123`, `20261107`), con los
  valores por defecto:
  - `largeCount >= 2`;
  - `smallCount >= 3`;
  - 8-12 salas;
  - dimensiones de cada sala dentro de `[roomMin, roomMax]`;
  - se mantienen conectividad, sin solapes, pasillos de 1 tile, bucles, huecos y
    apariciones.
- Test de métricas: `computeMetrics` incluye `Grandes` y `Pequeñas` y sus valores
  coinciden con el recuento real.
- Test de parámetros extremos (`roomTarget=12`, `roomMin=6`, `roomMax=8`,
  `loopRatio=40`): la página/estado no se rompe y hay aviso de normalización
  visible (por ejemplo, que no se pueden reservar 3 pequeñas).
- No borres ni debilites tests existentes. Si un test antiguo asumía que no había
  roles, adáptalo sin reducir cobertura.

## 6. E2E y capturas

Actualiza `tests/e2e/experiment-generator.spec.ts`:

- En la carga con `?test=1&seed=20261107`, comprueba en el snapshot de las tres
  variantes que las métricas `Grandes` ≥ 2 y `Pequeñas` ≥ 3.
- Comprueba que el texto `Grandes` y `Pequeñas` aparece en los tres paneles.
- Mantén las comprobaciones de semilla, cambio de semilla, `showDoors`, decisión,
  parámetros extremos y reset.
- Guarda las capturas nuevas en
  `artifacts/TASK-0007/attempt-2/screenshots/` con viewport 1600×1200:
  A/B/C con semilla `20261107`, semilla alternativa y `showDoors` off.
- Adjunta las capturas con `testInfo.attach`.

# Archivos previstos

```text
experiments/EXP-001-generador-mazmorra/src/dungeon.ts
experiments/EXP-001-generador-mazmorra/src/dungeon.test.ts
experiments/EXP-001-generador-mazmorra/src/variants.test.ts
tests/e2e/experiment-generator.spec.ts
artifacts/TASK-0007/attempt-2/
```

No cambies `main.ts` salvo que sea imprescindible (por ejemplo, algún tipo); no
cambies parámetros ni textos de la pregunta. No toques `src/`, `index.html`,
`public/`, `package.json`, lockfile, `_shell/`, specs existentes ni `REQ-003`.

# Comandos y timeouts

| Comando | Timeout | Qué valida |
|---|---:|---|
| `pnpm run test` | 120 s | Unitarios e integración, incluidos R-002 |
| `pnpm run verify` | 180 s | Docs, config, tests y build |
| `pnpm run test:e2e` | 300 s | Spec nuevo y regresiones E2E |
| `pnpm exec tsc --noEmit` | 120 s | Tipos |

Playwright usa su `webServer` en 4173; no dejes servidores vivos. Al ejecutar E2E
se sobrescriben capturas de otras tareas: revierte con `git checkout --` cualquier
cambio en `artifacts/TASK-0003/**` o `artifacts/TASK-0006/**` antes de commitear.

# Artefactos y respuesta

Crea:

```text
artifacts/TASK-0007/attempt-2/
  report.md
  test-output.txt
  screenshots/
    variant-a-seed-20261107.png
    variant-b-seed-20261107.png
    variant-c-seed-20261107.png
    alternative-seed.png
    doors-off.png
```

`report.md` con frontmatter OKF, estado, commit SHA, cambios, comandos/resultados,
tabla de métricas de A/B/C con `20261107` (incluyendo **Grandes** y **Pequeñas** y
las dimensiones de las salas grandes/pequeñas reales), criterios, desviaciones y
limitaciones. No marques la tarea como `done` ni tomes la decisión creativa.

Devuelve un informe breve con estado, commit SHA, métricas nuevas de A/B/C,
comandos, artefactos y desviaciones. Si no puedes cumplir R-002 con los valores
por defecto, para y devuelve un bloqueo con evidencia en lugar de falsear datos.
