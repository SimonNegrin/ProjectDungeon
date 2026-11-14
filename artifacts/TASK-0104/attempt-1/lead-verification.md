---
type: Task Verification
title: "TASK-0104: verificación independiente del lead"
description: Reejecución de verify y E2E, revisión del diff y criterios.
task: TASK-0104
attempt: 1
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-14T12:28:58Z }
---

# Comandos reejecutados

| Comando | Timeout | Resultado |
|---|---:|---|
| `pnpm run verify` | 120 s | OK: docs:check, config:check, 1305/1305 tests, `tsc`, build y bundle |
| `pnpm run test:e2e` | 180 s | OK: 152/152, 4 workers, 1,1 min |

La corrida E2E del lead usó `E2E_ARTIFACTS_DIR=artifacts/TASK-0104/attempt-1/e2e-lead`;
se revisaron las capturas y después se retiró ese directorio duplicado. Las
capturas definitivas son las del intento en `e2e/`.

# Comprobaciones

- Diff completo `fbb6bb2..e35977d`: `src/host/**`, `index.html`, tests y
  artefactos; sin `src/game/**`, docs de requisitos/arnés/plantillas,
  dependencias ni TASK-0105..0110.
- Escala: `--ui-scale` se publica desde `layout.scale`; `computeUiLine` es
  lineal y sin dpr. Medición real: cuerpo 13,1452 px a 900×700 y 17,9308 px a
  1280×720, relación cuerpo/altura 0,026923; línea 1,1737 y 1,6010 px, sin
  cuantización al pasar de 900 a 901.
- Paleta: ocho tokens exactos; bisel claro `#6eb8a8` al noroeste y oscuro
  `#2f142f` al sureste; auditoría de estilos sin radios, sombras, degradados,
  blur ni fondos translúcidos. El círculo de visión de F1 conserva geometría
  circular y F1 sigue fuera de alcance.
- Marco/canvas: `frame-qa` y `ui-foundations` confirman 16:9, canvas interno
  2218×1248 y mapa 13×13 sin cambios de render.
- Capturas revisadas: HUD, panel, hechizos, banner, victoria y cursor a
  1280×720 y 900×700; los biseles y la paleta se leen sin artefactos modernos.
- Desviación aceptada: el suelo puede desplazarse a 1280×720 con la escala
  nueva; REQ-033 R-013 lo permite y TASK-0107 recompondrá el panel. Se mantiene
  la cobertura de que panel, cuerpo y columnas no desbordan.
- Sin procesos huérfanos; sin tests borrados, saltados o debilitados en su
  objeto de verificación.
