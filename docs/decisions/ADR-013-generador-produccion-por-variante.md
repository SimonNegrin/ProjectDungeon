---
type: ADR
title: "ADR-013: generador de producción por variante, growth por defecto"
description: El generador denso se divide en core compartido y variantes; producción importa solo growth de forma estática, BSP queda como alternativa y el build no incluye experimentos ni variantes descartadas.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-09T15:30:00Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-09T15:30:00Z }
---

# Contexto

`EXP-004` comparó tres métodos de mazmorra densa: crecimiento sobre roca
(`growth`), BSP con máscaras y plantillas empaquetadas. El playtest eligió
`growth` y pidió convertirlo en el generador por defecto de producción.

El coste real no son las tres variantes, sino el modelo compartido: máscaras de
sala, puertas entre dos salas, pasillos con `roomA`/`roomB`, spawn con `party`,
entrada/salida y enemigos generados por el mapa. Ese modelo lo usan todas las
variantes y debe existir aunque solo se envíe una.

Hay una restricción explícita de bundle: no queremos un `switch (variant)` en
runtime que arrastre `growth`, BSP con máscaras y plantillas al bundle de
producción y deje código muerto que el tree-shaking no pueda eliminar.

# Decisión

- El generador se organiza en módulos:
  - `src/game/chambers/core/` para lo compartido: opciones, formas, puertas,
    pasillos, spawn, enemigos, salida y validadores.
  - `src/game/chambers/variants/growth.ts` para la variante elegida.
  - `src/game/chambers/variants/bsp.ts` y `templates.ts` quedan como huecos
    futuros; no se crean hasta que se pidan y se promocionen.
- `growth` es el generador por defecto: `createInitialState` lo importa de forma
  estática si no se inyecta otro `MapGenerator`.
- BSP sigue disponible como implementación inyectable y conserva sus tests. No
  se borra ni se reescribe como variante de `chambers` en este corte.
- Producción no tiene selector de variante en runtime ni registro de plugins.
  Añadir una variante exige un módulo nuevo y un import estático nuevo.
- La comparación A/B/C vive en `EXP-004` y en el servidor de desarrollo. El build
  de producción no incluye los entry points de `experiments/`; se construyen con
  un comando separado si hacen falta.
- Una comprobación de CI o script de build verifica que el bundle de producción
  no contiene marcadores de variantes no elegidas (`buildBsp`, `pickTemplate` u
  otros) ni chunks de `bsp`/`templates`.

# Consecuencias

- El bundle de producción solo incluye `growth` y el core compartido.
- El modelo compartido se paga una vez y sirve para futuras variantes.
- Cambiar el ganador del playtest implica cambiar el módulo de variante y su
  import estático, no el modelo, los validadores ni la suite de conformidad.
- Los tests pueden inyectar BSP sin que eso lo devuelva al bundle.
- La guarda de bundle puede fallar si alguien vuelve a añadir un import dinámico
  o mete los experimentos en el build de producción; es una señal deliberada.
- `ADR-007` sigue vigente en la interfaz `MapGenerator`; su parte de “BSP por
  defecto” queda sustituida por esta decisión.

# Alternativas descartadas

- **Un generador con `switch (variant)` runtime:** simple de escribir, pero
  arrastra las tres variantes y hace que el tree-shaking no pueda garantizar el
  bundle mínimo.
- **Tres entradas de producción:** mantiene A/B/C comparables en producción,
  pero conserva dos variantes no elegidas y su mantenimiento sin decidir aún su
  futuro.
- **Promocionar el `generate.ts` monolítico del experimento:** reproduce el
  problema de bundle y mezcla código de comparación con código de juego.
- **Registro de plugins:** innecesario para un juego local con una variante
  activa; añade carga dinámica y configuración.
