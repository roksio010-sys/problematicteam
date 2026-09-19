/* Shared ES5 client for modern browsers and compatibility mode. */
(function (window, document, api) {
  'use strict';
  var config = window.PMT_SITE_CONFIG || {};
  var origin = String(config.workerUrl || '').replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(origin)) origin = '';
  var started = false, finished = false, callbacks = [];
  var getInteraction = collectInteraction();

  function countryCode(value) {
    var code = String(value || '').replace(/^\s+|\s+$/g, '').toUpperCase();
    return /^[A-Z]{2}$/.test(code) && code !== 'XX' ? code : '';
  }

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
    api.geoCountry = countryCode(country);

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
          if (country) finish(country);
          else fallback();
        }
      );
    });
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
