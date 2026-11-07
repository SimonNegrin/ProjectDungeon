---
name: Canvas Rendering
description: Implementar el host en Canvas 2D con cámara, rejilla, HUD DOM y modo debug/test.
---

# Cuándo usarla

Al implementar o revisar el render del host, la cámara, el tilemap, los sprites,
el HUD o el overlay de debug.

# Base

- Canvas 2D.
- Resolución lógica fija y escalado por `devicePixelRatio`.
- Cámara que sigue al jugador activo y se limita al mapa.
- HUD en DOM, no dibujado en Canvas.
- Sin animaciones no deterministas en modo test.

# Estructura

```text
Renderer
  -> clear
  -> draw tilemap
  -> draw entities
  -> draw effects
  -> draw debug overlay
```

La cámara transforma coordenadas de mundo a pantalla. El HUD no se transforma.

# Debug y test

- `?debug=1`: rejilla, coordenadas, hitboxes, rango, ruta.
- `?test=1&seed=123`: estado fijo, sin animaciones aleatorias, paso manual.
- `window.__game`: estado, cámara, entidades, turno.
- `window.__game.step()` para avanzar.
- HUD con `data-testid`.

# Rendimiento

- Evitar crear objetos por frame.
- Precargar assets.
- Usar un solo canvas para el tablero.
- No optimizar antes de medir.

# Accesibilidad

- El Canvas no es accesible por sí solo.
- El HUD DOM debe reflejar vida, turno y fase.
- Añadir texto alternativo o `aria-live` para eventos importantes.
- No depender solo del color.

# Checklist

- [ ] Canvas escala bien en pantalla.
- [ ] Cámara estable y limitada.
- [ ] HUD DOM separado.
- [ ] Modo debug.
- [ ] Modo test.
- [ ] Sin errores de consola.
- [ ] Capturas de estados clave.
