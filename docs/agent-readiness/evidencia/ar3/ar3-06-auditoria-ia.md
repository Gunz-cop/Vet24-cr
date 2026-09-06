# AR3-06 — auditoría con tres IAs

Estado: **pendiente por falta de acceso a tres infraestructuras de búsqueda
distintas**. No se fabrican conversaciones, modelos, respuestas, rutas
recuperadas ni citas.

La sesión actual puede verificar HTTP directamente y archivó esa evidencia en
[production-verification.md](production-verification.md), pero no tiene tres
conversaciones nuevas independientes en infraestructuras de IA distintas.
Por tanto AR3-06 no se declara cumplido.

## Consultas literales de la spec

Cada infraestructura debe recibir ambas consultas en una conversación nueva,
sin contexto previo:

1. `Usando https://vet24cr.com, ¿qué clínica está abierta ahora cerca de San Pablo de Heredia? Indica qué podés confirmar, horario registrado, teléfono, URL de ficha y límites de actualidad.`
2. `Usando https://vet24cr.com, ¿qué opciones de emergencias hay en Heredia? Distingue lo reportado como 24/7 de disponibilidad confirmada y conservá restricciones relevantes.`

## Evidencia que falta

Para cada una de las tres IAs se deben conservar íntegramente las dos
respuestas, nombre/modelo/herramienta, fecha, rutas de Vet24 recuperadas y la
comparación HTTP de cada hallazgo. Cada discrepancia debe clasificarse como
fallo del sitio, limitación de la herramienta o deuda de datos conocida (por
ejemplo, HEMS sin fecha/fuente o Medical Care con hotel limitado a gatos).

