# Registro de traslado de pantalla SMA 01 a Arcuva

Fecha: 2026-11-04 (Argentina).

Esta operación **modificó datos reales de Supabase**, porque el entorno de pruebas y producción comparten proyecto. La interfaz de producción y el reproductor de Recursos Hídricos **no se modificaron**.

## Estado verificado al terminar

- Pantalla `Grupo Arcuva SMA Pant 01` (`e0a1ab21-ef95-4444-9a9c-a6bb39e130ca`): ahora pertenece a Arcuva (`b59ddc55-40f0-48d0-842a-2bee9ea26a41`), activa.
- Reproductor NovaStar Taurus (`576054bd-c1aa-456a-a2db-95b61e274d5e`): vinculación conservada, sin cambios de claves ni configuración.
- Campañas: 10 campañas exclusivas de SMA trasladadas a un grupo técnico de compatibilidad propio de Arcuva. IDs y relaciones pantalla-campaña conservados.
- Cliente `Arcuva`: se creó una ficha nueva en el grupo de Arcuva, copiando los datos de la existente. Solo esas 10 campañas se asociaron a la nueva ficha; 3 campañas de pruebas quedaron con la ficha de NextWork.
- Usuario `administracion@nextwork.com.ar`: grupo de Arcuva compatible con la nueva pertenencia y permiso específico a SMA 01. Se retiraron su grupo incompatible de NextWork y el vínculo directo a Ñireco.
- Pantalla `Recursos Hídricos` (`e85aa802-60d1-4791-b2ad-d09a8a331be8`): permaneció en NextWork, activa, con 1 reproductor Windows y 12 campañas. No se tocó su reproducción ni configuración.
- Pantallas `Ñireco` y `Prueba PC`: permanecen inactivas en NextWork con historial intacto.

## Alcance y límites

La migración fue una única operación transaccional de Supabase, con condiciones previas y posteriores. No se cambiaron scripts de player API, VNNox, políticas RLS ni código del portal. El portal de pruebas de Arcuva utiliza los grupos solo como compatibilidad interna de las políticas actuales.

La verificación realizada fue de estructura y datos en Supabase. Queda pendiente una prueba interactiva de ingreso con el usuario de Arcuva, visualización de pantalla y campañas, y comprobación física del NovaStar si se desea confirmar reproducción visible.

## Precaución

No volver a mover SMA 01 desde la tabla `pantallas` sin trasladar al mismo tiempo campaña, cliente, grupo y permisos: la política RLS exige coincidencia de empresa.
