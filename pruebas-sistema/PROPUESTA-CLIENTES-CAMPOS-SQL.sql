-- PROPUESTA PENDIENTE. NO EJECUTAR EN BASE COMPARTIDA SIN AUTORIZACIÓN.
-- Alta de clientes Arcuva/NextWork: campos faltantes.
-- Los campos existentes 'nombre', 'cuit', 'direccion', 'email' y 'telefono' se reutilizan.
-- Condiciones de venta permite varias opciones simultáneas.
ALTER TABLE public.clientes
  ADD COLUMN IF NOT EXISTS razon_social text,
  ADD COLUMN IF NOT EXISTS condicion_iva text,
  ADD COLUMN IF NOT EXISTS condiciones_venta text[];

-- No se imponen restricciones NOT NULL a clientes históricos.
-- Antes de activar el guardado: revisar políticas RLS existentes y probar inserción,
-- lectura y edición con una cuenta autorizada de pruebas.
