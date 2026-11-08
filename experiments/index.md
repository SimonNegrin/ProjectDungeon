# Experimentos

Páginas interactivas para tomar decisiones. Cada experimento responde una sola
pregunta y deja una decisión registrada.

* [EXP-000: shell de experimentos](EXP-000-shell-demo/experiment.md) - Prueba de humo del shell validada; no es una decisión de juego.
* [EXP-001: comparador de generadores de mazmorra](EXP-001-generador-mazmorra/experiment.md) - Decidido: A (BSP) con semilla 279837264 y parámetros 9/4/11/20 para `REQ-003`.
* [EXP-002: ritmo del movimiento animado](EXP-002-ritmo-movimiento/experiment.md) - Decidido: personalizado, 125 ms por paso y 70 ms de pausa, diagonal a duración constante, para `REQ-006`.
* [EXP-003: mesa de combate](EXP-003-mesa-combate/experiment.md) - Listo para playtest: roster editable, presets A/B/C/D, ataque y duelo por semilla para elegir la tabla de `REQ-010`.

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
