# Historial de versiones — Arcuva

## v1.0.0 — 18/11/2026
Primera versión numerada de producción. Integra las modificaciones aprobadas en el portal de pruebas:
- Vista móvil de campañas y formularios.
- Gestión de órdenes de trabajo, con estado "Generado" y notificación por WhatsApp.
- Gestión de teléfonos de contacto desde Usuarios para perfiles autorizados.
- Ajustes de presentación, reportes y estilos del portal.
- Se conservan la administración de pantallas y el diagnóstico Taurus existentes en producción.

## Política de versiones
- Los cambios en `pruebas-sistema/arcuva/` no incrementan la versión.
- La versión cambia únicamente al aprobar y publicar una nueva entrega en `arcuva/`.
- Se utiliza numeración semántica `MAJOR.MINOR.PATCH`: cambios incompatibles, nuevas funcionalidades y correcciones, respectivamente.
- Cada entrega tiene un registro de novedades y una referencia al commit publicado.
