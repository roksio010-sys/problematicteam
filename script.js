/* ============================================================
   PMT ARCHIVE — логика: язык, рендер данных, плеер, появления
   ============================================================ */

/* ---------- язык ---------- */
const LANGS = { ru: 'Русский', ua: 'Українська' };
const LS_KEY = 'pmt-lang';

function getLang() {
  const v = PMT.getLang();
  return (v === 'ru' || v === 'ua') ? v : null;
}
let LANG = getLang() || 'ru';

/* T(x): строка → словарь; объект {ru,ua} → нужный язык */
function T(x) {
  if (x == null) return '';
  if (typeof x === 'object') return x[LANG] ?? x.ru ?? '';
  if (LANG === 'ua' && Object.prototype.hasOwnProperty.call(DICT, x)) return DICT[x];
  return x;
}
const U = (k) => T(UI[k]);
const plain = (s) => String(s).replace(/<br\s*\/?>/gi, ' ').replace(/&nbsp;/g, ' ');
const nn = (i) => String(i + 1).padStart(2, '0');
const metaFirst = (p) => (p.meta && p.meta[0] ? T(p.meta[0][1]) : T(p.kind));

/* комиксы считаются частями, а не сериями */
const isParts = (p) => /Комикс|Комікс/i.test(String(p.kind || ''));
const unitOne = (p) => (isParts(p) ? U('onePart') : U('oneEpisode'));
const unitMany = (p) => (isParts(p) ? U('partsLabel') : U('episodesLabel'));
/* склонение: 1 серия / 2 серии / 5 серий, 1 часть / 2 части / 5 частей */
const PLURALS = {
  ru: { ep: ['серия', 'серии', 'серий'],   part: ['часть', 'части', 'частей'] },
  ua: { ep: ['серія', 'серії', 'серій'],   part: ['частина', 'частини', 'частин'] }
};
function pluralForm(n) {
  const n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 0;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 1;
  return 2;
}
/* «1 серия», «2 серии», «5 серий», ничего если пусто */
function countLabel(p) {
  const n = p.episodes.length;
  if (!n) return '';
  const table = PLURALS[LANG] || PLURALS.ru;
  const forms = isParts(p) ? table.part : table.ep;
  return n + '\u00A0' + forms[pluralForm(n)];
}
/* имя участника с учётом языка */
const nameOf = (m) => (LANG === 'ua' && typeof NAMES_UA !== 'undefined' && NAMES_UA[m.name]) || m.name;

/* парный проект в другом языке: null — пары нет */
function pairedId(id, toLang) {
  if (!id || typeof LANG_PAIRS === 'undefined') return null;
  const row = LANG_PAIRS.find((r) => r[0] === id || r[1] === id);
  if (!row) return null;
  return toLang === 'ua' ? row[1] : row[0];
}

function setLang(lang, reload = true, keepPage = false) {
  PMT.saveLang(lang);
  if (!reload) return;
  if (keepPage) { location.reload(); return; }
  /* на странице проекта/серии: тот же проект на другом языке,
     если пары нет — уходим в список проектов, а не на чужой проект */
  const file = location.pathname.split('/').pop();
  if (file === 'project.html' || file === 'watch.html') {
    const cur = new URLSearchParams(location.search).get('p');
    const next = pairedId(cur, lang);
    location.href = next ? `project.html?p=${next}` : 'projects.html';
    return;
  }
  location.reload();
}

/* ---------- разметка ---------- */
const LOGO = `<img class="logo" src="assets/pmt.png" alt="PMT" width="135" height="62">`;

const ARROW = `<svg class="btn__arrow" viewBox="0 0 34 10" fill="none" aria-hidden="true">
<path d="M0 5h31M26.5 1 32 5l-5.5 4" stroke="currentColor" stroke-width="1.2"/></svg>`;

const PLAY = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5 20 12 7 19.5z"/></svg>`;

const btn = (text, href, kind = 'line', attrs = '') => `
  <a class="btn btn--${kind}" href="${href}" ${attrs}>
    <span class="btn__fill" aria-hidden="true"></span>
    <span class="btn__label">${text}</span>${ARROW}
  </a>`;

