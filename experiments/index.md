# Experimentos

Páginas interactivas para tomar decisiones. Cada experimento responde una sola
pregunta y deja una decisión registrada.

* [EXP-000: shell de experimentos](EXP-000-shell-demo/experiment.md) - Prueba de humo del shell validada; no es una decisión de juego.
* [EXP-001: comparador de generadores de mazmorra](EXP-001-generador-mazmorra/experiment.md) - Decidido: A (BSP) con semilla 279837264 y parámetros 9/4/11/20 para `REQ-003`.
* [EXP-002: ritmo del movimiento animado](EXP-002-ritmo-movimiento/experiment.md) - Decidido: personalizado, 125 ms por paso y 70 ms de pausa, diagonal a duración constante, para `REQ-006`.
* [EXP-003: mesa de combate](EXP-003-mesa-combate/experiment.md) - v1 decidió la tabla A; la v2.0 mide 12 emparejamientos 1v1 con acciones, magia y réplica (semilla 1017, 1.000 duelos) y deja el balance pendiente: los 12 quedan fuera de la banda 40-60 % por arriba.
* [EXP-004: comparador de generadores de salas irregulares](EXP-004-salas-irregulares/experiment.md) - Construido en TASK-0040; TASK-0041 aplica la v2. La v3 añade mínimo de 3 salas, spawn que evita la mayor, adyacencia en parejas, enemigos interiores con emboscadas y salida como puerta o escalera. Compara A · crecimiento sobre roca, B · BSP con máscaras y C · plantillas empaquetadas para `REQ-011`, `REQ-012` y `REQ-013`.

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
