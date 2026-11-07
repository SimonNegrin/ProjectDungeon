---
type: ADR
title: "ADR-003: servidor autoritativo en la fase remota"
description: La fase remota usará un servidor Node que emitirá la sala y validará las acciones.
status: stable
decision_status: accepted
decided_by: [human:simon, deepseek/v4.1-flash]
decided_at: 2026-11-07T14:33:11Z
generated: { by: deepseek/v4.1-flash, at: 2026-11-07T14:33:11Z }
---

# Contexto

En la fase remota, varios móviles se conectarán a una partida mostrada en un
host. Una pestaña de navegador no puede aceptar conexiones entrantes de otros
dispositivos, y el host no debe validar acciones.

# Decisión

- Servidor Node a medida.
- WebSocket para el transporte.
- Estado de partida en memoria.
- El servidor emite el identificador de sala.
- El host solicita la sala y muestra el QR.
- El servidor valida acciones y emite eventos.
- El host y los móviles son clientes.
- Sin base de datos ni persistencia en la primera versión remota.

# Consecuencias

- El motor debe poder ejecutarse en Node y en el cliente de tests.
- El protocolo debe ser explícito y versionado.
- Habrá que probar reconexión, salas y múltiples clientes.
- El host no necesita lógica de autoridad.
- El QR será una URL de la sala, no un identificador generado por el host.

# Alternativas descartadas

- **Host autoritativo**: no puede aceptar conexiones y mezcla render con reglas.
- **Servicio gestionado**: posible, pero el usuario prefiere control y servidor
  propio.
- **Persistencia desde el inicio**: innecesaria para partidas en memoria.
