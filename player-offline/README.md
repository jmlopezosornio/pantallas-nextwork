# NextWork Player Offline V2

Player local para pantallas NextWork. Está pensado para Windows y Raspberry Pi y continúa reproduciendo aunque Supabase / `player-api` deje de responder temporalmente.

## Qué resuelve

- Sincroniza la programación al iniciar y cada 5 minutos.
- Guarda la última programación válida en `data/player.json`.
- Descarga videos e imágenes en `data/media/` y reproduce esos archivos locales.
- Si el servidor cae, conserva la programación anterior sin dejar la pantalla en negro.
- Guarda reproducciones pendientes en `data/pending-logs.json`.
- Cuando el servidor vuelve, envía automáticamente los logs acumulados.
- Envía heartbeat cada 60 segundos.
- Respeta localmente `hora_inicio` y `hora_fin` de la pantalla. El horario puede cruzar medianoche, por ejemplo 06:00 → 01:00.
- Mantiene la participación 25/50/75/100 como pesos 1/2/3/4 dentro de la rotación.
- Las campañas web se cargan por URL. Si se cae solamente el servidor NextWork pero Internet continúa disponible, siguen funcionando. Para una caída total de Internet, una web dinámica puede no disponer de datos nuevos.

## Requisitos

- Node.js 18 o superior.
- Chrome o Chromium para modo kiosco.
- Un `playerKey` válido para la pantalla.

## Instalación en Windows

1. Copiar esta carpeta al equipo de la pantalla.
2. Copiar `config.example.json` como `config.json`.
3. Completar el `playerKey` correspondiente.
4. Ejecutar `iniciar-player-windows.bat`.

El player local queda disponible en:

`http://127.0.0.1:8787`

## config.json

```json
{
  "supabaseUrl": "https://qkstdmskuiclbcrncfun.supabase.co",
  "playerKey": "PLAYER_KEY",
  "syncMinutes": 5,
  "heartbeatSeconds": 60,
  "localPort": 8787
}
```

## Contrato esperado de player-api

Todas las llamadas son `POST` a:

`{supabaseUrl}/functions/v1/player-api`

El player envía tanto `player_key` como `playerKey` para mantener compatibilidad.

### sync

```json
{
  "action": "sync",
  "player_key": "...",
  "version": 2,
  "capabilities": ["offline-cache", "queued-logs", "local-schedule"]
}
```

La respuesta puede usar cualquiera de estas claves:

- Pantalla: `screen` o `pantalla`.
- Campañas: `campaigns`, `campanias`, `items` o `programacion`.

Para cada campaña se reconocen, entre otros:

- `id` / `campania_id` / `campaign_id`
- `tipo_contenido` (`video`, `imagen`, `web`)
- `archivo_url` / `url` / `content_url`
- `duracion_seg`
- `porcentaje`
- `fecha_desde`
- `fecha_hasta`
- `pausada` / `activa`
- `cliente_id`

La pantalla debe incluir `hora_inicio` y `hora_fin` cuando estén configuradas.

### heartbeat

```json
{
  "action": "heartbeat",
  "player_key": "...",
  "version": 2,
  "cached_campaigns": 3,
  "pending_logs": 12,
  "last_successful_sync_at": "2026-11-02T14:00:00.000Z"
}
```

### logs

```json
{
  "action": "logs",
  "player_key": "...",
  "logs": [ ... ],
  "reproducciones": [ ... ]
}
```

Cada reproducción conserva `campania_id`, `cliente_id`, `pantalla_id`, `fecha_hora`, `offline` y `source`.

## Comportamiento ante una caída

1. Falla `sync` o `heartbeat`.
2. `serverOnline` pasa a `false`.
3. No se borra la programación previa.
4. Videos e imágenes continúan desde `data/media/`.
5. El horario se evalúa con el reloj local del equipo.
6. Los logs se guardan localmente.
7. Cada heartbeat intenta detectar la vuelta del servidor.
8. Al reconectar se fuerza una sincronización y luego se vacía la cola de logs.

Nunca se reemplaza una programación válida por una sincronización fallida.