const btnBtn = (text, kind, attrs = '') => `
  <button class="btn btn--${kind}" type="button" ${attrs}>
    <span class="btn__fill" aria-hidden="true"></span>
    <span class="btn__label">${text}</span>${ARROW}
  </button>`;

/* ---------- экран выбора языка ---------- */
function mountLangGate() {
  if (getLang()) return;
  const gate = document.createElement('div');
  gate.className = 'gate';
  gate.innerHTML = `
    <div class="gate__box">
      ${LOGO}
      <h2>Выбери язык<span>Обери мову</span></h2>
      <div class="gate__row">
        <button class="btn btn--line" data-lang="ru"><span class="btn__fill"></span><span class="btn__label">Русский</span>${ARROW}</button>
        <button class="btn btn--line" data-lang="ua"><span class="btn__fill"></span><span class="btn__label">Українська</span>${ARROW}</button>
      </div>
      <p class="label">Сайт полностью переведён · Сайт повністю перекладено</p>
    </div>`;
  document.body.appendChild(gate);
  document.documentElement.classList.add('is-locked');
  gate.querySelectorAll('[data-lang]').forEach((b) => {
    b.addEventListener('click', () => setLang(b.dataset.lang, true, true));
  });
}

/* ---------- шапка и подвал ---------- */
function mountChrome() {
  document.documentElement.lang = LANG === 'ua' ? 'uk' : 'ru';

  const head = document.querySelector('[data-head]');
  if (head) {
    const inner = head.dataset.head === 'inner';
    const nav = [
      [U('navProjects'), inner ? 'projects.html' : '#projects'],
      [U('navTeam'), inner ? 'index.html#team' : '#team']
    ];
    head.innerHTML = `
      <a class="mark" href="index.html" aria-label="${U('toHome')}">${LOGO}</a>
      <div class="nav">
        ${nav.map(([t, h]) => `<a href="${h}">${t}</a>`).join('')}
        <div class="lang" role="group" aria-label="${U('langTitle')}">
          ${Object.keys(LANGS).map((k) => `
            <button type="button" class="lang__btn${k === LANG ? ' is-on' : ''}" data-setlang="${k}"
              aria-pressed="${k === LANG}">${k === 'ru' ? 'RU' : 'UA'}</button>`).join('')}
        </div>
      </div>`;
    head.querySelectorAll('[data-setlang]').forEach((b) => {
      b.addEventListener('click', () => { if (b.dataset.setlang !== LANG) setLang(b.dataset.setlang); });
    });
  }

  const foot = document.querySelector('[data-foot]');
  if (foot) {
    foot.innerHTML = `
      <div class="foot__mark">${LOGO}<span class="label">Problematic&nbsp;Team / ${U('archiveShort')}</span></div>
      <p class="label foot__note">${U('closed')}</p>
      <span class="label">${U('credits')}</span>`;
  }
}

/* ---------- статические подписи в HTML ---------- */
function mountStatic() {
  document.querySelectorAll('[data-t]').forEach((el) => { el.innerHTML = U(el.dataset.t); });
  const t = document.querySelector('[data-title]');
  if (t) document.title = U(t.dataset.title);
}

/* ---------- главная ---------- */
function mountHome() {
  const why = document.querySelector('[data-why]');
  if (why) why.innerHTML = WHY.map((w, i) => `
    <article class="why__item rise" data-d="${i * 100}" tabindex="0">
      <span class="num">${w.n}</span>
      <h3>${LANG === 'ua' ? w.tu : w.t}</h3>
      <p>${T(w.d)}</p>
    </article>`).join('');

  const list = document.querySelector('[data-plist]');
  if (list) list.innerHTML = PROJECTS.map((p, i) => `
    <a class="prow rise" data-d="${i * 50}" href="project.html?p=${p.id}">
      <span class="num prow__num">${nn(i)}</span>
      <div class="prow__media"><img src="${p.poster}" alt="${plain(T(p.titlePlain))}" loading="lazy"></div>
      <div class="prow__body">
        <span class="label label--accent">${T(p.kind)}</span>
        <h3>${T(p.title)}</h3>
        <div class="prow__meta">
          <span class="label">${metaFirst(p)}</span>
          ${countLabel(p) ? `<span class="label">${countLabel(p)}</span>` : ''}
        </div>
      </div>
    </a>`).join('');

  const team = document.querySelector('[data-team]');
  if (team) team.innerHTML = TEAM.map((m, i) => `
    <div class="team__row rise" data-d="${Math.min(i, 8) * 50}">
      <b>${nameOf(m)}</b><span>${T(m.role)}</span>
    </div>`).join('');
}

