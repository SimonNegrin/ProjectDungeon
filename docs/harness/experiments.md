---
type: Harness
title: Experimentos
description: Convertir una incertidumbre en una página interactiva y una decisión registrada.
status: stable
generated: { by: deepseek/v4.1-flash, at: 2026-11-08T11:46:23Z }
---

# Para qué

Un experimento sirve para tomar una decisión que no se puede resolver bien en
abstracto. No es una feature ni una demo pulida: es una pregunta con controles.

# Reglas

1. **Una pregunta por experimento.** Si hay dos, son dos experimentos.
2. **Shell compartido.** No se reimplementan controles, semilla, métricas ni
   exportación en cada experimento.
3. **Interactivo.** El usuario ajusta parámetros y ve el resultado en vivo.
4. **Con decisión.** El objetivo es elegir y registrar por qué.
5. **Desechable.** Producción no importa desde `experiments/`. Solo el código
   validado se promociona a `src/`.
6. **Timeboxed.** Si no ayuda a decidir, se recorta o se archiva.

# Brief previo

Antes de construir, define: pregunta, hipótesis, opciones o variantes,
parámetros ajustables, métricas, qué decisión permite tomar y criterio de parada.
No se hace un experimento para una decisión que el usuario ya tomó.

# Estructura

```text
experiments/
  index.md                 # Índice OKF
  index.html               # Índice navegable
  manifest.ts              # Lista de experimentos
  _shell/                  # Shell reutilizable
  EXP-000-shell-demo/
    experiment.md          # Documento OKF del experimento
    index.html
    src/main.ts
    results/               # Capturas, JSON de decisiones, notas
```

Cada experimento se sirve en `http://127.0.0.1:5173/experiments/EXP-NNN-slug/`.

# Shell

Aporta cabecera con pregunta, controles generados desde un esquema de parámetros,
semilla editable, variantes A/B con su canvas, métricas por variante, panel de
decisión con notas, exportación JSON, modo determinista (`?test=1&seed=123`) y
API `window.__experiment` para Playwright.

Tipos de parámetro: `range` (mínimo, máximo, paso y unidad), `select` (opciones
discretas) y `toggle` (booleano). El shell normaliza los valores y los incluye en
el JSON exportado.

# Variantes y métricas

Cada variante recibe los mismos parámetros, la misma semilla y un generador
pseudoaleatorio derivado de semilla + variante. Así se comparan algoritmos o
reglas sin cambiar de página.

Las métricas deben ayudar a decidir, no decorar: conectividad, salas, callejones,
tiempo de generación, daño por turno, turnos hasta eliminar al enemigo o
legibilidad. Si una métrica no cambia la decisión, sobra.

# Decisión

El usuario elige una opción y añade notas. El shell exporta:

```json
{
  "experiment": "EXP-001",
  "question": "...",
  "seed": 123,
  "parameters": {},
  "decision": "variant-a",
  "notes": "...",
  "decidedAt": "..."
}
```

`requirements-writer` registra `decision`, `decided_by` y `decided_at` en
`experiment.md`, y actualiza el requisito o ADR.

# Flujo y promoción

```text
Incertidumbre
  -> requirements-writer crea el brief
  -> task-runner construye el experimento
  -> task-lead verifica que arranca y que los controles funcionan
  -> el usuario prueba y decide
  -> requirements-writer registra la decisión
  -> se actualiza el requisito
  -> se generan tareas de producción
```

El código reutilizable se extrae a `src/`, se testea en producción, se elimina la
dependencia desde producción y el experimento queda como referencia o se archiva.

# Checklist

- [ ] Una sola pregunta.
- [ ] Controles claros y semilla reproducible.
- [ ] Variantes comparables y métricas útiles.
- [ ] Exportación de decisión y `experiment.md` actualizado.
- [ ] El usuario ha decidido.
