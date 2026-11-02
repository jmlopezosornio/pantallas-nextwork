const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const STATE_FILE = path.join(DATA_DIR, 'player.json');
const LOG_FILE = path.join(DATA_DIR, 'pending-logs.json');
const CONFIG_FILE = path.join(ROOT, 'config.json');
const PLAYER_HTML = path.join(ROOT, 'player.html');

fs.mkdirSync(MEDIA_DIR, { recursive: true });

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJsonAtomic(file, value) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value, null, 2));
  fs.renameSync(tmp, file);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function nowIso() { return new Date().toISOString(); }

const config = readJson(CONFIG_FILE, null);
if (!config?.supabaseUrl || !config?.playerKey) {
  console.error('Falta player-offline/config.json. Copiá config.example.json y completá supabaseUrl y playerKey.');
  process.exit(1);
}

const apiUrl = `${String(config.supabaseUrl).replace(/\/$/, '')}/functions/v1/player-api`;
const syncMs = Math.max(1, Number(config.syncMinutes || 5)) * 60 * 1000;
const heartbeatMs = Math.max(15, Number(config.heartbeatSeconds || 60)) * 1000;
const port = Number(config.localPort || 8787);

let state = readJson(STATE_FILE, {
  version: 2,
  lastSyncAt: null,
  lastSuccessfulSyncAt: null,
  serverOnline: false,
  screen: null,
  campaigns: [],
  updatedAt: null
});
let pendingLogs = readJson(LOG_FILE, []);
let syncing = false;

async function api(action, payload = {}, timeoutMs = 12000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, player_key: config.playerKey, playerKey: config.playerKey, ...payload }),
      signal: controller.signal
    });
    const text = await response.text();
    let data = {};
    try { data = text ? JSON.parse(text) : {}; } catch { data = { raw: text }; }
    if (!response.ok) throw new Error(data?.error || data?.message || `HTTP ${response.status}`);
    return data;
  } finally {
    clearTimeout(timer);
  }
}

function normalizeSyncResponse(raw) {
  const root = raw?.data || raw || {};
  const screen = root.screen || root.pantalla || root.player?.pantalla || state.screen || null;
  const campaigns = root.campaigns || root.campanias || root.items || root.programacion || [];
  return {
    screen,
    campaigns: Array.isArray(campaigns) ? campaigns : []
  };
}

function contentUrl(item) {
  return item.archivo_url || item.url || item.content_url || item.contenido_url || item.media_url || null;
}
function contentType(item) {
  return String(item.tipo_contenido || item.tipo || item.type || 'video').toLowerCase();
}
function safeExt(url, type) {
  try {
    const ext = path.extname(new URL(url).pathname).replace(/[^a-z0-9.]/gi, '').slice(0, 8);
    if (ext) return ext;
  } catch {}
  return type === 'imagen' || type === 'image' ? '.jpg' : '.mp4';
}
function mediaName(item, url) {
  const id = item.id || item.campania_id || item.campaign_id || crypto.createHash('sha1').update(url).digest('hex').slice(0, 16);
  return `${String(id).replace(/[^a-zA-Z0-9_-]/g, '_')}${safeExt(url, contentType(item))}`;
}

