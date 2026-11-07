---
type: Experiment
title: "EXP-000: shell de experimentos"
description: Prueba de humo del shell interactivo, sin decisión de juego.
status: draft
experiment_status: ready
id: EXP-000
question: ¿El shell permite ajustar parámetros, comparar variantes y exportar una decisión?
related_requirements: []
created_at: 2026-11-07T14:33:11Z
updated_at: 2026-11-07T14:33:11Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
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

Pendiente de la prueba del usuario.

# Decisión

- Opción:
- Motivo:
- Fecha:
- Decidido por:

# Siguientes pasos

- Si el shell funciona, usarlo como plantilla para el primer experimento real.
- Si algo falla, crear una tarea de corrección del arnés.