/* ---------- архив проектов ---------- */
function mountArchive() {
  const grid = document.querySelector('[data-grid]');
  if (!grid) return;
  grid.innerHTML = PROJECTS.map((p, i) => {
    const year = p.meta.find((m) => ['Год', 'Год выпуска', 'Премьера', 'Рік'].includes(m[0]))
      || null;
    return `
    <a class="card rise" data-d="${i * 60}" href="project.html?p=${p.id}">
      <div class="card__media"><img src="${p.poster}" alt="${plain(T(p.titlePlain))}" loading="lazy"></div>
      <div class="card__body">
        <span class="num">${nn(i)} / ${T(p.kind)}</span>
        <h3>${T(p.title)}</h3>
      </div>
      <div class="card__hair"></div>
      ${countLabel(p) || year ? `<div class="card__body"><p class="label">${[countLabel(p), year ? T(year[1]) : ''].filter(Boolean).join(' / ')}</p></div>` : ''}
    </a>`;
  }).join('');
}

/* ---------- модальный плеер на весь экран ---------- */
let modal = null;
function ensureModal() {
  if (modal) return modal;
  modal = document.createElement('div');
  modal.className = 'modal';
  modal.innerHTML = `
    <div class="modal__bar">
      <span class="label" data-modal-title></span>
      <button class="modal__x" type="button" aria-label="${U('closePlayer')}">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>
      </button>
    </div>
    <div class="modal__stage" data-modal-stage></div>`;
  document.body.appendChild(modal);
  modal.querySelector('.modal__x').addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeModal(); });
  return modal;
}
function openModal(id, title) {
  const m = ensureModal();
  m.querySelector('[data-modal-title]').textContent = title;
  m.querySelector('[data-modal-stage]').innerHTML =
    `<iframe src="https://kinescope.io/embed/${id}?autoplay=1"
      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write; screen-wake-lock;"
      allowfullscreen title="${title}"></iframe>`;
  m.classList.add('is-open');
  document.documentElement.classList.add('is-locked');
}
function closeModal() {
  if (!modal || !modal.classList.contains('is-open')) return;
  modal.classList.remove('is-open');
  modal.querySelector('[data-modal-stage]').innerHTML = '';
  document.documentElement.classList.remove('is-locked');
}

/* ---------- встроенный плеер (страница серии) ---------- */
function playerMarkup(ep) {
  if (ep.mp4 || ep.hls) {
    const mp4 = PMT.safeMedia(ep.mp4), hls = PMT.safeMedia(ep.hls);
    if (mp4 || hls) return '<div class="player"><video controls preload="none" playsinline webkit-playsinline poster="' + PMT.escape(ep.poster || '') + '" style="position:absolute;left:0;top:0;width:100%;height:100%">' +
      (mp4 ? '<source src="' + PMT.escape(mp4) + '" type="video/mp4">' : '') +
      (hls ? '<source src="' + PMT.escape(hls) + '" type="application/vnd.apple.mpegurl">' : '') + '</video></div>';
  }
  const title = plain(T(ep.title));
  if (!ep.kinescope) {
    return `<div class="player player--empty">
      <img src="${ep.poster}" alt="" loading="lazy">
      <div class="player__soon">
        <span class="label">${ep.fallback ? U('playerMoved') : U('inProduction')}</span>
        ${ep.fallback ? btn(U('oldPlayer'), ep.fallback, 'line', 'target="_blank" rel="noopener"') : ''}
      </div>
    </div>`;
  }
  return `<div class="player" data-player="${ep.kinescope}" data-title="${title}">
    <img src="${ep.poster}" alt="${title}" loading="lazy">
    <button class="player__btn" type="button" aria-label="${U('openEpisode')}: ${title}">
      <span class="player__disc">${PLAY}</span>
    </button>
  </div>`;
}
function wirePlayers(scope = document) {
  scope.querySelectorAll('[data-player]').forEach((box) => {
    const b = box.querySelector('.player__btn');
    if (!b || b.dataset.wired) return;
    b.dataset.wired = '1';
    b.addEventListener('click', () => {
      box.innerHTML = `<iframe src="https://kinescope.io/embed/${box.dataset.player}?autoplay=1"
        allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write; screen-wake-lock;"
        allowfullscreen title="${box.dataset.title}"></iframe>`;
    });
  });
}

