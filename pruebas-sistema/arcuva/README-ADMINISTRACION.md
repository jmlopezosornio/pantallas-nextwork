# Arcuva — Administración de Campañas y Clientes (portal de pruebas)

Fecha: 2026-11-04

Ruta: `https://pantallas.nextwork.com.ar/pruebas-sistema/arcuva/`

## Alcance implementado

- Conserva los logos y el diseño de ingreso acordados.
- Clientes: listado completo autorizado por RLS, alta y edición de nombre, CUIT, condición de facturación, teléfono, correo y dirección.
- Campañas: edición de nombre, cliente, fechas, porcentaje (25/50/75/100), contenido, duración y pausa/reactivación.
- Altas de campañas: selección directa de pantallas de Arcuva, sin exponer grupos en el formulario.
- Contenidos: URL web con duración 5/10/15/20 s; imagen JPG/PNG/WebP con duración 5/10/15/20 s; video MP4 cuya duración se obtiene de metadatos del navegador. El archivo se almacena bajo `publicidades/campanias/<cliente_id>/` según las políticas actuales.
- **Las campañas nuevas se guardan pausadas**. No se ejecuta sincronización VNNOX/Taurus automáticamente.
- Las asignaciones de pantalla de las campañas existentes se **conservan** durante la edición para evitar borrados accidentales de vínculos.
- No se agregaron operaciones de eliminación de campañas ni clientes.
- Se revalida sesión, rol y pertenencia al grupo de Arcuva antes de guardar; Supabase RLS determina el permiso efectivo.

## Autorización y limitaciones

El superadmin tiene acceso de edición. Otros usuarios requieren rol de grupo `operador` o `administrador` en el grupo técnico Arcuva (o rol administrador autorizado por políticas actuales). El usuario `administracion@nextwork.com.ar` conserva por ahora el rol `administrativo` de consulta; **no se le elevó el permiso**.

La base de pruebas sigue siendo la misma de producción: cualquier alta/edición guardada es real y puede modificar los datos utilizados por SMA 01. El formulario pide confirmación antes de guardar una campaña o cambiar su estado. Los videos deben estar preparados con codificación y resolución compatibles con el dispositivo Taurus; la lectura de duración no valida códec ni resolución.

La sincronización/publicación en Taurus es **una etapa separada**. Este portal no modifica reproductores, API, VNNOX ni datos de Recursos Hídricos.

## Comprobaciones

- Sintaxis JavaScript de `portal.js` y `portal-admin.js` validada.
- Elementos requeridos del HTML comprobados; hojas de estilos referenciadas.
- Baseline Supabase verificado: SMA 01 pertenece a Arcuva (1 reproductor y 10 campañas); Recursos Hídricos permanece en NextWork (1 reproductor y 12 campañas).
- Pendiente: prueba completa en navegador con sesión real y prueba de alta/edición autorizada, evitando contenido que pueda afectar la pantalla física.
