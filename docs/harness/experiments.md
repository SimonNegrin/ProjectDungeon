---
type: Harness
title: Experimentos
description: Cómo convertir una incertidumbre en una página interactiva y una decisión registrada.
status: draft
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Para qué

Un experimento sirve para tomar una decisión que no se puede resolver bien en
abstracto. No es una feature de producción ni una demo pulida. Es una pregunta
con controles.

Ejemplos:

- comparar tres generadores de mazmorra con la misma semilla;
- probar velocidad de cámara y legibilidad de una sala;
- comparar coste diagonal 1 frente a 1,5;
- ver cómo se siente una IA enemiga simple;
- probar una pantalla de selección de personaje.

# Reglas

1. **Una pregunta por experimento.** Si hay dos preguntas, son dos experimentos.
2. **Shell compartido.** No se reimplementan controles, semilla, métricas y
   exportación en cada experimento.
3. **Interactivo.** El usuario ajusta parámetros y ve el resultado en vivo.
4. **Con decisión.** El objetivo no es “probar”, es elegir y registrar por qué.
5. **Desechable.** El experimento no se importa desde producción. Solo el código
   validado se promociona a `src/`.
6. **Timeboxed.** Si no ayuda a decidir, se recorta o se archiva.

# Estructura

```text
experiments/
  index.md                 # Índice OKF
  index.html               # Índice navegable
  manifest.ts              # Lista de experimentos para el índice
  _shell/                  # Shell reutilizable
  EXP-000-shell-demo/
    experiment.md          # Documento OKF del experimento
    index.html
    src/main.ts
    results/               # Capturas, JSON de decisiones, notas
  EXP-001-.../
```

Cada experimento se sirve en
`http://127.0.0.1:5173/experiments/EXP-001-.../`.

# Shell

El shell aporta:

- cabecera con pregunta y descripción;
- controles generados desde un esquema de parámetros;
- semilla editable y botón de regenerar;
- una o varias variantes A/B;
- canvas por variante;
- métricas por variante;
- panel de decisión con notas;
- copia y descarga de la decisión en JSON;
- modo test determinista (`?test=1&seed=123`);
- API `window.__experiment` para Playwright.

# Tipos de parámetro

- `range`: número con mínimo, máximo, paso y unidad.
- `select`: opciones discretas.
- `toggle`: booleano.

El shell normaliza los valores, los muestra en el panel de decisión y los incluye
en el JSON exportado.

# Variantes y A/B

Un experimento puede declarar varias variantes. Cada una recibe:

- los mismos parámetros;
- la misma semilla;
- un generador pseudoaleatorio derivado de semilla + variante;
- su propio canvas.

Así se comparan algoritmos o reglas sin cambiar de página. Si solo hay una
variante, se muestra una sola escena.

# Métricas

Las métricas deben ayudar a decidir, no decorar. Ejemplos:

- conectividad de la mazmorra;
- número de salas y callejones sin salida;
- tiempo de generación;
- daño recibido por turno;
- turnos hasta eliminar al enemigo;
- legibilidad: celdas visibles, contraste, tamaño aparente.

# Decisión

El usuario elige una opción y puede añadir notas. El shell genera un JSON con:

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

Después, `requirements-writer` registra la decisión en `experiment.md` y actualiza
el requisito o ADR correspondiente.

# Flujo

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

# Promoción

Si el experimento produce código reutilizable:

1. Se extrae a `src/` o `src/shared/`.
2. Se añaden tests de producción.
3. Se elimina la dependencia desde producción hacia `experiments/`.
4. El experimento queda como referencia o se archiva.

# Primer experimento

`EXP-000-shell-demo` no decide nada de juego: valida que el shell funciona. Es el
equivalente al “hello world” del arnés. Se puede usar como plantilla para el
primero real.
