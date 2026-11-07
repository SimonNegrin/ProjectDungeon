---
type: Experiment
title: "EXP-000: shell de experimentos"
description: Prueba de humo del shell interactivo; validada, sin decisión de juego.
status: stable
experiment_status: decided
id: EXP-000
question: ¿El shell permite ajustar parámetros, comparar variantes y exportar una decisión?
related_requirements: []
seed: 509514579
parameters:
  gridSize: 12
  density: 30
  palette: moss
  showGrid: true
decision: random
decided_by: human:simon
decided_at: 2026-11-07T14:47:43.062Z
created_at: 2026-11-07T14:33:11Z
updated_at: 2026-11-07T14:47:43.062Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:47:43.062Z }
verified: { by: human:simon, at: 2026-11-07T14:47:43.062Z }
---

# Propósito

Validar el shell de experimentos antes de usarlo para decisiones reales. No es
un experimento de diseño de ProyectDungeon y no debe interpretarse como una
decisión sobre generación de mazmorras.

# Hipótesis

El shell debe permitir:

- ajustar parámetros y ver el resultado en vivo;
- comparar dos variantes con la misma semilla;
- generar métricas por variante;
- registrar una decisión y exportarla;
- ejecutarse en modo test determinista.

# Cómo usarlo

1. Abrir `/experiments/EXP-000-shell-demo/`.
2. Probar los controles de rejilla, densidad y paleta.
3. Comparar “Aleatorio” y “Espejo” con la misma semilla.
4. Elegir una opción en el panel de decisión y añadir una nota.
5. Copiar o descargar el JSON.

# Métricas

- Celdas totales.
- Celdas llenas.
- Checksum determinista.

# Observaciones

El shell arranca, renderiza las dos variantes, responde a los controles y genera
una decisión exportable. La prueba E2E comprueba el estado y la captura visual.

La opción `random` es una selección de prueba del panel de decisión. No implica
una preferencia por el algoritmo “Aleatorio” ni una decisión de diseño.

# Decisión

- Opción: `random` (selección de prueba).
- Motivo: validar el flujo de decisión y exportación del shell.
- Fecha: 2026-11-07T14:47:43.062Z.
- Decidido por: `human:simon`.
- Semilla: `509514579`.
- Parámetros: rejilla 12, densidad 30 %, paleta musgo, rejilla visible.

# Evidencia

- [Captura del shell](../../artifacts/EXP-000-shell-demo/shell-smoke.png)
- [JSON de la decisión](results/decision-2026-11-07T14-47-43Z.json)
- `npm run test:e2e` pasa.

# Siguientes pasos

- El shell queda validado para el primer experimento real.
- No se deriva ninguna tarea de producción de esta decisión.