async function downloadFile(url, dest) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  const tmp = dest + '.tmp';
  try {
    const response = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    if (!response.ok) throw new Error(`Descarga HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    fs.writeFileSync(tmp, Buffer.from(arrayBuffer));
    if (fs.statSync(tmp).size === 0) throw new Error('Archivo vacío');
    fs.renameSync(tmp, dest);
  } finally {
    clearTimeout(timer);
    try { if (fs.existsSync(tmp)) fs.unlinkSync(tmp); } catch {}
  }
}

async function prepareCampaigns(campaigns) {
  const next = [];
  for (const src of campaigns) {
    const item = { ...src };
    const type = contentType(item);
    const url = contentUrl(item);
    if ((type === 'video' || type === 'imagen' || type === 'image') && url) {
      const filename = mediaName(item, url);
      const localPath = path.join(MEDIA_DIR, filename);
      try {
        if (!fs.existsSync(localPath) || fs.statSync(localPath).size === 0) {
          await downloadFile(url, localPath);
        }
        item.local_url = `/media/${encodeURIComponent(filename)}`;
        item.cached = true;
      } catch (err) {
        const old = state.campaigns.find(x => String(x.id || x.campania_id || x.campaign_id) === String(item.id || item.campania_id || item.campaign_id));
        if (old?.local_url) {
          item.local_url = old.local_url;
          item.cached = true;
          item.cache_warning = String(err.message || err);
        } else {
          item.cached = false;
          item.cache_warning = String(err.message || err);
        }
      }
    }
    next.push(item);
  }
  return next;
}

async function syncNow() {
  if (syncing) return;
  syncing = true;
  state.lastSyncAt = nowIso();
  try {
    const raw = await api('sync', { version: 2, capabilities: ['offline-cache', 'queued-logs', 'local-schedule'] }, 15000);
    const normalized = normalizeSyncResponse(raw);
    const campaigns = await prepareCampaigns(normalized.campaigns);
    state = {
      ...state,
      version: 2,
      screen: normalized.screen || state.screen,
      campaigns,
      serverOnline: true,
      lastSuccessfulSyncAt: nowIso(),
      updatedAt: nowIso()
    };
    writeJsonAtomic(STATE_FILE, state);
    await flushLogs();
    console.log(`[${new Date().toLocaleString()}] Sincronización OK · ${campaigns.length} campañas`);
  } catch (err) {
    state.serverOnline = false;
    state.updatedAt = nowIso();
    writeJsonAtomic(STATE_FILE, state);
    console.warn(`[${new Date().toLocaleString()}] Servidor no disponible. Se mantiene programación local. ${err.message || err}`);
  } finally {
    syncing = false;
  }
}

async function heartbeat() {
  try {
    await api('heartbeat', {
      version: 2,
      cached_campaigns: state.campaigns.length,
      pending_logs: pendingLogs.length,
      last_successful_sync_at: state.lastSuccessfulSyncAt
    }, 8000);
    if (!state.serverOnline) {
      state.serverOnline = true;
      writeJsonAtomic(STATE_FILE, state);
      syncNow();
    }
  } catch {
    if (state.serverOnline) {
      state.serverOnline = false;
      writeJsonAtomic(STATE_FILE, state);
    }
  }
}

function queueLog(log) {
  pendingLogs.push({ ...log, fecha_hora: log.fecha_hora || nowIso(), queued_at: nowIso() });
  if (pendingLogs.length > 25000) pendingLogs = pendingLogs.slice(-25000);
  writeJsonAtomic(LOG_FILE, pendingLogs);
}

async function flushLogs() {
  if (!pendingLogs.length) return;
  const batch = pendingLogs.slice(0, 250);
  try {
    await api('logs', { logs: batch, reproducciones: batch }, 15000);
    pendingLogs = pendingLogs.slice(batch.length);
    writeJsonAtomic(LOG_FILE, pendingLogs);
    if (pendingLogs.length) await sleep(150), await flushLogs();
  } catch {}
}

function json(res, status, body) {
  const text = JSON.stringify(body);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*' });
  res.end(text);
}
function serveFile(res, file, contentTypeHeader) {
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'Content-Type': contentTypeHeader, 'Cache-Control': 'no-store' });
  fs.createReadStream(file).pipe(res);
}
function mime(file) {
  const ext = path.extname(file).toLowerCase();
  return ({ '.mp4':'video/mp4','.webm':'video/webm','.mov':'video/quicktime','.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.gif':'image/gif','.webp':'image/webp' })[ext] || 'application/octet-stream';
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  if (req.method === 'GET' && url.pathname === '/') return serveFile(res, PLAYER_HTML, 'text/html; charset=utf-8');
  if (req.method === 'GET' && url.pathname === '/state') return json(res, 200, { ...state, pendingLogs: pendingLogs.length, localNow: new Date().toISOString() });
  if (req.method === 'GET' && url.pathname.startsWith('/media/')) {
    const name = path.basename(decodeURIComponent(url.pathname.slice('/media/'.length)));
    const file = path.join(MEDIA_DIR, name);
    return serveFile(res, file, mime(file));
  }
  if (req.method === 'POST' && url.pathname === '/log') {
    let body = '';
    req.on('data', c => { body += c; if (body.length > 1024 * 1024) req.destroy(); });
    req.on('end', () => {
      try { queueLog(JSON.parse(body || '{}')); json(res, 200, { ok: true, pending: pendingLogs.length }); }
      catch { json(res, 400, { error: 'JSON inválido' }); }
    });
    return;
  }
  if (req.method === 'POST' && url.pathname === '/sync') {
    syncNow();
    return json(res, 202, { ok: true });
  }
  res.writeHead(404); res.end('Not found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`NextWork Player Offline V2: http://127.0.0.1:${port}`);
  console.log(`Programación local: ${state.campaigns.length} campañas · último sync OK: ${state.lastSuccessfulSyncAt || 'nunca'}`);
  syncNow();
  setInterval(syncNow, syncMs).unref();
  setInterval(heartbeat, heartbeatMs).unref();
  setInterval(flushLogs, 30 * 1000).unref();
});
