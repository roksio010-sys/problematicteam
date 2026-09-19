/* Single-file build for the Cloudflare dashboard. No secrets are embedded. */
/* Generated from admin.html and admin.js by build-admin.py. */
const ADMIN_HTML = "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>Журнал посещений / PMT</title><style>*{box-sizing:border-box}body{margin:0;background:#100b18;color:#f5f1fb;font:15px/1.45 Arial,sans-serif}main{max-width:1500px;margin:auto;padding:30px 16px}h1{font-size:28px}.badge{font-size:12px;color:#c39aff;letter-spacing:2px}p{color:#c2b6d0}form{max-width:460px;padding:24px;border:1px solid #443253;border-radius:14px;margin-top:24px}label{display:block}input{display:block;width:100%;margin:12px 0;padding:12px;border:1px solid #72528b;border-radius:7px;background:#20162c;color:white;font:inherit}button{background:#aa75ef;border:0;border-radius:7px;color:#160a27;padding:9px 13px;cursor:pointer;font:inherit;margin:3px}button.secondary{background:#352543;color:#eadcfb}button.danger{background:#b84d65;color:white}.table-wrap{overflow:auto;margin-top:18px;border:1px solid #443253;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:9px;text-align:left;border-bottom:1px solid #352543;vertical-align:top;white-space:nowrap}th{color:#c39aff;background:#1b1127}.ip,.vid{font-family:monospace}.vid{max-width:150px;overflow:hidden;text-overflow:ellipsis}#status{min-height:24px;color:#e1c8ff}small{color:#b6a4c7}[hidden]{display:none!important}noscript{color:#ffaaaa}.blocked{opacity:.55}</style></head><body><main><span class=\"badge\">PROBLEMATIC TEAM / ВЛАДЕЛЕЦ</span><h1>Журнал посещений</h1><p>Новые поля: браузер, модель (если браузер её сообщает), язык/регион, часовой пояс, батарея, CPU/RAM-подсказки, referrer и агрегированные взаимодействия. Камеры/микрофоны, clipboard и графические fingerprint-хэши не собираются.</p><noscript>Для входа включите JavaScript.</noscript><p id=\"status\">Проверяем вход...</p><form id=\"login\" hidden><label for=\"password\">Пароль владельца</label><input id=\"password\" type=\"password\" autocomplete=\"current-password\" required maxlength=\"1024\"><button id=\"login-button\" type=\"submit\">Войти</button></form><section id=\"journal\" hidden><button id=\"refresh\" type=\"button\">Обновить</button><button id=\"logout\" type=\"button\" class=\"secondary\">Выйти</button><div class=\"table-wrap\"><table><thead><tr><th>Время</th><th>IP</th><th>Страна</th><th>Устройство</th><th>Модель</th><th>ОС</th><th>Браузер</th><th>Версия</th><th>Экран</th><th>DPR</th><th>Язык</th><th>Регион</th><th>Часовой пояс</th><th>CPU</th><th>RAM</th><th>Батарея</th><th>Referrer</th><th>Клики</th><th>Scroll</th><th>Visitor ID</th><th>Доступ</th><th>Сайт и страница</th></tr></thead><tbody id=\"rows\"></tbody></table></div><button id=\"more\" type=\"button\" class=\"secondary\" hidden>Показать ещё 100</button><p><small>Visitor ID — случайный first-party идентификатор в localStorage, а не аппаратный fingerprint. Блокировка действует для этого браузерного профиля и может быть сброшена очисткой хранилища.</small></p></section></main><script src=\"/admin.js\" defer></script></body></html>";
const ADMIN_JS = "(function(){'use strict';var login=document.getElementById('login'),journal=document.getElementById('journal'),status=document.getElementById('status'),rows=document.getElementById('rows'),more=document.getElementById('more'),next=null,busy=false,generation=0;function msg(t){status.textContent=t}function api(path,body){return fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){if(!r.ok){var e=new Error(d.error||'error');e.status=r.status;throw e}return d})})}function out(){generation++;rows.textContent='';next=null;more.hidden=true;journal.hidden=true;login.hidden=false}function err(e){if(e.status===401){out();msg('Введите пароль владельца.');return}if(e.status===429){msg('Слишком много попыток.');return}msg('Не удалось выполнить запрос.')}function block(v,blocked){return api('/api/block',{visitorId:v,blocked:blocked}).then(function(){load(false)})}function load(append){if(busy)return Promise.resolve();busy=true;var ticket=generation;msg('Загружаем записи...');return api('/api/visits'+(append&&next?'?before='+next:'')).then(function(data){if(ticket!==generation)return;login.hidden=true;journal.hidden=false;if(!append)rows.textContent='';data.visits.forEach(function(v){var tr=document.createElement('tr');if(v.blocked)tr.className='blocked';var vals=[new Date(v.visited_at).toLocaleString(),v.ip,v.country||'—',v.device_type||'—',v.device_model||'—',v.os||'—',v.browser||'—',v.browser_version||'—',v.screen_resolution||'—',v.device_pixel_ratio==null?'—':v.device_pixel_ratio,v.language||'—',v.locale||'—',v.timezone||'—',(v.hardware_threads||'—'),(v.device_memory_gb||'—'),v.battery_level==null?'—':v.battery_level+'%'+(v.battery_charging?' ⚡':''),v.referrer||'—',v.click_count==null?'—':v.click_count,v.max_scroll==null?'—':v.max_scroll+'%',v.visitor_id||'—',v.blocked?'ЗАБЛОКИРОВАН':'Разрешён',v.site_origin+v.page];vals.forEach(function(x,i){var td=document.createElement('td');td.textContent=String(x);if(i===1)td.className='ip';if(i===19)td.className='vid';tr.appendChild(td)});var td=document.createElement('td');var b=document.createElement('button');b.textContent=v.blocked?'Разблокировать':'Заблокировать';b.className=v.blocked?'secondary':'danger';b.onclick=function(){b.disabled=true;block(v.visitor_id,!v.blocked).catch(err).finally(function(){b.disabled=false})};td.appendChild(b);tr.appendChild(td);rows.appendChild(tr)});next=data.next;more.hidden=!next;msg('Показано записей: '+rows.children.length)}).catch(err).then(function(){busy=false})}login.addEventListener('submit',function(e){e.preventDefault();var p=document.getElementById('password'),b=document.getElementById('login-button');b.disabled=true;var val=p.value;p.value='';api('/api/login',{password:val}).then(function(){return load(false)}).catch(function(e){err(e);if(e.status===401)msg('Неверный пароль.')}).finally(function(){b.disabled=false})});document.getElementById('refresh').onclick=function(){load(false)};more.onclick=function(){load(true)};document.getElementById('logout').onclick=function(){api('/api/logout',{}).then(function(){out();msg('Вы вышли.')}).catch(err)};load(false)})();";


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
  return reply({ error: 'not-found' }, 404);
}
export default {
  async fetch(request, env) {
    try { return await handle(request, env); }
    catch { return reply({ error: 'service-unavailable' }, 503); }
  },
  async scheduled(event, env, ctx) { ctx.waitUntil(cleanup(env)); }
};
