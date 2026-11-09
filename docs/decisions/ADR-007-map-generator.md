---
type: ADR
title: "ADR-007: interfaz MapGenerator inyectable"
description: La generación de mapas se encapsula tras una interfaz pura y reemplazable; el generador por defecto cambia a growth en ADR-013 y BSP queda como alternativa inyectable.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-07T22:12:59Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T22:12:59Z }
---

# Contexto

`EXP-001` eligió BSP para el primer mapa generado. El usuario quiere poder
cambiar el algoritmo en el futuro sin reescribir el motor ni el render. También
queremos tests deterministas que puedan sustituir el generador por un stub.

# Decisión

- La generación se define con una interfaz pura:

  ```ts
  interface MapGenerator {
    readonly id: string;
    generate(seed: number, options: MapOptions): GeneratedMap;
  }
  ```

- `GeneratedMap` contiene `seed`, `width`, `height`, `tiles`, `rooms`,
  `corridors`, `doors`, `spawns`, `warnings` y las opciones resueltas.
- `BspMapGenerator` fue la implementación por defecto.
- `createInitialState` recibe un `MapGenerator` y lo usa para construir el mapa;
  si no se pasa, instancia el generador por defecto.
- **Actualización:** [ADR-013](ADR-013-generador-produccion-por-variante.md)
  sustituye la parte de “BSP por defecto”: `growth` es ahora el defecto y BSP
  queda como alternativa inyectable. La interfaz `MapGenerator` no cambia.
- El motor depende de la interfaz, no de BSP. El host decide la semilla y las
  opciones de dificultad.
- No se crea un registro de plugins ni carga dinámica: una implementación nueva
  se conecta explícitamente.

# Consecuencias

- El algoritmo se puede reemplazar sin tocar reglas, cámara, HUD ni render.
- Los tests pueden inyectar un generador mínimo y comprobar el flujo del motor.
- Los mapas siguen siendo datos serializables.
- Hay una abstracción pequeña que mantener; no se generaliza más hasta que haya
  un segundo generador real. Con `growth` ya existe ese segundo generador;
  ADR-013 fija cómo se separa del bundle el que no se elige.
- Los prototipos de `experiments/` no se importan desde producción; el código
  validado se promociona a `src/game/`.

# Alternativas descartadas

- **Funciones sueltas sin interfaz**: más simples al principio, pero obligan a
  tocar el motor para cambiar de algoritmo.
- **Registro de plugins**: innecesario para un juego local con un generador
  activo; añade carga dinámica y configuración.
- **Generador dentro del motor**: mezcla datos, reglas y algoritmos y complica
  los tests.
