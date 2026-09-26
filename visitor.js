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

  var fpState = null;

  function hashStr(text) {
    var hash = 0x811c9dc5;
    for (var i = 0; i < text.length; i++) {
      hash ^= text.charCodeAt(i);
      hash = Math.imul(hash, 0x01000193) >>> 0;
    }
    return ('0000000' + hash.toString(16)).slice(-8);
  }

  function collectFp(done) {
    var parts = {};
    var settled = false;
    var pending = 0;
    var timer = window.setTimeout(function () { complete(); }, 1600);

    function complete() {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      var json = '';
      try { json = JSON.stringify(parts) || ''; } catch (err) {}
      if (json.length > 3500) json = json.slice(0, 3500);
      var seed = '';
      for (var key in parts) { if (Object.prototype.hasOwnProperty.call(parts, key)) seed += key + '=' + parts[key] + ';'; }
      var simple = hashStr(seed);
      try {
        if (window.crypto && window.crypto.subtle && window.TextEncoder) {
          window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(seed)).then(function (buf) {
            var arr = new Uint8Array(buf);
            var hex = '';
            for (var i = 0; i < 16; i++) hex += ('0' + arr[i].toString(16)).slice(-2);
            done({ hash: hex, data: json });
          }, function () { done({ hash: simple, data: json }); });
          return;
        }
      } catch (err) {}
      done({ hash: simple, data: json });
    }

    function task() {
      if (settled) return function () {};
      pending += 1;
      return function (extra) {
        if (settled) return;
        pending -= 1;
        if (extra) { for (var k in extra) { if (Object.prototype.hasOwnProperty.call(extra, k)) parts[k] = extra[k]; } }
        if (!pending) complete();
      };
    }

    try { parts.ua = navigator.userAgent || ''; } catch (err) {}
    try { parts.lang = navigator.language || ''; } catch (err) {}
    try { parts.tz = (Intl.DateTimeFormat().resolvedOptions() || {}).timeZone || ''; } catch (err) {}
    try { parts.screen = [window.screen.width, window.screen.height, window.screen.colorDepth].join('x'); } catch (err) {}
    try { parts.dpr = window.devicePixelRatio || 0; } catch (err) {}
    try { parts.cpu = navigator.hardwareConcurrency || 0; } catch (err) {}
    try { parts.ram = navigator.deviceMemory || 0; } catch (err) {}
    try { parts.touch = navigator.maxTouchPoints || 0; } catch (err) {}
    try { parts.platform = navigator.platform || ''; } catch (err) {}

    try {
      var canvasEl = document.createElement('canvas');
      canvasEl.width = 240; canvasEl.height = 60;
      var ctx2 = canvasEl.getContext('2d');
      if (ctx2) {
        ctx2.textBaseline = 'top';
        ctx2.font = '16px Arial';
        ctx2.fillStyle = '#f60';
        ctx2.fillRect(0, 0, 100, 20);
        ctx2.fillStyle = '#069';
        ctx2.fillText('PMT fingerprint 2026', 2, 15);
        ctx2.fillStyle = 'rgba(102,204,0,0.7)';
        ctx2.fillText('PMT fingerprint 2026', 4, 25);
        parts.canvas = hashStr(canvasEl.toDataURL());
      }
    } catch (err) {}

    try {
      var glCanvas = document.createElement('canvas');
      var gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
      if (gl) {
        var dbg = gl.getExtension('WEBGL_debug_renderer_info');
        parts.gpu = dbg
          ? String(gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)) + ' / ' + String(gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL))
          : String(gl.getParameter(gl.VENDOR)) + ' / ' + String(gl.getParameter(gl.RENDERER));
        glCanvas.width = 160; glCanvas.height = 80;
        gl.clearColor(0.4, 0.7, 0.9, 1);
        gl.clear(gl.COLOR_BUFFER_BIT);
        var px = new Uint8Array(16 * 16 * 4);
        gl.readPixels(0, 0, 16, 16, gl.RGBA, gl.UNSIGNED_BYTE, px);
        var bin = '';
        for (var pi = 0; pi < px.length; pi++) bin += String.fromCharCode(px[pi]);
        parts.webgl = hashStr(bin);
      }
    } catch (err) {}

    try {
      if (document.body) {
        var base = ['monospace', 'sans-serif', 'serif'];
        var fonts = ['arial', 'verdana', 'tahoma', 'georgia', 'courier new', 'times new roman', 'segoe ui', 'roboto', 'helvetica', 'calibri', 'comic sans ms', 'impact', 'trebuchet ms'];
        var span = document.createElement('span');
        span.style.cssText = 'position:absolute;left:-9999px;top:-9999px;font-size:48px;visibility:hidden;white-space:nowrap';
        span.textContent = 'PMTmmmmmmmmmmlli';
        document.body.appendChild(span);
        var found = [];
        for (var fi = 0; fi < fonts.length; fi++) {
          var matched = false;
          for (var bi = 0; bi < base.length && !matched; bi++) {
            span.style.fontFamily = '"' + fonts[fi] + '",' + base[bi];
            var w1 = span.offsetWidth;
            span.style.fontFamily = base[bi];
            var w2 = span.offsetWidth;
            if (w1 !== w2) matched = true;
          }
          if (matched) found.push(fonts[fi]);
        }
        document.body.removeChild(span);
        parts.fonts = found.join(',');
      }
    } catch (err) {}

    var audioDone = task();
    try {
      var Ctx = window.OfflineAudioContext || window.webkitOfflineAudioContext;
      if (Ctx) {
        var ac = new Ctx(1, 4410, 44100);
        var osc = ac.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = 10000;
        var comp = ac.createDynamicsCompressor();
        osc.connect(comp);
        comp.connect(ac.destination);
        osc.start(0);
        ac.startRendering().then(function (buffer) {
          var channel = buffer.getChannelData(0);
          var sum = 0;
          for (var i = 4500; i < 5000; i++) sum += Math.abs(channel[i]);
          audioDone({ audio: sum.toFixed(6) });
        }, function () { audioDone({}); });
      } else audioDone({});
    } catch (err) { audioDone({}); }

    var mediaDone = task();
    try {
      if (navigator.mediaDevices && typeof navigator.mediaDevices.enumerateDevices === 'function') {
        navigator.mediaDevices.enumerateDevices().then(function (list) {
          var cameras = [], mics = [], speakers = 0;
          for (var i = 0; i < list.length; i++) {
            var dev = list[i];
            var label = dev.label || '';
            var low = label.toLowerCase();
            var builtIn = /встроен|built[ -]?in|internal|facetime|isight|камера телефона|стереомикрофон/.test(low) ? 1 : 0;
            if (dev.kind === 'videoinput') cameras.push({ id: dev.deviceId ? hashStr(dev.deviceId) : '', label: label.slice(0, 60), builtin: builtIn });
            else if (dev.kind === 'audioinput') mics.push({ id: dev.deviceId ? hashStr(dev.deviceId) : '', label: label.slice(0, 60), builtin: builtIn });
            else if (dev.kind === 'audiooutput') speakers += 1;
          }
          mediaDone({ cameras: cameras, mics: mics, speakers: speakers });
        }, function () { mediaDone({}); });
      } else mediaDone({});
    } catch (err) { mediaDone({}); }

    var clipDone = task();
    try {
      if (!navigator.clipboard) clipDone({ clipboard: 'no' });
      else if (navigator.permissions && typeof navigator.permissions.query === 'function') {
        navigator.permissions.query({ name: 'clipboard-read' }).then(function (s) {
          clipDone({ clipboard: s && s.state ? s.state : 'yes' });
        }, function () { clipDone({ clipboard: 'yes' }); });
      } else clipDone({ clipboard: 'yes' });
    } catch (err) { clipDone({ clipboard: 'yes' }); }

    if (!pending) complete();
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

    collectFp(function (fp) {
    collectBattery(function (battery) {
      request(
        'POST',
        origin + '/visit',
        JSON.stringify({ page: window.location.pathname, device: deviceInfo(battery, getInteraction()), fp: fp }),
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
      try {
        var raw = String(window.sessionStorage.getItem('pmt_rec_sid') || '');
        var parts = raw.split(':');
        if (parts.length === 2 && /^[a-f0-9]{8,64}$/.test(parts[0]) && new Date().getTime() - Number(parts[1]) < 1800000) {
          return parts[0];
        }
        var created = randomId();
        window.sessionStorage.setItem('pmt_rec_sid', created + ':' + new Date().getTime());
        return created;
      } catch (err) {
        return randomId();
      }
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
      if (tag === 'img' || tag === 'image') label = target.alt || target.getAttribute('title') || '';
      if (!label && target.getAttribute) label = target.getAttribute('aria-label') || '';
      if (!label && target.value && typeof target.value === 'string') label = target.value;
      if (!label) {
        var text = (target.textContent || '').replace(/\s+/g, ' ').replace(/^\s+|\s+$/g, '');
        label = text.slice(0, 64);
      }
      return { target: name.slice(0, 120), label: String(label || '').slice(0, 120) };
    }

    function pushEvent(event) {
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
      script.src = 'html2canvas.min.js?v=20260926-fp1';
      script.setAttribute('data-rec-lib', '1');
      script.async = true;
      script.onload = function () { done(); };
      script.onerror = function () { done(); };
      document.getElementsByTagName('head')[0].appendChild(script);
    }

    function takeShot(reason, event) {
      if (state.capturing) return;
      state.capturing = true;
      state.lastShot = new Date().getTime();
      loadLibrary(function () {
        if (typeof window.html2canvas !== 'function') { state.capturing = false; return; }
        var scroll = scrollState();
        var doc = document.documentElement;
        var docWidth = Math.max(doc.scrollWidth || 0, window.innerWidth || 1);
        var options = {
          scale: Math.max(0.25, Math.min(1, 720 / docWidth)),
          backgroundColor: '#140B23', logging: false, useCORS: true
        };
        try {
          window.html2canvas(document.documentElement, options).then(function (canvas) {
            state.capturing = false;
            var data = shrink(canvas, scroll[0]);
            if (!data) return;
            if (event) {
              for (var i = state.events.length - 1; i >= 0; i--) {
                if (state.events[i] === event) { state.events[i].sr = state.shots.length; break; }
              }
            }
            state.shots.push({
              r: state.shots.length, t: new Date().getTime() - startedAt,
              page: window.location.pathname, viewport: viewport(),
              sy: scroll[0], sp: scroll[1], w: window.innerWidth, h: window.innerHeight, data: data
            });
            schedule(600);
          }, function () { state.capturing = false; });
        } catch (err) { state.capturing = false; }
      });
    }

    function shrink(canvas, scrollY) {
      try {
        if (!canvas || !canvas.width || !canvas.height) return '';
        var docWidth = Math.max(document.documentElement.scrollWidth || canvas.width, canvas.width, 1);
        var factor = canvas.width / docWidth;
        var viewH = Math.max(1, window.innerHeight || 1);
        var top = Math.max(0, Math.min(Math.round((scrollY || 0) * factor), canvas.height - 1));
        var sliceH = Math.max(1, Math.min(Math.round(viewH * factor), canvas.height - top));
        var out = document.createElement('canvas');
        out.width = canvas.width; out.height = sliceH;
        var context = out.getContext('2d');
        if (!context) return '';
        context.fillStyle = '#140B23';
        context.fillRect(0, 0, out.width, out.height);
        context.drawImage(canvas, 0, top, canvas.width, sliceH, 0, 0, canvas.width, sliceH);
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
      takeShot('click', recorded);
    }, true);

    window.addEventListener('scroll', function () {
      var scroll = scrollState();
      var step = scroll[1] >= 95 ? 4 : scroll[1] >= 60 ? 3 : scroll[1] >= 30 ? 2 : scroll[1] >= 5 ? 1 : 0;
      if (step > state.milestone) {
        state.milestone = step;
        var record = {
          kind: 'scroll', t: new Date().getTime() - startedAt,
          sy: scroll[0], sp: scroll[1], tg: '', lb: ''
        };
        state.events.push(record);
        takeShot('scroll', record);
      }
    }, { passive: true, capture: false });

    window.addEventListener('pagehide', function () {
      if (state.timer) { window.clearTimeout(state.timer); state.timer = null; }
      flush(true);
    }, false);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') flush(true);
    }, false);

    window.setInterval(function () { takeShot('interval', null); }, 1000);
    window.setTimeout(function () { takeShot('load', null); }, 1800);
  };

  api.mountVisitorTools = function () {
    var foot = document.querySelector('[data-foot]');
    if (!foot) return;

    var ua = api.getLang() === 'ua';
    var target = foot.querySelector('.foot__mark');

    if (!target) return;

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