/* строка серии: слева описание, справа встроенный плеер */
function epRow(p, ep) {
  const t = plain(T(ep.title));
  const idx = p.episodes.indexOf(ep);
  return `
    <article class="ep">
      <div class="ep__info">
        <span class="num">${T(ep.n)}</span>
        <h3 class="ep__title">${t || T(ep.n)}</h3>
        ${btn(U('openSeparately'), `watch.html?p=${p.id}&e=${idx + 1}`, 'bare')}
      </div>
      <div class="ep__stage">
        ${playerMarkup(ep)}
        ${ep.note ? `<p class="ep__note">${T(ep.note)}</p>` : ''}
      </div>
    </article>`;
}

/* ---------- страница проекта ---------- */
function mountProject() {
  const root = document.querySelector('[data-project]');
  if (!root) return;
  const id = new URLSearchParams(location.search).get('p') || PROJECTS[0].id;
  const p = findProject(id) || PROJECTS[0];
  document.title = `${plain(T(p.titlePlain))} / Problematic Team`;

  root.innerHTML = `
    <section class="pj">
      <div class="pj__media"><img src="${p.poster}" alt="${plain(T(p.titlePlain))}"></div>
      <div class="pj__side">
        <span class="label label--accent rise" data-d="300">${T(p.kind)}${p.original ? ' / ' + p.original : ''}</span>
        <h1 class="rise" data-d="420">${T(p.title)}</h1>
        ${p.trailer ? `<div class="ptrailer rise" data-d="700">
          <span class="label">${U('trailerLabel')}${p.trailer.title ? ' · ' + plain(T(p.trailer.title)) : ''}</span>
          ${playerMarkup(p.trailer)}
        </div>` : ''}
        <p class="lead rise" data-d="900">${T(p.lead)}</p>
        <div class="metagrid rise" data-d="1040">
          ${(p.meta || []).map(([k, v]) => `<div><span class="label">${T(k)}</span><span>${T(v)}</span></div>`).join('')}
        </div>
        ${p.cast && p.cast.length ? `<div class="castblock rise" data-d="1140">
          <span class="label">${U('castLabel')}</span>
          <div class="castlist">${p.cast.map(([r, a]) => `<span>${T(r)}&nbsp;— ${a}</span>`).join('')}</div>
        </div>` : ''}
        ${p.features ? `<div class="features rise" data-d="1200">
          ${p.features.map(([t, d]) => `<div><b>${T(t)}</b><p>${T(d)}</p></div>`).join('')}
        </div>` : ''}
        <p class="tagline rise" data-d="1260">${T(p.tagline)}</p>
      </div>
    </section>

    <section class="section wrap" id="episodes">
      <div class="statement">
        <div>
          <span class="label label--accent rise">${unitMany(p)}</span>
          <h2 class="rise" data-d="100">${U('episodesH')}</h2>
        </div>
        ${U('episodesLead') ? `<p class="lead rise" data-d="200">${U('episodesLead')}</p>` : ''}
      </div>
      ${p.seasons ? `<div class="seasons rise" data-d="240">
        ${p.seasons.map((sn, si) => `<button type="button" class="season__btn${si === 0 ? ' is-on' : ''}"
          data-season="${si}" aria-pressed="${si === 0}">${T(sn.label)}</button>`).join('')}
      </div>` : ''}
      ${p.seasons ? p.seasons.map((sn, si) => `
        <div class="seasonbox${si === 0 ? ' is-on' : ''}" data-seasonbox="${si}">
          ${sn.trailer ? `<div class="ep ep--trailer">
            <div class="ep__info">
              <span class="num">${U('seasonTrailer')}</span>
              <h3 class="ep__title">${plain(T(sn.trailer.title)) || T(sn.label)}</h3>
            </div>
            <div class="ep__stage">${playerMarkup(sn.trailer)}</div>
          </div>` : ''}
          <div class="eplist">${sn.episodes.map((ep) => epRow(p, ep)).join('')}</div>
        </div>`).join('')
      : (p.episodes.length
          ? `<div class="eplist">${p.episodes.map((ep) => epRow(p, ep)).join('')}</div>`
          : `<p class="lead">${U('noEpisodes')}</p>`)}
    </section>

    <section class="section wrap">
      <div class="statement">
        <div>
          <span class="label label--accent rise">${U('otherLabel')}</span>
          <h2 class="rise" data-d="100">${U('otherH')}</h2>
        </div>
        <p class="lead rise" data-d="200">${U('closed')}</p>
      </div>
      <div class="plist mt-l">
        ${PROJECTS.filter((o) => o.id !== p.id).map((o, i) => `
          <a class="prow rise" data-d="${i * 50}" href="project.html?p=${o.id}">
            <span class="num prow__num">${nn(PROJECTS.indexOf(o))}</span>
            <div class="prow__media"><img src="${o.poster}" alt="${plain(T(o.titlePlain))}" loading="lazy"></div>
            <div class="prow__body">
              <span class="label label--accent">${T(o.kind)}</span>
              <h3>${T(o.title)}</h3>
            </div>
          </a>`).join('')}
      </div>
    </section>`;

  root.querySelectorAll('[data-open]').forEach((b) => {
    b.addEventListener('click', () => openModal(b.dataset.open, b.dataset.eptitle));
  });
  wirePlayers(root);

  root.querySelectorAll('[data-season]').forEach((b) => {
    b.addEventListener('click', () => {
      const si = b.dataset.season;
      root.querySelectorAll('[data-season]').forEach((x) => {
        const on = x === b;
        x.classList.toggle('is-on', on);
        x.setAttribute('aria-pressed', on);
      });
      root.querySelectorAll('[data-seasonbox]').forEach((box) => {
        box.classList.toggle('is-on', box.dataset.seasonbox === si);
      });
    });
  });
}

