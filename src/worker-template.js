/* Single-file build for the Cloudflare dashboard. No secrets are embedded. */
/* Generated from admin.html and admin.js by build-admin.py. */
const ADMIN_HTML = "__ADMIN_HTML__";
const ADMIN_JS = "__ADMIN_JS__";


const SESSION_MS = 4 * 3600000;
const COOKIE = '__Host-pmt-admin';
const enc = new TextEncoder();
const hex = buffer => Array.from(new Uint8Array(buffer), b => b.toString(16).padStart(2, '0')).join('');

function reply(body, status = 200, type = 'application/json; charset=utf-8', extra = {}) {
  return new Response(type.startsWith('application/json') ? JSON.stringify(body) : body, {
    status,
    headers: {
      'Content-Type': type,
      'Cache-Control': 'no-store, private',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      'X-Frame-Options': 'DENY',
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
      ...extra
    }
  });
}
function siteOrigin(request, env) {
  const origin = request.headers.get('Origin') || '';
  const allowed = String(env.ALLOWED_ORIGINS || '').split(',').map(s => s.trim()).filter(Boolean);
  return /^https:\/\//.test(origin) && allowed.includes(origin) ? origin : '';
}
function cors(origin) {
  return { 'Access-Control-Allow-Origin': origin, 'Vary': 'Origin' };
}
function clientIP(request) {
  // Only the Cloudflare-injected connection header, never client JSON or X-Forwarded-For.
  const ip = request.headers.get('CF-Connecting-IP') || '';
  return /^[0-9a-f:.]{3,45}$/i.test(ip) ? ip : '';
}
function country(request) {
  const value = String(request.cf?.country || '').toUpperCase();
  return /^[A-Z]{2}$/.test(value) && value !== 'XX' ? value : '';
}
async function keyFor(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}
async function sign(text, secret) {
  return hex(await crypto.subtle.sign('HMAC', await keyFor(secret), enc.encode(text)));
}
async function correctPassword(value, secret) {
  // HMAC verification avoids a variable-time comparison of password strings.
  const key = await keyFor(secret);
  const expected = await crypto.subtle.sign('HMAC', key, enc.encode('login:' + secret));
  return crypto.subtle.verify('HMAC', key, expected, enc.encode('login:' + value));
}
async function bodyJSON(request, maxBytes = 2048) {
  const length = Number(request.headers.get('Content-Length') || 0);
  if (length > maxBytes) throw new Error('body-too-large');
  if (!request.body) throw new Error('missing-body');
  const reader = request.body.getReader();
  const parts = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) { await reader.cancel(); throw new Error('body-too-large'); }
    parts.push(value);
  }
  const all = new Uint8Array(size);
  let offset = 0;
  for (const part of parts) { all.set(part, offset); offset += part.byteLength; }
  const data = JSON.parse(new TextDecoder().decode(all));
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('invalid-body');
  return data;
}
async function allowRate(db, key, limit, windowMs, now) {
  const bucket = Math.floor(now / windowMs);
  const expires = (bucket + 1) * windowMs;
  const result = await db.prepare(`INSERT INTO rate_limits (key, bucket, count, expires_at)
    VALUES (?, ?, 1, ?) ON CONFLICT(key, bucket) DO UPDATE SET count = count + 1
    RETURNING count`).bind(key, bucket, expires).first();
  return result.count <= limit;
}
function cookie(value, seconds) {
  return COOKIE + '=' + value + '; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=' + seconds;
}
async function sessionHash(request, env) {
  const match = (request.headers.get('Cookie') || '').match(/(?:^|;\s*)__Host-pmt-admin=([a-f0-9]{64})(?:;|$)/);
  return match ? sign('session:' + match[1], env.ADMIN_PASSWORD) : '';
}
async function authorized(request, env, now) {
  const hash = await sessionHash(request, env);
  if (!hash) return false;
  return !!(await env.DB.prepare('SELECT token_hash FROM sessions WHERE token_hash = ? AND expires_at > ?').bind(hash, now).first());
}
const REC_MAX_BODY = 8000000;
const REC_SHOT_MAX_B64 = 2000000;

function recSession(value) {
  return typeof value === 'string' && /^[a-f0-9-]{8,80}$/i.test(value) ? value : '';
}
function recViewport(value) {
  return /^\d{1,5}x\d{1,5}$/.test(String(value || '')) ? String(value) : '';
}
function recInt(value, min, max) {
  const n = Number(value);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : null;
}
function recText(value, max) {
  return typeof value === 'string' ? value.replace(/[\u0000-\u001f]/g, ' ').slice(0, max) : '';
}
function recShotPayload(value) {
  if (typeof value !== 'string' || value.length > REC_SHOT_MAX_B64) return '';
  const match = value.match(/^data:image\/jpeg;base64,([A-Za-z0-9+\/=]+)$/);
  return match ? match[1] : '';
}

