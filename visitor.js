/* Shared ES5 client for modern browsers and compatibility mode. */
(function (window, document, api) {
  'use strict';
  var config = window.PMT_SITE_CONFIG || {};
  var origin = String(config.workerUrl || '').replace(/\/+$/, '');
  if (!/^https:\/\/[a-z0-9.-]+(?::[0-9]+)?$/i.test(origin)) origin = '';
  var started = false, finished = false, callbacks = [];
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
      if (body !== null) xhr.setRequestHeader('Content-Type', 'text/plain;charset=UTF-8');
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status < 200 || xhr.status >= 300) { settle(null); return; }
        if (!json) { settle(xhr.responseText); return; }
        try { settle(JSON.parse(xhr.responseText)); } catch (err) { settle(null); }
      };
      xhr.onerror = xhr.ontimeout = function () { settle(null); };
      xhr.send(body);
    } catch (err) { settle(null); }
  }
  function finish(country) {
    if (finished) return;
    finished = true;
    api.geoCountry = countryCode(country);
    var pending = callbacks;
    callbacks = [];
    for (var i = 0; i < pending.length; i++) pending[i]();
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
    request('GET', 'https://ipwho.is/?fields=success,country_code', null, true, function (data) {
      complete(data && data.success !== false ? data.country_code : '');
    });
    request('GET', 'https://ipapi.co/country/', null, false, complete);
  }
  api.detectCountry = function (done) {
    if (finished) { done(); return; }
    callbacks.push(done);
    if (started) return;
    started = true;
    /* Do not cache the country: a VPN or network can change between page loads. */
    if (!origin) { fallback(); return; }
    request('POST', origin + '/visit', JSON.stringify({ page: window.location.pathname }), true, function (data) {
      var country = countryCode(data && data.country);
      if (country) finish(country);
      else fallback();
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
      if (origin) window.location.href = origin + '/admin';
      else window.alert(ua
        ? 'Журнал ще не підключено. Вкажіть адресу Worker у site-config.js.'
        : 'Журнал ещё не подключён. Укажите адрес Worker в site-config.js.');
    }, false);
  };
}(window, document, PMT));
