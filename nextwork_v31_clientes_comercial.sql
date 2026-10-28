-- NextWork V31 - Datos comerciales opcionales de clientes
-- Ejecutar una sola vez en Supabase SQL Editor.

alter table public.clientes
  add column if not exists cuit text,
  add column if not exists tipo_factura text,
  add column if not exists direccion text,
  add column if not exists telefono text,
  add column if not exists email text;

comment on column public.clientes.cuit is 'CUIT comercial opcional del cliente';
comment on column public.clientes.tipo_factura is 'Tipo de comprobante/factura preferido del cliente';
comment on column public.clientes.direccion is 'Dirección comercial/fiscal opcional';
comment on column public.clientes.telefono is 'Teléfono de contacto opcional';
comment on column public.clientes.email is 'Correo electrónico comercial opcional';
