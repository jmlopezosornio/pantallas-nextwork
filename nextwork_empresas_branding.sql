-- NextWork - Empresas / branding corporativo
-- Ejecutar una sola vez en Supabase SQL Editor.

create table if not exists public.empresas (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  nombre_fantasia text,
  logo_url text,
  color_primario text,
  color_secundario text,
  activo boolean not null default true,
  creado_en timestamptz not null default now(),
  actualizado_en timestamptz not null default now()
);

alter table public.usuarios
  add column if not exists empresa_id uuid references public.empresas(id) on delete set null;

create index if not exists idx_usuarios_empresa_id on public.usuarios(empresa_id);

-- La interfaz consulta empresas únicamente para obtener identidad visual.
-- El aislamiento real de datos entre empresas debe implementarse como segunda etapa
-- agregando empresa_id a pantallas, clientes, campañas, grupos y políticas RLS.

alter table public.empresas enable row level security;

drop policy if exists "usuarios leen su empresa" on public.empresas;
create policy "usuarios leen su empresa"
on public.empresas
for select
to authenticated
using (
  id in (
    select u.empresa_id
    from public.usuarios u
    where u.id = auth.uid()
  )
  or exists (
    select 1 from public.usuarios u
    where u.id = auth.uid()
      and coalesce(u.es_superadmin,false) = true
  )
);

-- Ejemplo de alta de empresa:
-- insert into public.empresas(nombre,nombre_fantasia,logo_url,color_primario,color_secundario)
-- values ('Empresa Demo S.A.','Empresa Demo','https://.../logo.png','#0b477f','#1769d2');
--
-- Luego asignar al usuario:
-- update public.usuarios set empresa_id = '<UUID_EMPRESA>' where id = '<UUID_USUARIO>';
