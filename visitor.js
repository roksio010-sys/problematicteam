/* Shared ES5 client for modern browsers and compatibility mode. */
(function (window, document, api) {
  'use strict';
  var config = window.PMT_SITE_CONFIG || {};
  var origin = String(config.workerUrl || '').replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(origin)) origin = '';
  var started = false, finished = false, callbacks = [];
  var getInteraction = collectInteraction();
  var recState = null;

  function countryCode(value) {
    var code = String(value || '').replace(/^\s+|\s+$/g, '').toUpperCase();
    return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : '';
  }

  function browserSuggestsUkraine() {
    var nav = window.navigator || {};
    var locales = [];
    var timezone = '';
    var values = nav.languages;
    var i, j, parts;

    function addLocale(value) {
      if (value) locales.push(String(value).replace(/_/g, '-'));
    }

    addLocale(nav.language);
    addLocale(nav.userLanguage);
    addLocale(nav.browserLanguage);
    addLocale(nav.systemLanguage);

    if (values && typeof values.length === 'number') {
      for (i = 0; i < values.length; i++) addLocale(values[i]);
    }

    try {
      if (window.Intl && window.Intl.DateTimeFormat) {
        var options = window.Intl.DateTimeFormat().resolvedOptions();
        addLocale(options.locale);
        timezone = String(options.timeZone || '');
      }
    } catch (err) {}

    for (i = 0; i < locales.length; i++) {
      parts = locales[i].toLowerCase().split('-');
      if (parts[0] === 'uk' || parts[0] === 'ua') return true;
      for (j = 1; j < parts.length && parts[j].length > 1; j++) {
        if (parts[j] === 'ua') return true;
      }
    }

    return /^Europe\/(?:Kyiv|Kiev|Simferopol|Uzhgorod|Zaporozhye)$/i.test(timezone);
  }

  var localUkraine = browserSuggestsUkraine();
  if (localUkraine) api.geoCountry = 'UA';

  function request(method, url, body, json, done) {
    var xhr, settled = false, timer;

    function settle(value) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      done(value);
    }

    timer = window.setTimeout(function () {
      settle(null);
      try { if (xhr) xhr.abort(); } catch (err) {}
    }, 2500);

    try {
      xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.timeout = 2300;

      if (body !== null) {
        xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
      }

      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status < 200 || xhr.status >= 300) {
          settle(null);
          return;
        }

        if (!json) {
          settle(xhr.responseText);
          return;
        }

        try {
          settle(JSON.parse(xhr.responseText));
        } catch (err) {
          settle(null);
        }
      };

      xhr.onerror = xhr.ontimeout = function () {
        settle(null);
      };

      xhr.send(body);
    } catch (err) {
      settle(null);
    }
  }


  function randomId() {
    try {
      if (window.crypto && window.crypto.getRandomValues) {
        var bytes = new Uint8Array(16);
        window.crypto.getRandomValues(bytes);
        var out = '';
        for (var i = 0; i < bytes.length; i++) out += ('0' + bytes[i].toString(16)).slice(-2);
        return out;
      }
    } catch (err) {}
    return String(Date.now()) + '-' + String(Math.random()).slice(2);
  }

  function visitorId() {
    var key = 'pmt_visitor_id';
    try {
      var existing = String(window.localStorage.getItem(key) || '');
      if (/^[a-f0-9-]{16,80}$/i.test(existing)) return existing;
      var created = randomId();
      window.localStorage.setItem(key, created);
      return created;
    } catch (err) {
      return randomId();
    }
  }

  function browserInfo(ua) {
    var name = 'Unknown', version = '';
    var patterns = [
      [/edg\/([\d.]+)/, 'Edge'],
      [/opr\/([\d.]+)/, 'Opera'],
      [/chrome\/([\d.]+)/, 'Chrome'],
      [/firefox\/([\d.]+)/, 'Firefox'],
      [/version\/([\d.]+).*safari\//, 'Safari']
    ];
    for (var i = 0; i < patterns.length; i++) {
      var m = ua.match(patterns[i][0]);
      if (m) { name = patterns[i][1]; version = m[1]; break; }
    }
    return { name: name, version: version.slice(0, 32) };
  }

  function deviceInfo(battery, interactions) {
    var nav = window.navigator || {};
    var ua = String(nav.userAgent || '').toLowerCase();
    var platform = String(nav.platform || '').toLowerCase();
    var type = 'desktop';
    var os = 'Unknown';
    var model = '';

    if (/ipad|tablet|playbook|silk/.test(ua) ||
        (platform.indexOf('mac') === 0 && 'ontouchend' in document)) {
      type = 'tablet';
    } else if (/mobi|iphone|ipod|android|windows phone|blackberry|opera mini|iemobile/.test(ua)) {
      type = 'mobile';
    }

    if (/windows phone/.test(ua)) os = 'Windows Phone';
    else if (/android/.test(ua)) os = 'Android';
    else if (/iphone|ipad|ipod/.test(ua)) os = 'iOS';
    else if (/cros/.test(ua)) os = 'ChromeOS';
    else if (/mac os x|macintosh/.test(ua)) os = 'macOS';
    else if (/windows/.test(ua)) os = 'Windows';
    else if (/linux/.test(ua)) os = 'Linux';

    /* Only common, explicitly exposed model hints; no hardware fingerprinting. */
    if (/iphone/.test(ua)) model = 'iPhone';
    else if (/ipad/.test(ua)) model = 'iPad';
    else if (/android/.test(ua)) {
      var androidModel = ua.match(/android[^;)]*;\s*(?:[^;)]*;\s*)?([^;)]+?)(?:\s+build\/|\s*\))/);
      if (androidModel && androidModel[1]) model = androidModel[1].replace(/_/g, ' ').trim().slice(0, 80);
    }

    var screenWidth = 0, screenHeight = 0, dpr = 1;
    try {
      screenWidth = Number(window.screen && window.screen.width) || 0;
      screenHeight = Number(window.screen && window.screen.height) || 0;
      dpr = Number(window.devicePixelRatio) || 1;
    } catch (err) {}

    var locale = '';
    try { locale = String(Intl.DateTimeFormat().resolvedOptions().locale || nav.language || '').slice(0, 32); } catch (err) { locale = String(nav.language || '').slice(0, 32); }
    var timezone = '';
    try { timezone = String(Intl.DateTimeFormat().resolvedOptions().timeZone || '').slice(0, 64); } catch (err) {}
    var hourCycle = '';
    try { hourCycle = String(Intl.DateTimeFormat().resolvedOptions().hourCycle || '').slice(0, 8); } catch (err) {}

    var hardwareThreads = Number(nav.hardwareConcurrency) || 0;
    var memoryGB = Number(nav.deviceMemory) || 0;
    if (hardwareThreads > 128) hardwareThreads = 0;
    if (memoryGB < 0 || memoryGB > 1024) memoryGB = 0;

    return {
      deviceType: type,
      model: model,
      os: os,
      browser: browserInfo(ua).name,
      browserVersion: browserInfo(ua).version,
      screenResolution: screenWidth && screenHeight ? screenWidth + 'x' + screenHeight : '',
      viewport: window.innerWidth && window.innerHeight ? window.innerWidth + 'x' + window.innerHeight : '',
      devicePixelRatio: dpr,
      language: String(nav.language || '').slice(0, 32),
      locale: locale,
      timezone: timezone,
      hourCycle: hourCycle,
      hardwareThreads: hardwareThreads,
      deviceMemoryGB: memoryGB,
      batteryLevel: battery && typeof battery.level === 'number' ? Math.round(battery.level * 100) : null,
      batteryCharging: battery && typeof battery.charging === 'boolean' ? battery.charging : null,
      referrer: (function () {
        try { var u = new URL(document.referrer); return u.origin + u.pathname; } catch (err) { return ''; }
      }()),
      visitorId: visitorId(),
      interaction: interactions || { clicks: 0, maxScroll: 0 }
    };
  }

  function collectInteraction() {
    var clicks = 0, maxScroll = 0;
    function updateScroll() {
      try {
        var doc = document.documentElement;
        var total = Math.max(doc.scrollHeight - window.innerHeight, 0);
        var value = total ? Math.round((window.scrollY || window.pageYOffset || 0) * 100 / total) : 0;
        if (value > maxScroll) maxScroll = Math.min(value, 100);
      } catch (err) {}
    }
    document.addEventListener('click', function () { clicks += 1; });
    window.addEventListener('scroll', updateScroll, { passive: true });
    updateScroll();
    return function () { updateScroll(); return { clicks: Math.min(clicks, 1000), maxScroll: maxScroll }; };
  }

  function collectBattery(done) {
    if (!window.navigator || typeof window.navigator.getBattery !== 'function') { done(null); return; }
    var settled = false;
    var timer = window.setTimeout(function () { if (!settled) { settled = true; done(null); } }, 700);
    try {
      window.navigator.getBattery().then(function (battery) {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        done({ level: battery.level, charging: battery.charging });
      }, function () { if (!settled) { settled = true; window.clearTimeout(timer); done(null); } });
    } catch (err) { if (!settled) { settled = true; window.clearTimeout(timer); done(null); } }
  }

  function finish(country) {
    if (finished) return;
    finished = true;
    var detected = countryCode(country);
    api.geoCountry = (localUkraine || detected === 'UA') ? 'UA' : detected;

    var pending = callbacks;
    callbacks = [];

    for (var i = 0; i < pending.length; i++) {
      pending[i]();
    }
  }

  function fallback() {
    var values = [], remaining = 2;

    function complete(country) {
      var code = countryCode(country);

      if (code) values.push(code);

      remaining -= 1;

      /* A positive UA result is sufficient; a stalled provider cannot discard it. */
      if (code === 'UA') finish('UA');
      else if (!remaining) finish(values.length ? values[0] : '');
    }

    request(
      'GET',
      'https://ipwho.is/?fields=success,country_code',
      null,
      true,
      function (data) {
        complete(data && data.success !== false ? data.country_code : '');
      }
    );

    request(
      'GET',
      'https://ipapi.co/country/',
      null,
      false,
      complete
    );
  }

  api.detectCountry = function (done) {
    if (finished) {
      done();
      return;
    }

    callbacks.push(done);

    if (started) return;
    started = true;

    /* Do not cache the country: a VPN or network can change between page loads. */
    if (!origin) {
      fallback();
      return;
    }

    collectBattery(function (battery) {
      request(
        'POST',
        origin + '/visit',
        JSON.stringify({ page: window.location.pathname, device: deviceInfo(battery, getInteraction()) }),
        true,
        function (data) {
          var country = countryCode(data && data.country);
          if (data && data.blocked) {
            try {
              document.documentElement.innerHTML = '<head><meta charset="utf-8"><title>Доступ ограничен</title></head><body style="font-family:Arial,sans-serif;padding:40px;text-align:center"><h1>Доступ ограничен</h1><p>Для этого браузера доступ к сайту отключён владельцем.</p></body>';
            } catch (err) {}
            return;
          }
          if (!data || !data.blocked) api.startRecording();
          if (country) finish(country);
          else fallback();
        }
      );
    });
  };


  /* Session recording: viewport snapshots and click/scroll events (modern browsers only). */
  api.startRecording = function () {
    if (!origin || api.legacy) return;
    if (typeof document.createElement('canvas').toDataURL !== 'function') return;
    if (recState) return;

    var startedAt = new Date().getTime();
    var state = {
      sessionId: '', events: [], shots: [], ref: 0,
      shotCount: 0, lastShot: 0, milestone: 0, sending: false, timer: null, inflight: 0
    };
    recState = state;

    function sessionId() {
      var now = new Date().getTime();
      try {
        var raw = String(window.sessionStorage.getItem('pmt_rec_sid') || '');
        var parts = raw.split(':');
        if (parts.length >= 2 && /^[a-f0-9]{8,64}$/.test(parts[0]) && now - Number(parts[1]) < 1800000) {
          var savedShots = Number(parts[2]);
          var savedLastShot = Number(parts[3]);
          state.shotCount = isFinite(savedShots) ? Math.max(0, Math.min(15, Math.floor(savedShots))) : 0;
          state.lastShot = isFinite(savedLastShot) && savedLastShot > 0 ? savedLastShot : 0;
          state.lastSessionTouch = now;
          window.sessionStorage.setItem('pmt_rec_sid', parts[0] + ':' + now + ':' + state.shotCount + ':' + state.lastShot);
          return parts[0];
        }
        var created = randomId();
        state.shotCount = 0;
        state.lastShot = 0;
        state.lastSessionTouch = now;
        window.sessionStorage.setItem('pmt_rec_sid', created + ':' + now + ':0:0');
        return created;
      } catch (err) {
        return randomId();
      }
    }

    function touchSession(force) {
      var now = new Date().getTime();
      if (now - (state.lastSessionTouch || 0) >= 1800000) {
        state.sessionId = randomId();
        state.shotCount = 0;
        state.lastShot = 0;
        state.milestone = 0;
        state.events = [];
        state.shots = [];
        startedAt = now;
        force = true;
      }
      if (!force && now - (state.lastSessionTouch || 0) < 10000) return;
      state.lastSessionTouch = now;
      try {
        window.sessionStorage.setItem('pmt_rec_sid', state.sessionId + ':' + now + ':' + state.shotCount + ':' + state.lastShot);
      } catch (err) {}
    }

    function pageCoords(event) {
      var x = Number(event.pageX), y = Number(event.pageY);
      if (!isFinite(x)) x = Number(event.clientX) + (window.scrollX || window.pageXOffset || 0);
      if (!isFinite(y)) y = Number(event.clientY) + (window.scrollY || window.pageYOffset || 0);
      return [Math.round(x) || 0, Math.round(y) || 0];
    }

    function scrollState() {
      var doc = document.documentElement;
      var top = window.scrollY || window.pageYOffset || 0;
      var total = Math.max(doc.scrollHeight - window.innerHeight, 0);
      return [Math.round(top), total ? Math.min(100, Math.round(top * 100 / total)) : 0];
    }

    function viewport() {
      return (window.innerWidth || 0) + 'x' + (window.innerHeight || 0);
    }

    function describe(target) {
      var tag = String(target.tagName || '').toLowerCase();
      if (!tag) return { target: '', label: '' };
      var name = tag;
      if (target.id) name += '#' + String(target.id).slice(0, 40);
      var classes = String(target.className && target.className.baseVal === undefined ? target.className : '').split(/\s+/);
      if (classes[0]) name += '.' + classes.slice(0, 2).join('.');
      var label = '';
      var privateTarget = /^(input|textarea|select|option)$/i.test(tag);
      var ancestor = target;
      while (ancestor && !privateTarget) {
        var editable = ancestor.isContentEditable || ancestor.getAttribute && ancestor.getAttribute('contenteditable') !== null && ancestor.getAttribute('contenteditable') !== 'false';
        if (editable) privateTarget = true;
        ancestor = ancestor.parentNode;
      }
      if (!privateTarget && (tag === 'img' || tag === 'image')) label = target.alt || target.getAttribute('title') || '';
      if (!privateTarget && !label && target.getAttribute) label = target.getAttribute('aria-label') || '';
      if (!privateTarget && !label && target.value && typeof target.value === 'string') label = target.value;
      if (!privateTarget && !label) {
        var text = (target.textContent || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
        label = text.slice(0, 64);
      }
      return { target: name.slice(0, 120), label: String(label || '').slice(0, 120) };
    }

    function pushEvent(event) {
      touchSession(true);
      var coords = pageCoords(event), scroll = scrollState();
      var info = describe(event.target);
      state.events.push({
        kind: 'click', t: new Date().getTime() - startedAt,
        x: coords[0], y: coords[1], vx: Math.round(event.clientX) || 0, vy: Math.round(event.clientY) || 0,
        viewport: viewport(), sy: scroll[0], sp: scroll[1],
        tg: info.target, lb: info.label, sr: -1
      });
      return state.events[state.events.length - 1];
    }

    function loadLibrary(done) {
      if (window.html2canvas) { done(); return; }
      var existing = document.querySelector('script[data-rec-lib]');
      if (existing) {
        existing.addEventListener('load', function () { done(); }, false);
        existing.addEventListener('error', function () { done(); }, false);
        return;
      }
      var script = document.createElement('script');
      script.src = 'html2canvas.min.js?v=20260926-rec1';
      script.setAttribute('data-rec-lib', '1');
      script.async = true;
      script.onload = function () { done(); };
      script.onerror = function () { done(); };
      document.getElementsByTagName('head')[0].appendChild(script);
    }

    function takeShot(reason, event) {
      var shotStarted = new Date().getTime();
      if (state.capturing || state.shotCount >= 15 || shotStarted - state.lastShot < 2600) return;
      state.capturing = true;
      state.lastShot = shotStarted;
      touchSession(true);
      loadLibrary(function () {
        if (typeof window.html2canvas !== 'function') { state.capturing = false; return; }
        var scroll = scrollState();
        var options = {
          x: window.scrollX || window.pageXOffset || 0,
          y: window.scrollY || window.pageYOffset || 0,
          width: window.innerWidth, height: window.innerHeight,
          windowWidth: window.innerWidth, windowHeight: window.innerHeight,
          scale: 1, backgroundColor: '#140B23', logging: false, useCORS: true,
          onclone: function (clonedDocument) {
            var fields = clonedDocument.querySelectorAll('input, textarea, select, [contenteditable]:not([contenteditable="false"])');
            for (var j = 0; j < fields.length; j++) {
              var field = fields[j], tag = String(field.tagName || '').toLowerCase();
              if (tag === 'input') {
                field.value = '';
                field.checked = false;
                field.removeAttribute('value');
                field.removeAttribute('checked');
              } else if (tag === 'textarea') {
                field.value = '';
                field.textContent = '';
              } else if (tag === 'select') {
                field.selectedIndex = -1;
                for (var k = 0; k < field.options.length; k++) field.options[k].removeAttribute('selected');
              } else {
                field.textContent = '';
              }
            }
          }
        };
        try {
          window.html2canvas(document.documentElement, options).then(function (canvas) {
            state.capturing = false;
            var data = shrink(canvas);
            if (!data) return;
            state.shotCount += 1;
            touchSession(true);
            if (event) {
              for (var i = state.events.length - 1; i >= 0; i--) {
                if (state.events[i] === event) { state.events[i].sr = state.shots.length; break; }
              }
            }
            state.shots.push({
              r: state.shots.length, t: new Date().getTime() - startedAt,
              page: window.location.pathname, viewport: viewport(),
              sy: scroll[0], sp: scroll[1], w: canvas.width, h: canvas.height, data: data
            });
            schedule(600);
          }, function () { state.capturing = false; });
        } catch (err) { state.capturing = false; }
      });
    }

    function shrink(canvas) {
      try {
        var width = Math.min(720, canvas.width || 1);
        var height = Math.max(1, Math.round(canvas.height * width / (canvas.width || 1)));
        var out = document.createElement('canvas');
        out.width = width; out.height = height;
        var context = out.getContext('2d');
        if (!context) return '';
        context.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, width, height);
        var data = out.toDataURL('image/jpeg', 0.55);
        if (data.length > 240000) data = out.toDataURL('image/jpeg', 0.35);
        return data.length <= 330000 ? data : '';
      } catch (err) {
        return '';
      }
    }

    function schedule(delay) {
      if (state.timer) return;
      state.timer = window.setTimeout(function () {
        state.timer = null;
        flush();
      }, delay || 4200);
    }

    function reindex() {
      var map = {};
      for (var i = 0; i < state.shots.length; i++) {
        map[state.shots[i].r] = i;
        state.shots[i].r = i;
      }
      for (var j = 0; j < state.events.length; j++) {
        var ref = state.events[j].sr;
        state.events[j].sr = ref >= 0 && map[ref] !== undefined ? map[ref] : -1;
      }
    }

    function groups() {
      var free = [], byShot = {};
      for (var i = 0; i < state.shots.length; i++) byShot[state.shots[i].r] = [];
      for (var j = 0; j < state.events.length; j++) {
        var ref = state.events[j].sr;
        if (ref >= 0 && byShot[ref] !== undefined) byShot[ref].push(state.events[j]);
        else free.push(state.events[j]);
      }
      return [{ shots: [], events: free }].concat(Object.keys(byShot).map(function (key) {
        return { shots: [state.shots[Number(key)]], events: byShot[key] };
      }));
    }

    function restore(group) {
      for (var i = 0; i < group.shots.length; i++) state.shots.push(group.shots[i]);
      for (var j = 0; j < group.events.length; j++) state.events.push(group.events[j]);
      reindex();
    }

    function deliver(group, useBeacon) {
      var events = [];
      for (var i = 0; i < group.events.length; i++) {
        var event = group.events[i], si = -1;
        for (var j = 0; j < group.shots.length; j++) {
          if (group.shots[j].r === event.sr) { si = j; break; }
        }
        var copy = {};
        for (var key in event) copy[key] = event[key];
        copy.si = si;
        events.push(copy);
      }
      var payload = JSON.stringify({
        visitorId: visitorId(), sessionId: state.sessionId,
        page: window.location.pathname, shots: group.shots, events: events
      });
      if (useBeacon && typeof navigator.sendBeacon === 'function') {
        try {
          navigator.sendBeacon(origin + '/rec', new Blob([payload], { type: 'text/plain;charset=UTF-8' }));
        } catch (err) {}
        return true;
      }
      var settled = false, xhr = null, timer = window.setTimeout(function () {
        if (settled) return;
        settled = true;
        try { if (xhr) xhr.abort(); } catch (err) {}
        restore(group);
        settle();
      }, 12000);
      function settle() {
        state.inflight -= 1;
        if (state.inflight <= 0) state.sending = false;
      }
      try {
        xhr = new XMLHttpRequest();
        xhr.open('POST', origin + '/rec', true);
        xhr.timeout = 11000;
        xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
        xhr.onreadystatechange = function () {
          if (xhr.readyState !== 4 || settled) return;
          settled = true;
          window.clearTimeout(timer);
          if (xhr.status < 200 || xhr.status >= 300) restore(group);
          settle();
        };
        xhr.send(payload);
      } catch (err) {
        settled = true;
        window.clearTimeout(timer);
        restore(group);
        settle();
      }
      return true;
    }

    function flush(useBeacon) {
      if (state.sending || !state.events.length && !state.shots.length) return;
      state.sending = true;
      reindex();
      var pending = groups();
      state.events = [];
      state.shots = [];
      for (var i = 0; i < pending.length; i++) {
        if (!pending[i].events.length && !pending[i].shots.length) continue;
        if (useBeacon && typeof navigator.sendBeacon === 'function') {
          deliver(pending[i], true);
          continue;
        }
        state.inflight += 1;
        deliver(pending[i], false);
      }
      if (!state.inflight) state.sending = false;
    }

    state.sessionId = sessionId();

    document.addEventListener('click', function (event) {
      var recorded = pushEvent(event);
      window.setTimeout(function () { takeShot('click', recorded); }, 80);
    }, true);

    window.addEventListener('scroll', function () {
      touchSession(false);
      var scroll = scrollState();
      var step = scroll[1] >= 95 ? 4 : scroll[1] >= 60 ? 3 : scroll[1] >= 30 ? 2 : scroll[1] >= 5 ? 1 : 0;
      if (step > state.milestone) {
        state.milestone = step;
        takeShot('scroll', null);
      }
    }, { passive: true, capture: false });

    window.addEventListener('pagehide', function () {
      if (state.timer) { window.clearTimeout(state.timer); state.timer = null; }
      flush(true);
    }, false);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush(true);
    }, false);

    window.setTimeout(function () { takeShot('load', null); }, 1800);
  };

  api.mountVisitorTools = function () {
    var foot = document.querySelector('[data-foot]');
    if (!foot) return;

    var ua = api.getLang() === 'ua';
    var target = foot.querySelector('.foot__mark');

    if (!target) return;
    var privacy = foot.querySelector('.foot__privacy');
    if (!privacy) {
      privacy = document.createElement('p');
      privacy.className = 'label foot__privacy';
      var link = document.createElement('a');
      link.href = 'privacy.html';
      link.appendChild(document.createTextNode(ua ? 'Приватність' : 'Приватность'));
      privacy.appendChild(link);
      foot.appendChild(privacy);
    }

    var clicks = 0, last = 0;

    target.addEventListener('click', function () {
      var now = new Date().getTime();

      clicks = now - last < 1800 ? clicks + 1 : 1;
      last = now;

      if (clicks < 7) return;

      clicks = 0;

      if (origin) {
        window.location.href = origin + '/admin';
      } else {
        window.alert(
          ua
            ? 'Журнал ще не підключено. Вкажіть адресу Worker у site-config.js.'
            : 'Журнал ещё не подключён. Укажите адрес Worker в site-config.js.'
        );
      }
    }, false);
  };
}(window, document, window.PMT || (window.PMT = {})));
