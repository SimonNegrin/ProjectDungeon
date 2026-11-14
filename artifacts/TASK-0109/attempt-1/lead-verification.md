---
type: Task Verification
title: "TASK-0109: verificación independiente del lead"
description: Reejecución de verify y E2E, revisión de capturas, criterios y disposición de fricción.
task: TASK-0109
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T14:11:05Z }
---

# Comandos reejecutados

| Comando | Timeout | Resultado | Evidencia |
|---|---:|---|---|
| `pnpm run verify` | 240 s | OK: docs:check, config:check, 1317/1317 tests, `tsc`, build y bundle | `lead-verify-output.txt` |
| `pnpm run test:e2e` | 240 s | OK: 183/183 en 1,5 min, 4 workers | `lead-e2e-output.txt` |
| `pnpm run docs:check` | 60 s | OK: 522 documentos, 110 tareas; 129 avisos históricos, ningún fallo | incluido en `verify` |

# Diff y alcance

- Rama `task/TASK-0109` fusionada en `main` como `d2f1a21`.
- Cambios revisados: `tests/e2e/qa-visual-revision-ui.spec.ts` (nuevo, 13 tests),
  ayudantes locales del propio spec, brief, informe, capturas, logs y la ficha
  de tarea. Sin cambios en `src/**`, `index.html`, `public/**`, `docs/**` de
  requisitos/arnés/plantillas ni en tests existentes.
- Sin `test.skip`, `test.only`, `describe.skip` ni aserciones retiradas. El
  spec nuevo añade cobertura; no sustituye ni debilita la existente.

# Criterios comprobados

1. **Capturas:** 35 PNG a 900×700 y 1280×720 de tres zonas, HUD con/sin maná y
   con/sin traits, ficha con/sin traits, panel con mochila llena, sin/con
   cadáveres, suelo con objetos, tres columnas, cursor, CLS y escala.
2. **Escala continua:** `--ui-scale` = altura del marco / 416 y `--ui-line` =
   escala en 900, 901, 1024, 1100 y 1280. De 900 a 901 la línea cambia
   0,001352 px; cuerpo 13,1452 px a 900 y 17,9308 px a 1280, dentro de ±1 px de
   12,8/18,8; relación cuerpo/altura constante y slots proporcionales.
3. **Paleta y relieve:** ocho tokens exactos (`#2f142f`, `#2a584f`, `#774448`,
   `#6eb8a8`, `#fcffc0`, `#ee9c5d`, `#c6505a`, `#74a33f`); outset claro/oscuro
   en HUD, zonas, ficha y columnas; inset en slots; sin radios, sombras,
   degradados, blur ni translucidez.
4. **Ficha derecha:** sin «Seleccionado», «Stats», tipo duplicado ni
   descripciones; «Equipado» solo en el segundo bloque; sprite pixelado y stats
   en una fila vertical por stat; traits condicionales.
5. **Slots:** tres columnas de 137,0625 px a 900×700; slots cuadrados de
   39,890625 px en Equipo, Bolsa y Suelo; sprites dentro del área interior,
   centrados en ambos ejes (±1 px) y sin desborde.
6. **Cadáveres:** sin cadáveres la sección está oculta, mide 0 y no deja título,
   texto ni hueco; con Bruja, Centinela y Bruto se ven tres celdas con sprite y
   nombre o tipo antes del Suelo.
7. **Cursor:** transición de 100 ms solo entre vecinos horizontales; 0
   transiciones en cambio de fila, zona, scroll y `prefers-reduced-motion`;
   centro transparente, borde de foco por fuera del bisel, foco DOM en el slot y
   sprite visible. El scroll se cubre además en `panel-cursor-cls-qa`.
8. **CLS:** 0 shifts prohibidos en marco, panel, columnas, títulos y slots de
   equipo/bolsa al abrir/cerrar, navegar, equipar, recoger/soltar, cambiar de
   tile y aparecer/desaparecer cadáveres. Los 2 shifts por viewport son internos
   de `hud-panel-equipped`, con `hadRecentInput`, y quedan en su zona (P-006).
9. **Tres columnas a 900×700:** panel 488,25×488,25 dentro del marco
   868×488,25; columnas de 137,0625 px con hueco de 9,375 px; títulos alineados
   a `top` 127,375; sin solapes, recortes ni scroll horizontal. **Encaja.**
10. **Tests:** `pnpm run verify` y `pnpm run test:e2e` verdes; sin tests
    debilitados ni cambios fuera de alcance.

# Veredicto visual

Pasa. Las capturas revisadas (tres zonas, tres columnas, cadáveres, ficha con
traits, HUD con maná, cursor y 1280×720) muestran la paleta, los biseles, los
slots y los sprites sin desbordes ni vocabulario web moderno.

# Observación no bloqueante: retrato

`hud-portrait` usa la misma imagen y posición para guerrero, mago y pícaro
(`identical: true` en `logs/portrait-audit.json`). **Contradice REQ-022 R-002**
en su texto vigente: la miniatura debe cambiar al cambiar de jugador activo.
Es una carencia previa de TASK-0105, no introducida por REQ-033; R-007 de esta
hoja solo exige sprite, nombre, arquetipo y condición, así que **queda fuera de
los criterios de aceptación de REQ-033 y no bloquea TASK-0109**. Se eleva a
`requirements-writer` para decidir si se abre una tarea de corrección; el lead
no la crea ni reabre TASK-0105.

# Fricción

`artifactPath(testInfo, 'logs', name)` colisiona entre viewports paralelos: el
último test sobrescribe el log del otro. El runner lo resolvió añadiendo
`<viewport>` como segmento (`logs/900x700/`, `logs/1280x720/`), sin cambiar
contenido. Es una carencia del helper/guía de artefactos, no del producto:
**disposición `deferred (harness-keeper)`**, elevada con evidencia a
`requirements-writer` para que el usuario decida si la aplica el arnés. No
bloquea ni cambia los criterios.
