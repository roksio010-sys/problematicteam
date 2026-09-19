/* Single-file build for the Cloudflare dashboard. No secrets are embedded. */
/* Generated from admin.html and admin.js by build-admin.py. */
const ADMIN_HTML = "<!doctype html>\n<html lang=\"ru\"><head>\n<meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<meta name=\"robots\" content=\"noindex,nofollow\"><title>Журнал посещений / PMT</title>\n<style>\n*{box-sizing:border-box}body{margin:0;background:#100b18;color:#f5f1fb;font:16px/1.6 Arial,sans-serif}main{max-width:1150px;margin:auto;padding:36px 20px}h1{font-size:30px;margin:8px 0}p{color:#c2b6d0}.badge{font-size:12px;color:#c39aff;letter-spacing:2px}form{max-width:460px;padding:24px;border:1px solid #443253;border-radius:14px;margin-top:24px}label{display:block}input{display:block;width:100%;margin:12px 0;padding:12px;border:1px solid #72528b;border-radius:7px;background:#20162c;color:white;font:inherit}button{background:#aa75ef;border:0;border-radius:7px;color:#160a27;padding:11px 17px;cursor:pointer;font:inherit;margin:5px 5px 5px 0}button:disabled{opacity:.5;cursor:default}button.secondary{background:#352543;color:#eadcfb}.table-wrap{overflow:auto;margin-top:20px;border:1px solid #443253;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:14px}th,td{padding:12px;text-align:left;border-bottom:1px solid #352543;vertical-align:top}th{color:#c39aff;background:#1b1127;white-space:nowrap}.ip{font-family:monospace;white-space:nowrap}td:last-child{word-break:break-all}#status{min-height:26px;color:#e1c8ff}small{color:#b6a4c7}[hidden]{display:none!important}noscript{color:#ffaaaa}\n</style></head><body><main>\n<span class=\"badge\">PROBLEMATIC TEAM / ВЛАДЕЛЕЦ</span>\n<h1>Журнал посещений</h1>\n<p>IP, страна, устройство, ОС, экран, DPR, страница и время за всё время. Один IP не означает одного человека.</p>\n<noscript>Для входа и просмотра журнала включите JavaScript.</noscript>\n<p id=\"status\" role=\"status\" aria-live=\"polite\">Проверяем вход...</p>\n<form id=\"login\" hidden>\n<label for=\"password\">Пароль владельца</label>\n<input id=\"password\" type=\"password\" autocomplete=\"current-password\" required maxlength=\"1024\">\n<button id=\"login-button\" type=\"submit\">Войти</button>\n<small>Пароль хранится в секретах Cloudflare, не в файлах сайта. После 5 попыток вход временно ограничивается.</small>\n</form>\n<section id=\"journal\" hidden>\n<button id=\"refresh\" type=\"button\">Обновить</button>\n<button id=\"logout\" type=\"button\" class=\"secondary\">Выйти</button>\n<div class=\"table-wrap\"><table><thead><tr><th>Время на вашем устройстве</th><th>IP</th><th>Страна</th><th>Устройство</th><th>ОС</th><th>Экран</th><th>DPR</th><th>Сайт и страница</th></tr></thead><tbody id=\"rows\"></tbody></table></div>\n<button id=\"more\" type=\"button\" class=\"secondary\" hidden>Показать ещё 100</button>\n<p><small>Просмотры страниц, на которых сработал запрос журнала. Боты без JavaScript, блокировщики и ошибки сети могут не попасть в список. Параметры адреса не сохраняются. Сессия действует 4 часа.</small></p>\n</section></main><script src=\"/admin.js\" defer></script></body></html>\n";
const ADMIN_JS = "(function () {\n  'use strict';\n  var login = document.getElementById('login');\n  var journal = document.getElementById('journal');\n  var status = document.getElementById('status');\n  var rows = document.getElementById('rows');\n  var more = document.getElementById('more');\n  var next = null, busy = false, generation = 0;\n  function message(text) { status.textContent = text; }\n  function api(path, body) {\n    return fetch(path, {\n      method: body === undefined ? 'GET' : 'POST',\n      credentials: 'same-origin', cache: 'no-store',\n      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },\n      body: body === undefined ? undefined : JSON.stringify(body)\n    }).then(function (response) {\n      return response.json().then(function (data) {\n        if (!response.ok) { var err = new Error(data.error || 'error'); err.status = response.status; throw err; }\n        return data;\n      });\n    });\n  }\n  function signedOut() {\n    generation += 1;\n    rows.textContent = '';\n    next = null;\n    more.hidden = true;\n    journal.hidden = true;\n    login.hidden = false;\n  }\n  function error(err) {\n    if (err.status === 401) { signedOut(); message('Введите пароль владельца.'); return; }\n    if (err.status === 429) { message('Слишком много попыток. Подождите до 15 минут.'); return; }\n    if (err.status === 503) { message('Сервер недоступен. Проверьте D1, schema.sql и секрет ADMIN_PASSWORD (не менее 24 символов).'); return; }\n    message('Не удалось выполнить запрос. Проверьте соединение и повторите.');\n  }\n  function load(append) {\n    if (busy) return Promise.resolve();\n    busy = true;\n    var ticket = generation;\n    message('Загружаем записи...');\n    return api('/api/visits' + (append && next ? '?before=' + next : '')).then(function (data) {\n      if (ticket !== generation) return;\n      login.hidden = true;\n      journal.hidden = false;\n      if (!append) rows.textContent = '';\n      data.visits.forEach(function (visit) {\n        var tr = document.createElement('tr');\n        [new Date(visit.visited_at).toLocaleString(), visit.ip, visit.country || 'Не определена', visit.device_type || 'Не определено', visit.os || 'Не определена', visit.screen_resolution || 'Не определено', visit.device_pixel_ratio == null ? 'Не определён' : visit.device_pixel_ratio, visit.site_origin + visit.page].forEach(function (value, i) {\n          var td = document.createElement('td');\n          td.textContent = String(value);\n          if (i === 1) td.className = 'ip';\n          tr.appendChild(td);\n        });\n        rows.appendChild(tr);\n      });\n      next = data.next;\n      more.hidden = !next;\n      message(rows.children.length ? 'Показано записей: ' + rows.children.length : 'Записей пока нет. Откройте сайт после подключения Worker.');\n    }).catch(error).then(function () { busy = false; });\n  }\n  login.addEventListener('submit', function (event) {\n    event.preventDefault();\n    var password = document.getElementById('password');\n    var button = document.getElementById('login-button');\n    button.disabled = true;\n    message('Входим...');\n    var value = password.value;\n    password.value = '';\n    api('/api/login', { password: value }).then(function () { return load(false); }).catch(function (err) {\n      error(err);\n      if (err.status === 401) message('Неверный пароль.');\n    }).then(function () { button.disabled = false; value = ''; });\n  });\n  document.getElementById('refresh').addEventListener('click', function () { load(false); });\n  more.addEventListener('click', function () { load(true); });\n  document.getElementById('logout').addEventListener('click', function () {\n    generation += 1;\n    api('/api/logout', {}).then(function () { signedOut(); message('Вы вышли.'); }).catch(error);\n  });\n  load(false);\n}());\n";


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
      'Content-Security-Policy': "default-src 'none'; script-src 'self'; style-src 'unsafe-inline'; connect-src 'self'; form-action 'self'; base-uri 'none'; frame-ancestors 'none'",
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
async function cleanup(env, now = Date.now()) {
  if (!env.DB) return;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sessions WHERE expires_at <= ?').bind(now),
    env.DB.prepare('DELETE FROM rate_limits WHERE expires_at <= ?').bind(now)
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
    const deviceType = typeof device.deviceType === 'string' && /^(mobile|tablet|desktop)$/.test(device.deviceType) ? device.deviceType : '';
    const os = typeof device.os === 'string' ? device.os.slice(0, 64) : '';
    const screenResolution = typeof device.screenResolution === 'string' && /^\d{1,5}x\d{1,5}$/.test(device.screenResolution) ? device.screenResolution : '';
    const dprValue = Number(device.devicePixelRatio);
    const devicePixelRatio = Number.isFinite(dprValue) && dprValue >= 0.1 && dprValue <= 10 ? Math.round(dprValue * 100) / 100 : null;
    const ip = clientIP(request);
    if (!ip) return reply({ country: code, logged: false }, 200, undefined, headers);
    try {
      const key = await sign('visit-rate:' + ip, env.ADMIN_PASSWORD);
      if (!(await allowRate(env.DB, key, 120, 60000, now))) return reply({ country: code, logged: false }, 200, undefined, headers);
      await env.DB.prepare(`INSERT INTO visits
        (visited_at, ip, country, site_origin, page, device_type, os, screen_resolution, device_pixel_ratio)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)` )
        .bind(now, ip, code, origin, page, deviceType, os, screenResolution, devicePixelRatio).run();
      return reply({ country: code, logged: true }, 200, undefined, headers);
    } catch {
      // Country-based presentation must not depend on successful database writes.
      return reply({ country: code, logged: false }, 200, undefined, headers);
    }
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
  if (path === '/api/visits' && request.method === 'GET') {
    const raw = url.searchParams.get('before') || '';
    const before = raw ? Number(raw) : Number.MAX_SAFE_INTEGER;
    if (!Number.isSafeInteger(before) || before < 1) return reply({ error: 'invalid-cursor' }, 400);
    const result = await env.DB.prepare(`SELECT id, visited_at, ip, country, site_origin, page, device_type, os, screen_resolution, device_pixel_ratio
      FROM visits WHERE id < ? ORDER BY id DESC LIMIT 101`)
      .bind(before).all();
    const rows = result.results || [];
    const more = rows.length > 100;
    const visits = rows.slice(0, 100);
    return reply({ visits, next: more ? visits[visits.length - 1].id : null });
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