async function cleanup(env, now = Date.now()) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM rate_limits WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM rec_shots WHERE taken_at <= ?').bind(now - 14 * 24 * 60 * 60 * 1000),
    env.DB.prepare('DELETE FROM rec_events WHERE event_at <= ?').bind(now - 30 * 24 * 60 * 60 * 1000)
  ]);
}
async function handle(request, env) {
  const url = new URL(request.url);
  if (url.protocol !== 'https:') return reply({ error: 'https-required' }, 400);
  const now = Date.now();
  const path = url.pathname;
  const configured = env.DB && typeof env.ADMIN_PASSWORD === 'string' && env.ADMIN_PASSWORD.length >= 24;

  if (path === '/visit') {
    const origin = siteOrigin(request, env);
    if (!origin) return reply({ error: 'origin-denied' }, 403);
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store'
    } });
    if (request.method !== 'POST') return reply({ error: 'method' }, 405, undefined, headers);
    const code = country(request);
    if (!configured) return reply({ country: code, logged: false }, 200, undefined, headers);
    let data;
    try { data = await bodyJSON(request); } catch { return reply({ error: 'invalid-body', country: code }, 400, undefined, headers); }
    const page = typeof data.page === 'string' ? data.page.split(/[?#]/)[0] : '';
    if (!/^\/[a-zA-Z0-9_./%~-]{0,255}$/.test(page)) return reply({ error: 'invalid-page', country: code }, 400, undefined, headers);

    const device = data.device && typeof data.device === 'object' && !Array.isArray(data.device) ? data.device : {};
    const clean = (v, n) => typeof v === 'string' ? v.slice(0, n) : '';
    const deviceType = /^(mobile|tablet|desktop)$/.test(clean(device.deviceType, 16)) ? clean(device.deviceType, 16) : '';
    const deviceModel = clean(device.model, 80);
    const os = clean(device.os, 64);
    const browser = clean(device.browser, 32);
    const browserVersion = clean(device.browserVersion, 32);
    const screenResolution = /^\d{1,5}x\d{1,5}$/.test(clean(device.screenResolution, 16)) ? clean(device.screenResolution, 16) : '';
    const dprValue = Number(device.devicePixelRatio);
    const devicePixelRatio = Number.isFinite(dprValue) && dprValue >= 0.1 && dprValue <= 10 ? Math.round(dprValue * 100) / 100 : null;
    const language = clean(device.language, 32), locale = clean(device.locale, 32), timezone = clean(device.timezone, 64), hourCycle = clean(device.hourCycle, 8);
    const hardwareThreads = Number.isInteger(Number(device.hardwareThreads)) && Number(device.hardwareThreads) >= 1 && Number(device.hardwareThreads) <= 128 ? Number(device.hardwareThreads) : null;
    const deviceMemoryGB = Number(device.deviceMemoryGB);
    const memoryValue = Number.isFinite(deviceMemoryGB) && deviceMemoryGB > 0 && deviceMemoryGB <= 1024 ? deviceMemoryGB : null;
    const batteryLevel = Number(device.batteryLevel);
    const batteryValue = Number.isFinite(batteryLevel) && batteryLevel >= 0 && batteryLevel <= 100 ? Math.round(batteryLevel) : null;
    const batteryCharging = typeof device.batteryCharging === 'boolean' ? (device.batteryCharging ? 1 : 0) : null;
    const referrer = clean(device.referrer, 512);
    const visitorId = /^[a-f0-9-]{16,80}$/i.test(clean(device.visitorId, 80)) ? clean(device.visitorId, 80) : '';
    const interaction = device.interaction && typeof device.interaction === 'object' ? device.interaction : {};
    const clickCount = Number(interaction.clicks);
    const maxScroll = Number(interaction.maxScroll);
    const clicks = Number.isFinite(clickCount) && clickCount >= 0 && clickCount <= 1000 ? Math.round(clickCount) : 0;
    const scroll = Number.isFinite(maxScroll) && maxScroll >= 0 && maxScroll <= 100 ? Math.round(maxScroll) : 0;
    const ip = clientIP(request);
    let blocked = false;
    if (visitorId) {
      const row = await env.DB.prepare('SELECT 1 FROM blocked_visitors WHERE visitor_id = ? LIMIT 1').bind(visitorId).first();
      blocked = !!row;
    }
    if (blocked) return reply({ country: code, logged: false, blocked: true }, 200, undefined, headers);
    if (!ip) return reply({ country: code, logged: false }, 200, undefined, headers);
    try {
      const key = await sign('visit-rate:' + ip, env.ADMIN_PASSWORD);
      if (!(await allowRate(env.DB, key, 120, 60000, now))) return reply({ country: code, logged: false }, 200, undefined, headers);
      await env.DB.prepare(`INSERT INTO visits
        (visited_at, ip, country, site_origin, page, device_type, device_model, os, browser, browser_version, screen_resolution, device_pixel_ratio, language, locale, timezone, hour_cycle, hardware_threads, device_memory_gb, battery_level, battery_charging, referrer, visitor_id, click_count, max_scroll)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)` )
        .bind(now, ip, code, origin, page, deviceType, deviceModel, os, browser, browserVersion, screenResolution, devicePixelRatio, language, locale, timezone, hourCycle, hardwareThreads, memoryValue, batteryValue, batteryCharging, referrer, visitorId, clicks, scroll).run();
      return reply({ country: code, logged: true }, 200, undefined, headers);
    } catch {
      // Country-based presentation must not depend on successful database writes.
      return reply({ country: code, logged: false }, 200, undefined, headers);
    }
  }
  if (path === '/rec') {
    const origin = siteOrigin(request, env);
    if (!origin) return reply({ error: 'origin-denied' }, 403);
    const headers = cors(origin);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      ...headers, 'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type', 'Cache-Control': 'no-store'
    } });
    if (request.method !== 'POST') return reply({ error: 'method' }, 405, undefined, headers);
    if (!configured) return reply({ logged: false }, 200, undefined, headers);
    const ip = clientIP(request);
    if (!ip) return reply({ logged: false }, 200, undefined, headers);
    let data;
    try { data = await bodyJSON(request, REC_MAX_BODY); } catch { return reply({ error: 'invalid-body' }, 400, undefined, headers); }
    const visitorId = typeof data.visitorId === 'string' && /^[a-f0-9-]{16,80}$/i.test(data.visitorId) ? data.visitorId : '';
    const sessionId = recSession(data.sessionId);
    if (!visitorId || !sessionId) return reply({ error: 'invalid-session' }, 400, undefined, headers);
    const blockedRow = await env.DB.prepare('SELECT 1 FROM blocked_visitors WHERE visitor_id = ? LIMIT 1').bind(visitorId).first();
    if (blockedRow) return reply({ logged: false, blocked: true }, 200, undefined, headers);
    try {
      const rateKey = await sign('rec-rate:' + ip, env.ADMIN_PASSWORD);
      if (!(await allowRate(env.DB, rateKey, 600, 60000, now))) return reply({ logged: false }, 200, undefined, headers);
    } catch { return reply({ logged: false }, 200, undefined, headers); }

    const page = typeof data.page === 'string' ? data.page.split(/[?#]/)[0] : '';
    const safePage = /^\/[a-zA-Z0-9_./%~-]{0,255}$/.test(page) ? page : '';

    const shots = Array.isArray(data.shots) ? data.shots.slice(0, 240) : [];
    const shotIds = [];
    for (const shot of shots) {
      const payload = recShotPayload(shot && shot.data);
      if (!payload) { shotIds.push(null); continue; }
      const result = await env.DB.prepare(`INSERT INTO rec_shots
        (session_id, visitor_id, page, taken_at, viewport, scroll_y, scroll_pct, width, height, mime, data)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'image/jpeg', ?) RETURNING id`)
        .bind(sessionId, visitorId, typeof shot.page === 'string' && /^\/[a-zA-Z0-9_./%~-]{0,255}$/.test(shot.page) ? shot.page : safePage,
          recInt(shot.t, 0, 864000000) == null ? now : now - Math.max(0, recInt(shot.t, 0, 864000000)),
          recViewport(shot.viewport), recInt(shot.sy, 0, 1000000) || 0, recInt(shot.sp, 0, 100) || 0,
          recInt(shot.w, 1, 4096) || 0, recInt(shot.h, 1, 4096) || 0, payload)
        .first();
      shotIds.push(result && result.id ? result.id : null);
    }

    const events = Array.isArray(data.events) ? data.events.slice(0, 2000) : [];
    const statements = [];
    for (const event of events) {
      if (!event || (event.kind !== 'click' && event.kind !== 'scroll')) continue;
      const si = recInt(event.si, -1, 239);
      const shotId = si != null && si >= 0 && si < shotIds.length ? shotIds[si] : null;
      statements.push(env.DB.prepare(`INSERT INTO rec_events
        (session_id, visitor_id, page, kind, event_at, x, y, vx, vy, viewport, scroll_y, scroll_pct, target, label, shot_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(sessionId, visitorId, typeof event.page === 'string' && /^\/[a-zA-Z0-9_./%~-]{0,255}$/.test(event.page) ? event.page : safePage,
          event.kind === 'click' ? 'click' : 'scroll',
          recInt(event.t, 0, 864000000) == null ? now : now - Math.max(0, recInt(event.t, 0, 864000000)),
          recInt(event.x, -100000, 1000000), recInt(event.y, -100000, 1000000),
          recInt(event.vx, -100000, 1000000), recInt(event.vy, -100000, 1000000),
          recViewport(event.viewport), recInt(event.sy, 0, 1000000) || 0, recInt(event.sp, 0, 100) || 0,
          recText(event.tg, 120), recText(event.lb, 160), shotId));
    }
    if (statements.length) await env.DB.batch(statements);
    return reply({ logged: true, shots: shotIds.filter(Boolean).length, events: statements.length }, 200, undefined, headers);
  }
  if (path === '/robots.txt' && request.method === 'GET') return reply('User-agent: *\nDisallow: /\n', 200, 'text/plain; charset=utf-8');
  if ((path === '/admin' || path === '/admin/') && request.method === 'GET') return reply(ADMIN_HTML, 200, 'text/html; charset=utf-8', { 'X-Robots-Tag': 'noindex, nofollow' });
  if (path === '/admin.js' && request.method === 'GET') return reply(ADMIN_JS, 200, 'text/javascript; charset=utf-8');
  if (!path.startsWith('/api/')) return reply({ error: 'not-found' }, 404);
  if (!configured) return reply({ error: 'not-configured' }, 503);
  // Admin responses have NO cross-origin access headers. POST also checks Origin.
  if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) return reply({ error: 'origin-denied' }, 403);
  if (path === '/api/login' && request.method === 'POST') {
    const ip = clientIP(request);
    if (!ip) return reply({ error: 'connection-ip-unavailable' }, 400);
    const key = await sign('login-rate:' + ip, env.ADMIN_PASSWORD);
    if (!(await allowRate(env.DB, key, 5, 15 * 60000, now))) return reply({ error: 'too-many-attempts' }, 429, undefined, { 'Retry-After': '900' });
    let data;
    try { data = await bodyJSON(request); } catch { return reply({ error: 'invalid-body' }, 400); }
    if (typeof data.password !== 'string' || !(await correctPassword(data.password, env.ADMIN_PASSWORD))) return reply({ error: 'invalid-login' }, 401);
    const token = hex(crypto.getRandomValues(new Uint8Array(32)));
    const hash = await sign('session:' + token, env.ADMIN_PASSWORD);
    await env.DB.prepare('INSERT INTO sessions (token_hash, expires_at) VALUES (?, ?)').bind(hash, now + SESSION_MS).run();
    return reply({ ok: true }, 200, undefined, { 'Set-Cookie': cookie(token, SESSION_MS / 1000) });
  }
  if (path === '/api/logout' && request.method === 'POST') {
    const hash = await sessionHash(request, env);
    if (hash) await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(hash).run();
    return reply({ ok: true }, 200, undefined, { 'Set-Cookie': cookie('', 0) });
  }
  if (!(await authorized(request, env, now))) return reply({ error: 'unauthorized' }, 401);
  if (path === '/api/block' && request.method === 'POST') {
    let data;
    try { data = await bodyJSON(request, 4096); } catch { return reply({ error: 'invalid-body' }, 400); }
    const visitorId = typeof data.visitorId === 'string' && /^[a-f0-9-]{16,80}$/i.test(data.visitorId) ? data.visitorId : '';
    if (!visitorId) return reply({ error: 'invalid-visitor-id' }, 400);
    if (data.blocked) {
      await env.DB.prepare('INSERT OR IGNORE INTO blocked_visitors (visitor_id, blocked_at) VALUES (?, ?)').bind(visitorId, now).run();
    } else {
      await env.DB.prepare('DELETE FROM blocked_visitors WHERE visitor_id = ?').bind(visitorId).run();
    }
    return reply({ ok: true, blocked: !!data.blocked });
  }
  if (path === '/api/visits' && request.method === 'GET') {
    const raw = url.searchParams.get('before') || '';
    const before = raw ? Number(raw) : Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(before) || before < 1) return reply({ error: 'invalid-cursor' }, 400);
    const result = await env.DB.prepare(`SELECT v.id, v.visited_at, v.ip, v.country, v.site_origin, v.page, v.device_type, v.device_model, v.os, v.browser, v.browser_version, v.screen_resolution, v.device_pixel_ratio, v.language, v.locale, v.timezone, v.hour_cycle, v.hardware_threads, v.device_memory_gb, v.battery_level, v.battery_charging, v.referrer, v.visitor_id, v.click_count, v.max_scroll, CASE WHEN b.visitor_id IS NULL THEN 0 ELSE 1 END AS blocked
      FROM visits v LEFT JOIN blocked_visitors b ON b.visitor_id = v.visitor_id
      WHERE v.id < ? ORDER BY v.id DESC LIMIT 101`)
      .bind(before).all();
    const rows = result.results || [];
    const more = rows.length > 100;
    const visits = rows.slice(0, 100);
    return reply({ visits, next: more ? visits[visits.length - 1].id : null });
  }
  if (path === '/api/rec/sessions' && request.method === 'GET') {
    const raw = url.searchParams.get('before') || '';
    const before = raw ? Number(raw) : Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(before) || before < 1) return reply({ error: 'invalid-cursor' }, 400);
    const result = await env.DB.prepare(`SELECT r.session_id, r.visitor_id,
        MIN(r.event_at) AS first_at, MAX(r.event_at) AS last_at,
        SUM(CASE WHEN r.kind = 'click' THEN 1 ELSE 0 END) AS clicks,
        SUM(CASE WHEN r.kind = 'scroll' THEN 1 ELSE 0 END) AS scrolls,
        COUNT(DISTINCT r.page) AS pages,
        GROUP_CONCAT(DISTINCT r.page) AS page_list,
        (SELECT COUNT(*) FROM rec_shots s WHERE s.session_id = r.session_id) AS shots,
        (SELECT v.ip FROM visits v WHERE v.visitor_id = r.visitor_id ORDER BY v.id DESC LIMIT 1) AS ip,
        (SELECT v.country FROM visits v WHERE v.visitor_id = r.visitor_id ORDER BY v.id DESC LIMIT 1) AS country,
        CASE WHEN b.visitor_id IS NULL THEN 0 ELSE 1 END AS blocked
      FROM rec_events r
      LEFT JOIN blocked_visitors b ON b.visitor_id = r.visitor_id
      GROUP BY r.session_id
      HAVING MAX(r.event_at) < ?
      ORDER BY last_at DESC LIMIT 51`)
      .bind(before).all();
    const rows = result.results || [];
    const more = rows.length > 50;
    const sessions = rows.slice(0, 50);
    return reply({ sessions, next: more && sessions.length ? sessions[sessions.length - 1].last_at : null });
  }
  if (path === '/api/rec/session' && request.method === 'GET') {
    const sid = recSession(url.searchParams.get('sid') || '');
    if (!sid) return reply({ error: 'invalid-session' }, 400);
    const eventsResult = await env.DB.prepare(`SELECT id, event_at, kind, page, x, y, vx, vy, viewport, scroll_y, scroll_pct, target, label, shot_id
      FROM rec_events WHERE session_id = ? ORDER BY event_at, id LIMIT 50001`).bind(sid).all();
    const shotsResult = await env.DB.prepare(`SELECT id, taken_at, page, viewport, scroll_y, scroll_pct, width, height
      FROM rec_shots WHERE session_id = ? ORDER BY taken_at, id LIMIT 20001`).bind(sid).all();
    return reply({ events: eventsResult.results || [], shots: shotsResult.results || [] });
  }
  if (path === '/api/rec/shot' && request.method === 'GET') {
    const id = Number(url.searchParams.get('id'));
    if (!Number.isSafeInteger(id) || id < 1) return reply({ error: 'invalid-id' }, 400);
    const row = await env.DB.prepare('SELECT mime, data FROM rec_shots WHERE id = ?').bind(id).first();
    if (!row || !row.data) return reply({ error: 'not-found' }, 404);
    const binary = atob(row.data);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new Response(bytes, {
      status: 200,
      headers: { 'Content-Type': row.mime || 'image/jpeg', 'Cache-Control': 'no-store, private', 'X-Content-Type-Options': 'nosniff' }
    });
  }
  return reply({ error: 'not-found' }, 404);
}
export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch { return reply({ error: 'service-unavailable' }, 503); }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(cleanup(env)); }
};
