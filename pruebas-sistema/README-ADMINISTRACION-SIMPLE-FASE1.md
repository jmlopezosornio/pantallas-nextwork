# Administración simplificada — Fase 1 (solo pruebas)

Ruta: **/pruebas-sistema/** → **Administración nueva**. Acceso: únicamente superadministrador.

## Qué se implementó
- Panel que muestra empresas, pantallas y usuarios reales, agrupables por empresa.
- Vista de accesos actuales y simulación de selección directa de pantallas por usuario, sin pasar por el selector de grupos.
- Formularios de **alta simulada** para nueva pantalla (empresa + datos de pantalla) y nuevo usuario (empresa + rol + pantallas).
- La cuenta superadministradora se muestra con acceso global sin checkboxes editables.
- Si una empresa aún no posee pantallas reales en Supabase, no permite simular un acceso cruzado a pantallas de NextWork.

## Qué NO se modifica
- La base de datos ni las políticas RLS.
- La pertenencia real de pantallas, sus grupos heredados, campañas o clientes.
- Las claves/tokens de reproductores, VNNOX ni la configuración del reproductor PC.
- Los permisos efectivos de ninguna cuenta.
- El frontend de producción.

**Importante:** el botón **Previsualizar** de los nuevos formularios no guarda ningún dato ni habilita la reproducción. Los módulos legacy de producción/pruebas continúan funcionando con las asociaciones actuales. Para completar el modelo nuevo hace falta una segunda etapa de seguridad, asignación directa y migración controlada de clientes/campañas, probada de extremo a extremo.

## Resguardo de Recursos Hídricos
Al iniciar esta etapa, `Recursos Hídricos` figuraba con **1 reproductor, 12 campañas y 1 grupo**; permanece vinculado a NextWork. La fase 1 no incluye operaciones de escritura sobre esas entidades ni sobre su API de reproducción. No se promete una prueba física de la reproducción, ya que requiere observar el equipo operativo.

## Próxima etapa (aun no ejecutada)
1. Definir persistencia de permisos directos por empresa y pantalla, con políticas RLS que impidan accesos cruzados.
2. Probar usuarios de Arcuva y Recursos Hídricos con pantallas de prueba, sin trasladar inicialmente la pantalla de Hídricos.
3. Migrar asociaciones históricas sin borrar campañas, reproducciones ni configuración de reproductores.
4. Ocultar y luego retirar dependencia de grupos, una vez validado el funcionamiento con cuentas reales.
