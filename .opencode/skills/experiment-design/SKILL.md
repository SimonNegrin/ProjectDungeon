---
name: Experiment Design
description: Diseñar un experimento interactivo de una sola pregunta, con parámetros, variantes, métricas y decisión registrada.
---

# Cuándo usarla

Cuando una decisión de diseño o técnica no se puede tomar bien en abstracto, o
cuando el usuario necesita ver y tocar opciones.

# Regla principal

Un experimento = una pregunta. Si hay dos, son dos experimentos.

# Brief

Antes de construir, define:

- pregunta;
- hipótesis;
- opciones o variantes;
- parámetros ajustables;
- métricas;
- qué decisión permite tomar;
- criterio de parada/timebox.

# Construcción

- Usa `experiments/_shell/`.
- Cada experimento vive en `experiments/EXP-NNN-slug/`.
- `experiment.md` lleva frontmatter OKF.
- La página se sirve en `/experiments/EXP-NNN-slug/`.
- Incluye controles, semilla, reset, variantes A/B, métricas y exportación.
- Añade `?test=1&seed=123` y `window.__experiment`.
- No pulas arte ni sonido; aísla la variable.

# Datos y métricas

Las métricas deben ayudar a decidir. Si una métrica no cambia la decisión, sobra.

# Cierre

1. El usuario prueba.
2. Elige una opción y escribe notas.
3. Exporta el JSON.
4. `requirements-writer` registra `decision`, `decided_by`, `decided_at` en
   `experiment.md`.
5. Se actualiza el requisito o ADR.
6. El código validado se promociona a `src/`; el resto se archiva.

# Límites

- No importar experimentos desde producción.
- No convertir un experimento en una feature sin promocionar y testear.
- No usar datos aleatorios no reproducibles.
- No hacer un experimento para una decisión que el usuario ya tomó.

# Checklist

- [ ] Una sola pregunta.
- [ ] Controles claros.
- [ ] Semilla reproducible.
- [ ] Variantes comparables.
- [ ] Métricas útiles.
- [ ] Exportación de decisión.
- [ ] `experiment.md` actualizado.
- [ ] El usuario ha decidido.
