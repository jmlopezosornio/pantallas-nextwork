# Transición multiempresa — NextWork (entorno de pruebas)

**Principio:** NextWork administra la plataforma. Arcuva y Recursos Hídricos son operadores/clientes de servicio, con pantallas y campañas segregadas. NextWork conserva los equipos Ñireco y Prueba PC como **pruebas internas**. El superadmin consulta todas las empresas.

## Vista preliminar implementada (sin mutar datos)

Ruta: `/pruebas-sistema/`. Selector superadmin en la cabecera:

| Vista | Pantallas proyectadas |
|---|---|
| Todas las empresas | Vista operativa global actual |
| Arcuva | Grupo Arcuva SMA Pant 01 |
| Recursos Hídricos | Recursos Hídricos |
| NextWork · Pruebas internas | Ñireco; Prueba PC |

Las vistas de empresa son **solo lectura**: muestran pantallas, campañas asociadas a esas pantallas, clientes que aparecen en esas campañas y reproducciones de hoy. También permiten imprimir un reporte **preliminar**, identificado como tal. No es un control de acceso RLS ni significa que ya se hayan migrado los propietarios. La vista real completa sigue disponible para el superadmin cuando selecciona «Todas las empresas».

## Estado real de Supabase verificado el 4 de noviembre de 2026

- Las cuatro pantallas siguen asociadas a NextWork en `pantallas.empresa_id`.
- La ficha de empresa Arcuva existe; Recursos Hídricos todavía no tiene ficha de empresa.
- La pantalla Grupo Arcuva SMA Pant 01 posee 10 campañas vinculadas y un reproductor.
- La pantalla Recursos Hídricos posee 12 campañas vinculadas y un reproductor.
- Ñireco y Prueba PC están reservadas para pruebas internas. Algunas campañas del cliente Arcuva están vinculadas a estas pantallas de prueba y **no deben mostrarse como campañas operativas de Arcuva**.
- Las asociaciones actuales de `grupos`, `clientes` y `campanias` incluyen referencias a NextWork; no moverlas indiscriminadamente.

## Reglas definitivas a implementar tras la aprobación

1. La pantalla tiene una sola empresa titular (o el ámbito de pruebas internas NextWork).
2. Los grupos solo contienen pantallas de la misma empresa. No se comparten grupos entre empresas.
3. Los clientes y campañas son privados de la empresa. Pueden repetirse nombres comerciales entre empresas.
4. Una campaña puede vincularse a varias pantallas **de su misma empresa** y se respetan sus porcentajes de 25/50/75/100.
5. El superadmin obtiene acceso global y selector de empresa; un usuario normal ve solo su empresa y sus permisos. Esto se aplica **en políticas RLS**, además de la interfaz.
6. La publicación/servicio de reproductores permanece intacta durante la transición.
7. Las campañas publicadas en Ñireco y Prueba PC permanecen en NextWork Pruebas, aunque tengan un nombre de cliente como «Arcuva».
8. NextWork no figura como grupo comercial de las empresas cliente; sus pantallas internas conservan un ámbito técnico propio.

## Migración futura: controles previos obligatorios

- Crear y verificar la ficha corporativa de Recursos Hídricos, y validar el logo/identidad.
- Respaldar `empresas`, `pantallas`, `grupos`, `grupos_pantallas`, `clientes`, `campanias`, `campanias_pantallas`, `usuarios`, `usuarios_grupos`, `usuarios_pantallas`, `players` y `reproducciones` antes de alterar asociaciones.
- Verificar campañas compartidas entre pantallas, clientes con campañas repartidas en empresas distintas y reproducciones históricas.
- Preparar transacciones atómicas y ensayarlas con consultas de validación. No borrar ni recrear reproductores.
- Verificar el funcionamiento de Hídricos PC y Taurus Arcuva, publicación, histórico y reportes por empresa antes de habilitar usuarios clientes.
- No cambiar asignaciones reales hasta la validación de la transición. Una prueba del frontend **comparte la base productiva**, de modo que los botones existentes para alta/traslado siguen afectando datos reales.

## Pendiente

- Revisar la pantalla de previsualización con el superadmin.
- Definir identidad de Recursos Hídricos y si existen pantallas adicionales.
- Preparar migración efectiva y test de permisos RLS con usuarios reales de ambas empresas.
