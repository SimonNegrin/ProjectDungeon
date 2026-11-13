---
name: Visual QA
description: Verificar UI y Canvas con Playwright, navegador integrado, capturas y debug hooks.
---

# Cuándo usarla

Cuando una tarea toca UI, Canvas, cámara, HUD, experimentos o cualquier resultado
visual.

# Capas

1. **Playwright + Chromium headless**: tests repetibles, teclado, capturas,
   trazas.
2. **Navegador integrado de OpenCode**: exploración, revisión con el usuario,
   consola y red.
3. **Debug hooks**: estado, modo test, paso manual, overlay.

# Regla

No confíes solo en una captura y no asumas que el modelo “ve” bien. Verifica
estado y DOM; usa la captura para el usuario y para comparar.

# Playwright

- Ejecutar `pnpm run test:e2e` con el parámetro `timeout` de 180 s.
- Abrir la página con `?test=1&seed=123`.
- Esperar a que el juego esté listo.
- Simular teclado.
- Comprobar estado, HUD y Canvas.
- Guardar capturas en `artifacts/`.
- Usar `toHaveScreenshot` solo en estados estables.
- Guardar traza en fallos.
- No dejar servidores en background: Playwright usa su `webServer`.

# Navegador integrado

- Abrir `localhost`.
- Inspeccionar consola y red.
- Hacer snapshot de accesibilidad.
- Capturar y previsualizar.
- Dejar la pestaña al usuario si tiene que probar.

# Canvas

- El árbol de accesibilidad no ve el Canvas.
- Añadir HUD DOM con `data-testid`.
- Exponer `window.__game` o `window.__experiment`.
- Comprobar píxeles solo para invariantes simples.
- No hacer diff de píxeles de escenas animadas.

# Evidencia

```text
artifacts/TASK-XXXX/attempt-N/
  report.md
  test-output.txt
  screenshots/
```

# Checklist

- [ ] Sin errores de consola.
- [ ] Canvas visible y no vacío.
- [ ] HUD correcto.
- [ ] Comportamiento verificado por estado.
- [ ] Capturas de estados clave.
- [ ] Captura revisada por el usuario si es creativa.
- [ ] No se ha dependido solo de una imagen.
