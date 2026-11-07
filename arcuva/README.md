# Portal Arcuva — estable

URL: https://pantallas.nextwork.com.ar/arcuva/

Consolidación del portal probado en `/pruebas-sistema/arcuva/`, al 7 de noviembre de 2026.

Incluye dashboard, pantallas y conectividad, campañas y subida de medios, clientes, reportes, permisos y superadministración. Conserva conexión a la misma base de Supabase y políticas de acceso: esta no es una base de ensayo.

La carga de videos acepta dimensiones distintas a las pantallas; la conversión ocurre en el servidor Taurus Windows cuando está instalado y funcionando.

Las salidas reportadas entre fechas requieren eventos reales en la tabla `reproducciones`; **no se estiman** desde porcentajes. El estado en línea depende de que el reproductor actualice periódicamente su última comunicación.

La ruta de pruebas permanece intacta. No se modifican campañas, usuarios, reproductores, políticas de Supabase, edge functions o publicaciones VNNOX mediante esta consolidación.
