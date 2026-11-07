---
type: ADR
title: "ADR-006: 32rogues como arte placeholder"
description: Uso del pack 32rogues en el primer prototipo, con su licencia y crédito.
status: stable
decision_status: accepted
decided_by: human:simon
decided_at: 2026-11-07T15:24:03Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T15:24:03Z }
---

# Contexto

El primer prototipo necesita sprites legibles sin invertir tiempo en arte
original. El usuario ha elegido el pack [32rogues](https://sethbb.itch.io/32rogues)
de Seth Boyles, un tileset y conjunto de sprites de 32×32 pensado para roguelikes.

# Decisión

- Usar los PNG de 32rogues como arte placeholder del primer prototipo.
- Copiar solo los archivos necesarios al repositorio, junto con
  `LICENSE.txt`.
- Incluir el crédito a Seth Boyles en los créditos del proyecto.
- No cargar assets desde itch.io en runtime: el juego funciona sin red.
- No modificar los sprites en este corte salvo recortes o escalado que no alteren
  el original.

# Licencia

La licencia del pack permite el uso en proyectos comerciales y no comerciales,
excepto proyectos relacionados con NFT o blockchain. Prohíbe su uso en proyectos
de inteligencia artificial generativa o machine learning y la redistribución o
venta del pack por separado.

Este proyecto usa los sprites como arte del juego, no para entrenar modelos ni
para generar arte. El pack no se redistribuye como asset independiente.

# Consecuencias

- El repositorio incluye `LICENSE.txt` y un archivo de créditos.
- Los tests no dependen de red.
- Si se sustituye el arte, los nombres de archivo y el punto de carga deben
  quedar aislados en el módulo de assets del host.
- La decisión no fija el arte final: solo el placeholder del primer hito.

# Alternativas descartadas

- **Bloques de color generados por código:** más rápidos, pero el usuario quiere
  evaluar la legibilidad con sprites reales.
- **Assets remotos:** rompen el requisito local-first y añaden dependencia de red.
- **Arte original:** se pospone hasta validar el loop.
