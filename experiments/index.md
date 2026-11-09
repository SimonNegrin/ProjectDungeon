# Experimentos

Páginas interactivas para tomar decisiones. Cada experimento responde una sola
pregunta y deja una decisión registrada.

* [EXP-000: shell de experimentos](EXP-000-shell-demo/experiment.md) - Prueba de humo del shell validada; no es una decisión de juego.
* [EXP-001: comparador de generadores de mazmorra](EXP-001-generador-mazmorra/experiment.md) - Decidido: A (BSP) con semilla 279837264 y parámetros 9/4/11/20 para `REQ-003`.
* [EXP-002: ritmo del movimiento animado](EXP-002-ritmo-movimiento/experiment.md) - Decidido: personalizado, 125 ms por paso y 70 ms de pausa, diagonal a duración constante, para `REQ-006`.
* [EXP-003: mesa de combate](EXP-003-mesa-combate/experiment.md) - Decidido: A (tabla de `REQ-010`) con semilla 1017 y 1.000 duelos; la facilidad en duelos 1 contra 1 es esperada y el escalado cooperativo queda fuera de este corte.
* [EXP-004: comparador de generadores de salas irregulares](EXP-004-salas-irregulares/experiment.md) - Construido en TASK-0040; TASK-0041 aplica la v2 de puertas validadas, spawn alrededor del acceso y presupuesto de enemigos por superficie y jugadores. Compara A · crecimiento sobre roca, B · BSP con máscaras y C · plantillas empaquetadas para `REQ-011` y `REQ-012`.

## Arranque

```bash
pnpm run dev
```

Abre <http://127.0.0.1:5173/experiments/>.

## Añadir un experimento

1. Copia `EXP-000-shell-demo` a `EXP-NNN-slug`.
2. Cambia el id y la definición en `src/main.ts`.
3. Crea `experiment.md` con la plantilla.
4. Añade la entrada a `manifest.ts`.
5. Ejecuta `pnpm run docs:check` y `pnpm test`.

La guía completa está en [docs/harness/experiments.md](../docs/harness/experiments.md).
