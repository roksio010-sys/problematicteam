/* Single-file build for the Cloudflare dashboard. No secrets are embedded. */
/* Generated from admin.html and admin.js by build-admin.py. */
const ADMIN_HTML = "<!doctype html><html lang=\"ru\"><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><meta name=\"robots\" content=\"noindex,nofollow\"><title>Журнал посещений / PMT</title><style>*{box-sizing:border-box}body{margin:0;background:#100b18;color:#f5f1fb;font:15px/1.45 Arial,sans-serif}main{max-width:1500px;margin:auto;padding:30px 16px}h1{font-size:28px}.badge{font-size:12px;color:#c39aff;letter-spacing:2px}p{color:#c2b6d0}form{max-width:460px;padding:24px;border:1px solid #443253;border-radius:14px;margin-top:24px}label{display:block}input{display:block;width:100%;margin:12px 0;padding:12px;border:1px solid #72528b;border-radius:7px;background:#20162c;color:white;font:inherit}button{background:#aa75ef;border:0;border-radius:7px;color:#160a27;padding:9px 13px;cursor:pointer;font:inherit;margin:3px}button.secondary{background:#352543;color:#eadcfb}button.danger{background:#b84d65;color:white}.table-wrap{overflow:auto;margin-top:18px;border:1px solid #443253;border-radius:10px}table{border-collapse:collapse;width:100%;font-size:12px}th,td{padding:9px;text-align:left;border-bottom:1px solid #352543;vertical-align:top;white-space:nowrap}th{color:#c39aff;background:#1b1127}.ip,.vid{font-family:monospace}.vid{max-width:150px;overflow:hidden;text-overflow:ellipsis}#status{min-height:24px;color:#e1c8ff}small{color:#b6a4c7}[hidden]{display:none!important}noscript{color:#ffaaaa}.blocked{opacity:.55}#tabs{margin-top:18px}#tabs button.active{outline:2px solid #c39aff}#rec-stage{position:relative;display:inline-block;max-width:100%;margin-top:14px;border:1px solid #443253;border-radius:10px;overflow:hidden;background:#0b0712}#rec-stage img{display:block;max-width:100%;height:auto}#rec-dots{position:absolute;inset:0}.rec-dot{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;border:2px solid #ff5d7a;background:rgba(255,93,122,.28);cursor:pointer;font-size:0}.rec-dot:hover,.rec-dot.sel{background:rgba(255,93,122,.55)}#rec-strip{display:flex;gap:6px;flex-wrap:wrap;margin-top:10px}#rec-strip img{width:86px;border:2px solid #352543;border-radius:6px;cursor:pointer;display:block}#rec-strip img.active{border-color:#aa75ef}#rec-clicks{margin-top:14px;max-height:280px;overflow:auto;border:1px solid #443253;border-radius:10px}#rec-clicks table{font-size:12px}#rec-clicks tr.sel td{background:#2a1c3a}#rec-info{margin-top:8px;color:#c2b6d0}</style></head><body><main><span class=\"badge\">PROBLEMATIC TEAM / ВЛАДЕЛЕЦ</span><h1>Журнал посещений</h1><p>Журнал хранит IP, устройство и агрегированные взаимодействия. Раздел «Записи сессий» дополнительно показывает снимки страниц и точки кликов посетителей. Камеры/микрофоны, clipboard и графические fingerprint-хэши не собираются.</p><noscript>Для входа включите JavaScript.</noscript><p id=\"status\">Проверяем вход...</p><form id=\"login\" hidden><label for=\"password\">Пароль владельца</label><input id=\"password\" type=\"password\" autocomplete=\"current-password\" required maxlength=\"1024\"><button id=\"login-button\" type=\"submit\">Войти</button></form><div id=\"tabs\" hidden><button id=\"tab-journal\" type=\"button\" class=\"active\">Журнал</button><button id=\"tab-rec\" type=\"button\" class=\"secondary\">Записи сессий</button></div><section id=\"journal\" hidden><button id=\"refresh\" type=\"button\">Обновить</button><button id=\"logout\" type=\"button\" class=\"secondary\">Выйти</button><div class=\"table-wrap\"><table><thead><tr><th>Время</th><th>IP</th><th>Страна</th><th>Устройство</th><th>Модель</th><th>ОС</th><th>Браузер</th><th>Версия</th><th>Экран</th><th>DPR</th><th>Язык</th><th>Регион</th><th>Часовой пояс</th><th>CPU</th><th>RAM</th><th>Батарея</th><th>Referrer</th><th>Клики</th><th>Scroll</th><th>Visitor ID</th><th>Доступ</th><th>Сайт и страница</th></tr></thead><tbody id=\"rows\"></tbody></table></div><button id=\"more\" type=\"button\" class=\"secondary\" hidden>Показать ещё 100</button><p><small>Visitor ID — случайный first-party идентификатор в localStorage, а не аппаратный fingerprint. Блокировка действует для этого браузерного профиля и может быть сброшена очисткой хранилища.</small></p></section><section id=\"rec\" hidden><div id=\"rec-list\"><button id=\"rec-refresh\" type=\"button\">Обновить</button><button id=\"rec-logout\" type=\"button\" class=\"secondary\">Выйти</button><div class=\"table-wrap\"><table><thead><tr><th>Начало</th><th>Активность</th><th>IP</th><th>Страна</th><th>Visitor ID</th><th>Страницы</th><th>Клики</th><th>Скроллы</th><th>Снимки</th><th>Доступ</th></tr></thead><tbody id=\"rec-rows\"></tbody></table></div><button id=\"rec-more\" type=\"button\" class=\"secondary\" hidden>Показать ещё 50</button><p><small>Сессия — одна вкладка браузера (до 30 минут неактивности). Снимки и события хранятся бессрочно: автоматическое удаление отключено. Снимок делается каждую секунду.</small></p></div><div id=\"rec-view\" hidden><button id=\"rec-back\" type=\"button\">← К списку сессий</button><div id=\"rec-info\"></div><div id=\"rec-stage\"><img id=\"rec-img\" alt=\"Снимок страницы\"><div id=\"rec-dots\"></div></div><div id=\"rec-strip\"></div><div id=\"rec-nav\"><button id=\"rec-prev\" type=\"button\">← Предыдущий снимок</button><button id=\"rec-next\" type=\"button\">Следующий снимок →</button></div><div id=\"rec-clicks\" class=\"table-wrap\"><table><thead><tr><th>Время</th><th>Действие</th><th>Элемент</th><th>Текст</th><th>Страница</th><th>X:Y</th></tr></thead><tbody id=\"rec-click-rows\"></tbody></table></div><p><small>Клик без привязанного снимка показывается на ближайшем по времени снимке. Снимок делается в момент клика и раз в секунду, пока открыта страница.</small></p></div></section></main><script src=\"/admin.js\" defer></script></body></html>\n";
const ADMIN_JS = "(function(){'use strict';var login=document.getElementById('login'),journal=document.getElementById('journal'),status=document.getElementById('status'),rows=document.getElementById('rows'),more=document.getElementById('more'),next=null,busy=false,generation=0;function msg(t){status.textContent=t}function api(path,body){return fetch(path,{method:body===undefined?'GET':'POST',credentials:'same-origin',cache:'no-store',headers:body===undefined?{}:{'Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)}).then(function(r){return r.json().then(function(d){if(!r.ok){var e=new Error(d.error||'error');e.status=r.status;throw e}return d})})}function out(){generation++;rows.textContent='';next=null;more.hidden=true;journal.hidden=true;login.hidden=false;document.dispatchEvent(new Event('pmt:logout'))}function err(e){if(e.status===401){out();msg('Введите пароль владельца.');return}if(e.status===429){msg('Слишком много попыток.');return}msg('Не удалось выполнить запрос.')}function block(v,blocked){return api('/api/block',{visitorId:v,blocked:blocked}).then(function(){load(false)})}function load(append){if(busy)return Promise.resolve();busy=true;var ticket=generation;msg('Загружаем записи...');return api('/api/visits'+(append&&next?'?before='+next:'')).then(function(data){if(ticket!==generation)return;login.hidden=true;journal.hidden=false;document.dispatchEvent(new Event('pmt:login'));if(!append)rows.textContent='';data.visits.forEach(function(v){var tr=document.createElement('tr');if(v.blocked)tr.className='blocked';var vals=[new Date(v.visited_at).toLocaleString(),v.ip,v.country||'—',v.device_type||'—',v.device_model||'—',v.os||'—',v.browser||'—',v.browser_version||'—',v.screen_resolution||'—',v.device_pixel_ratio==null?'—':v.device_pixel_ratio,v.language||'—',v.locale||'—',v.timezone||'—',(v.hardware_threads||'—'),(v.device_memory_gb||'—'),v.battery_level==null?'—':v.battery_level+'%'+(v.battery_charging?' ⚡':''),v.referrer||'—',v.click_count==null?'—':v.click_count,v.max_scroll==null?'—':v.max_scroll+'%',v.visitor_id||'—',v.blocked?'ЗАБЛОКИРОВАН':'Разрешён',v.site_origin+v.page];vals.forEach(function(x,i){var td=document.createElement('td');td.textContent=String(x);if(i===1)td.className='ip';if(i===19)td.className='vid';tr.appendChild(td)});var td=document.createElement('td');var b=document.createElement('button');b.textContent=v.blocked?'Разблокировать':'Заблокировать';b.className=v.blocked?'secondary':'danger';b.onclick=function(){b.disabled=true;block(v.visitor_id,!v.blocked).catch(err).finally(function(){b.disabled=false})};td.appendChild(b);tr.appendChild(td);rows.appendChild(tr)});next=data.next;more.hidden=!next;msg('Показано записей: '+rows.children.length)}).catch(err).then(function(){busy=false})}login.addEventListener('submit',function(e){e.preventDefault();var p=document.getElementById('password'),b=document.getElementById('login-button');b.disabled=true;var val=p.value;p.value='';api('/api/login',{password:val}).then(function(){return load(false)}).catch(function(e){err(e);if(e.status===401)msg('Неверный пароль.')}).finally(function(){b.disabled=false})});document.getElementById('refresh').onclick=function(){load(false)};more.onclick=function(){load(true)};document.getElementById('logout').onclick=function(){api('/api/logout',{}).then(function(){out();msg('Вы вышли.')}).catch(err)};load(false)})();\n(function(){'use strict';var tabs=document.getElementById('tabs'),tabJournal=document.getElementById('tab-journal'),tabRec=document.getElementById('tab-rec'),journal=document.getElementById('journal'),rec=document.getElementById('rec'),recList=document.getElementById('rec-list'),recView=document.getElementById('rec-view'),recRows=document.getElementById('rec-rows'),recMore=document.getElementById('rec-more'),recInfo=document.getElementById('rec-info'),recImg=document.getElementById('rec-img'),recDots=document.getElementById('rec-dots'),recStrip=document.getElementById('rec-strip'),recClickRows=document.getElementById('rec-click-rows'),status=document.getElementById('status'),recNext=null,recBusy=false,recOpen=null,recData=null,recIndex=0,recShots=[],recEvents=[];\nfunction rmsg(t){status.textContent=t}\nfunction rapi(path){return fetch(path,{credentials:'same-origin',cache:'no-store'}).then(function(r){return r.json().then(function(d){if(!r.ok){var e=new Error(d.error||'error');e.status=r.status;throw e}return d})})}\nfunction esc(v){return v==null||v===''?'—':String(v)}\nfunction fmt(v){return v?new Date(v).toLocaleString():'—'}\ntabJournal.onclick=function(){tabJournal.className='active';tabRec.className='secondary';journal.hidden=false;rec.hidden=true};\ntabRec.onclick=function(){tabRec.className='active';tabJournal.className='secondary';journal.hidden=true;rec.hidden=false;closeSession();loadSessions(false)};\ndocument.addEventListener('pmt:login',function(){tabs.hidden=false});\ndocument.addEventListener('pmt:logout',function(){tabs.hidden=true;rec.hidden=true;recNext=null;recOpen=null;recData=null;recRows.textContent='';recMore.hidden=true;recList.hidden=false;recView.hidden=true});\ndocument.getElementById('rec-logout').onclick=function(){document.getElementById('logout').click()};\nfunction loadSessions(append){if(recBusy)return;recBusy=true;rmsg('Загружаем сессии...');return rapi('/api/rec/sessions'+(append&&recNext?'?before='+recNext:'')).then(function(data){if(!append)recRows.textContent='';data.sessions.forEach(function(s){var tr=document.createElement('tr');if(s.blocked)tr.className='blocked';var vals=[fmt(s.first_at),fmt(s.last_at),s.ip||'—',s.country||'—',s.visitor_id||'—',s.page_list||'—',s.clicks||0,s.scrolls||0,s.shots||0,s.blocked?'ЗАБЛОКИРОВАН':'Разрешён'];vals.forEach(function(x,i){var td=document.createElement('td');td.textContent=String(x);if(i===2)td.className='ip';if(i===4)td.className='vid';tr.appendChild(td)});tr.style.cursor='pointer';tr.onclick=function(){openSession(s.session_id)};recRows.appendChild(tr)});recNext=data.next;recMore.hidden=!recNext;rmsg('Сессий показано: '+recRows.children.length)}).catch(function(e){if(e.status===401){document.dispatchEvent(new Event('pmt:logout'));login.hidden=false;rmsg('Введите пароль владельца.');return}rmsg('Не удалось загрузить сессии.')}).then(function(){recBusy=false})}\ndocument.getElementById('rec-refresh').onclick=function(){loadSessions(false)};\nrecMore.onclick=function(){loadSessions(true)};\nfunction closeSession(){recOpen=null;recData=null;recShots=[];recEvents=[];recList.hidden=false;recView.hidden=true}\ndocument.getElementById('rec-back').onclick=closeSession;\nfunction openSession(sid){recOpen=sid;rmsg('Загружаем сессию...');rapi('/api/rec/session?sid='+encodeURIComponent(sid)).then(function(data){if(recOpen!==sid)return;recData=data;recShots=data.shots||[];recEvents=data.events||[];recIndex=recShots.length?0:-1;recList.hidden=true;recView.hidden=false;recClickRows.textContent='';recEvents.forEach(function(ev){var tr=document.createElement('tr');var vals=[new Date(ev.event_at).toLocaleTimeString(),ev.kind==='click'?'Клик':'Скролл',esc(ev.target),esc(ev.label),esc(ev.page),ev.vx!=null?Math.round(ev.vx)+':'+Math.round(ev.vy):'—'];vals.forEach(function(x){var td=document.createElement('td');td.textContent=String(x);tr.appendChild(td)});tr.style.cursor=ev.kind==='click'?'pointer':'default';tr.onclick=function(){showClick(ev,tr)};recClickRows.appendChild(tr)});recInfo.textContent='Сессия '+sid.slice(0,8)+'… · событий: '+recEvents.length+' · снимков: '+recShots.length;if(!recShots.length){recImg.removeAttribute('src');recImg.hidden=true;recDots.textContent='';buildStrip();rmsg('В этой сессии нет снимков (браузер посетителя не поддерживает съёмку или снимки ещё не отправлены).');return}recImg.hidden=false;buildStrip();showShot(0);rmsg('Сессия открыта.')}).catch(function(e){if(e.status===401){document.dispatchEvent(new Event('pmt:logout'));login.hidden=false;rmsg('Введите пароль владельца.');return}rmsg('Не удалось загрузить сессию.')})}\nfunction clicksForShot(i){var shot=recShots[i],nextShot=recShots[i+1],out=[];recEvents.forEach(function(ev){if(ev.kind!=='click')return;if(ev.shot_id===shot.id){out.push(ev);return}if(ev.shot_id)return;if(ev.event_at>=shot.taken_at&&(!nextShot||ev.event_at<nextShot.taken_at))out.push(ev)});return out}\nfunction showShot(i){recIndex=i;var shot=recShots[i];document.querySelectorAll('#rec-strip img').forEach(function(el,k){el.className=k===i?'active':''});recImg.src='/api/rec/shot?id='+shot.id;recImg.onload=function(){drawDots(shot)};drawDots(shot)}\nfunction drawDots(shot){recDots.textContent='';var clicks=clicksForShot(recIndex);var parts=recImg.naturalWidth?[recImg.naturalWidth,recImg.naturalHeight]:parseViewport(shot.viewport);var vw=parts[0]||1,vh=parts[1]||1;clicks.forEach(function(ev,k){if(ev.vx==null)return;var dot=document.createElement('div');dot.className='rec-dot';dot.title='Клик '+(k+1)+': '+(ev.label||ev.target||'');dot.style.left=(ev.vx/vw*100)+'%';dot.style.top=(ev.vy/vh*100)+'%';dot.textContent=k+1;dot.style.fontSize='10px';dot.style.lineHeight='18px';dot.style.textAlign='center';dot.style.color='#fff';dot.onclick=function(){showClick(ev,null,true)};recDots.appendChild(dot)})}\nfunction parseViewport(v){var m=String(v||'').match(/^(\\d+)x(\\d+)$/);return m?[Number(m[1]),Number(m[2])]:[0,0]}\nfunction showClick(ev,tr,scrollTo){document.querySelectorAll('#rec-clicks tr.sel').forEach(function(el){el.className=''});if(tr)tr.className='sel';else{for(var i=0;i<recClickRows.children.length;i++){if(recEvents[i]===ev){recClickRows.children[i].className='sel';if(scrollTo)recClickRows.children[i].scrollIntoView({block:'nearest'});break}}}var target=recShots[recIndex];for(var j=0;j<recShots.length;j++){var s=recShots[j];if(ev.shot_id===s.id||(ev.event_at>=s.taken_at&&(!recShots[j+1]||ev.event_at<recShots[j+1].taken_at))){target=s;recIndex=j;break}}if(target&&recImg.getAttribute('src')!=='/api/rec/shot?id='+target.id)showShot(recShots.indexOf(target));else drawDots(target)}\ndocument.getElementById('rec-prev').onclick=function(){if(recIndex>0)showShot(recIndex-1)};\ndocument.getElementById('rec-next').onclick=function(){if(recIndex>=0&&recIndex<recShots.length-1)showShot(recIndex+1)};\nrecImg.onload=function(){if(recShots[recIndex])drawDots(recShots[recIndex])};\nfunction buildStrip(){recStrip.textContent='';recShots.forEach(function(shot,i){var img=document.createElement('img');img.src='/api/rec/shot?id='+shot.id;img.title=fmt(shot.taken_at);img.onclick=function(){showShot(i)};recStrip.appendChild(img)})}\n})();\n";


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
    const result = await env.DB.prepare(`SELECT g.session_id, g.visitor_id,
        MIN(g.at) AS first_at, MAX(g.at) AS last_at,
        SUM(CASE WHEN g.kind = 'click' THEN 1 ELSE 0 END) AS clicks,
        SUM(CASE WHEN g.kind = 'scroll' THEN 1 ELSE 0 END) AS scrolls,
        COUNT(DISTINCT g.page) AS pages,
        GROUP_CONCAT(DISTINCT g.page) AS page_list,
        (SELECT COUNT(*) FROM rec_shots s WHERE s.session_id = g.session_id) AS shots,
        (SELECT v.ip FROM visits v WHERE v.visitor_id = g.visitor_id ORDER BY v.id DESC LIMIT 1) AS ip,
        (SELECT v.country FROM visits v WHERE v.visitor_id = g.visitor_id ORDER BY v.id DESC LIMIT 1) AS country,
        CASE WHEN b.visitor_id IS NULL THEN 0 ELSE 1 END AS blocked
      FROM (
        SELECT session_id, visitor_id, event_at AS at, kind, page FROM rec_events
        UNION ALL
        SELECT session_id, visitor_id, taken_at AS at, '' AS kind, page FROM rec_shots
      ) g
      LEFT JOIN blocked_visitors b ON b.visitor_id = g.visitor_id
      GROUP BY g.session_id
      HAVING MAX(g.at) < ?
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