/* ---------- страница серии ---------- */
function mountWatch() {
  const root = document.querySelector('[data-watch]');
  if (!root) return;
  const q = new URLSearchParams(location.search);
  const p = findProject(q.get('p')) || PROJECTS[0];
  const idx = Math.min(Math.max(parseInt(q.get('e') || '1', 10), 1), p.episodes.length) - 1;
  const ep = p.episodes[idx];
  const prev = p.episodes[idx - 1] ? idx : null;
  const next = p.episodes[idx + 1] ? idx + 2 : null;
  const t = plain(T(ep.title));
  document.title = `${t} / ${plain(T(p.titlePlain))}`;

  /* титры показываем только если они реально известны для этой серии */
  const credits = (ep.credits && Object.keys(ep.credits).length) ? ep.credits : null;

  root.innerHTML = `
    <section class="watch wrap">
      <div class="watch__top">
        <div class="watch__head">
          <span class="label label--accent rise" data-d="300">${plain(T(p.titlePlain))}</span>
          <h1 class="rise h1--watch" data-d="420">${T(ep.n)}${t ? `<br>«${t}»` : ''}</h1>
        </div>
        <p class="lead rise" data-d="900">${T(p.lead)}</p>
      </div>
      <div class="watch__stage rise" data-d="1000">${playerMarkup(ep)}</div>
      ${ep.note ? `<p class="ep__note ep__note--watch rise" data-d="1050">${T(ep.note)}</p>` : ''}
      <div class="credits">
        ${Object.entries(credits || {}).map(([k, rows], i) => `
          <div class="credits__col rise" data-d="${i * 50}">
            <span class="label">${T(k)}</span>
            <ul>${rows.map(([r, a]) => `<li>${a ? `${T(r)} <span>— ${a}</span>` : T(r)}</li>`).join('')}</ul>
          </div>`).join('')}
      </div>
      <div class="pager">
        ${prev ? btn(U('prevEpisode'), `watch.html?p=${p.id}&e=${prev}`, 'bare btn--back') : `<span class="label">${U('firstEpisode')}</span>`}
        ${btn(U('allEpisodes'), `project.html?p=${p.id}#episodes`, 'bare')}
        ${next ? btn(U('nextEpisode'), `watch.html?p=${p.id}&e=${next}`, 'bare') : `<span class="label">${U('noMore')}</span>`}
      </div>
    </section>`;
  wirePlayers(root);
}

/* ---------- плавный скролл по якорям ---------- */
function mountSmoothScroll() {
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href*="#"]');
    if (!a) return;
    const url = new URL(a.href, location.href);
    if (url.pathname !== location.pathname || !url.hash) return;
    const target = document.querySelector(url.hash);
    if (!target) return;
    e.preventDefault();
    target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    history.pushState(null, '', url.hash);
  });

  /* переход с другой страницы: index.html#team — доезжаем плавно */
  if (location.hash) {
    const target = document.querySelector(location.hash);
    if (target) {
      window.scrollTo(0, 0);
      requestAnimationFrame(() => setTimeout(() =>
        target.scrollIntoView({ behavior: 'smooth', block: 'start' }), 120));
    }
  }
}

/* ---------- появления и шапка ---------- */
/* скорость скролла: быстро листаешь — анимация ускоряется, медленно — плавная */
function mountScrollSpeed() {
  const root = document.documentElement;
  let last = window.scrollY, lastT = performance.now(), off = null;
  const onScroll = () => {
    const now = performance.now();
    const dt = Math.max(now - lastT, 1);
    const v = Math.abs(window.scrollY - last) / dt; /* px/ms */
    last = window.scrollY; lastT = now;
    const fast = v > 1.6;
    const rush = v > 3.5;
    root.classList.toggle('is-fast', fast);
    root.classList.toggle('is-rush', rush);
    clearTimeout(off);
    off = setTimeout(() => root.classList.remove('is-fast', 'is-rush'), 220);
  };
  window.addEventListener('scroll', onScroll, { passive: true });
}

function mountMotion() {
  const io = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
    });
  }, { rootMargin: '0px 0px -12% 0px', threshold: .08 });
  document.querySelectorAll('.rise').forEach((el) => {
    if (el.dataset.d) el.style.setProperty('--d', el.dataset.d + 'ms');
    io.observe(el);
  });

  const head = document.querySelector('[data-head]');
  if (!head) return;
  const hero = document.querySelector('.hero');
  const compact = () => window.matchMedia('(max-width:1080px)').matches;
  const limit = () => {
    /* на телефоне подложка нужна сразу при прокрутке — иначе текст просвечивает сквозь шапку */
    if (compact()) return 12;
    return hero
      ? hero.getBoundingClientRect().height - head.getBoundingClientRect().height
      : 40;
  };
  let max = limit();
  const onScroll = () => head.classList.toggle('is-stuck', window.scrollY > max);
  const onResize = () => { max = limit(); onScroll(); };
  onResize();
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
}

function bootModern() {
  mountLangGate();
  mountChrome();
  mountStatic();
  mountHome();
  mountArchive();
  mountProject();
  mountWatch();
  wirePlayers();
  mountSmoothScroll();
  mountScrollSpeed();
  mountMotion();
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootModern);
else bootModern();
