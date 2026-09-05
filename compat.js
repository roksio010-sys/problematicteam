/* PMT: ES5 helpers. Loaded before content and application code. */
(function (window, document) {
  'use strict';
  var root = document.documentElement;
  var api = {};
  var css = window.CSS;
  api.legacy = !(css && css.supports &&
    css.supports('display', 'grid') && css.supports('color', 'var(--test)') &&
    css.supports('width', 'clamp(1px, 2vw, 3px)') &&
    css.supports('aspect-ratio', '16 / 9') && css.supports('padding-inline', '1px') &&
    css.supports('inset', '0'));
  root.className += api.legacy ? ' legacy' : ' modern';
  /* Declare semantic elements for older engines. */
  var tags = 'main header footer section article aside nav figure figcaption video'.split(' ');
  for (var t = 0; t < tags.length; t++) document.createElement(tags[t]);
  api.each = function (list, fn) {
    for (var i = 0; i < list.length; i++) fn(list[i], i);
  };
  api.find = function (list, fn) {
    for (var i = 0; i < list.length; i++) if (fn(list[i], i)) return list[i];
  };
  api.extend = function (target) {
    for (var i = 1; i < arguments.length; i++) {
      var source = arguments[i] || {};
      for (var key in source) if (Object.prototype.hasOwnProperty.call(source, key)) target[key] = source[key];
    }
    return target;
  };
  api.entries = function (obj) {
    var rows = [], key;
    for (key in obj) if (Object.prototype.hasOwnProperty.call(obj, key)) rows.push([key, obj[key]]);
    return rows;
  };
  api.hasClass = function (el, name) {
    return (' ' + el.className + ' ').indexOf(' ' + name + ' ') !== -1;
  };
  api.toggleClass = function (el, name, on) {
    if (on && !api.hasClass(el, name)) el.className += ' ' + name;
    if (!on && api.hasClass(el, name)) {
      el.className = (' ' + el.className + ' ').replace(' ' + name + ' ', ' ').replace(/^\s+|\s+$/g, '');
    }
  };
  api.decode = function (s) {
    try { return decodeURIComponent(String(s).replace(/\+/g, ' ')); } catch (err) { return s; }
  };
  api.query = function (search) {
    var parts = (search == null ? window.location.search : search).replace(/^\?/, '').split('&');
    return { get: function (key) {
      for (var i = 0; i < parts.length; i++) {
        var eq = parts[i].indexOf('=');
        var k = eq < 0 ? parts[i] : parts[i].slice(0, eq);
        if (api.decode(k) === key) return api.decode(eq < 0 ? '' : parts[i].slice(eq + 1));
      }
      return null;
    } };
  };
  api.validLang = function (lang) { return lang === 'ru' || lang === 'ua'; };
  api.getLang = function () {
    var lang = api.query().get('lang');
    if (api.validLang(lang)) return lang;
    try {
      lang = window.localStorage.getItem('pmt-lang');
      if (api.validLang(lang)) return lang;
    } catch (err) { /* Safari private mode, disabled storage, file: URLs. */ }
    try {
      var cookie = document.cookie.match(/(?:^|;\s*)pmt-lang=(ru|ua)(?:;|$)/);
      if (cookie) return cookie[1];
    } catch (err2) { /* Storage is optional. */ }
    return null;
  };
  api.saveLang = function (lang) {
    try { window.localStorage.setItem('pmt-lang', lang); } catch (err) {}
    try { document.cookie = 'pmt-lang=' + lang + '; path=/; expires=Tue, 19 Jan 2038 03:14:07 GMT; SameSite=Lax'; } catch (err2) {}
  };
  api.withLang = function (href, lang) {
    var bits = href.split('#'), address = bits[0], q = address.indexOf('?');
    var base = q < 0 ? address : address.slice(0, q);
    var items = q < 0 ? [] : address.slice(q + 1).split('&');
    var kept = [];
    for (var i = 0; i < items.length; i++) {
      if (items[i] && api.decode(items[i].split('=')[0]) !== 'lang') kept.push(items[i]);
    }
    kept.push('lang=' + encodeURIComponent(lang));
    return base + '?' + kept.join('&') + (bits.length > 1 ? '#' + bits.slice(1).join('#') : '');
  };
  api.scrollY = function () { return window.pageYOffset || root.scrollTop || document.body.scrollTop || 0; };
  api.raf = function (fn) {
    var raf = window.requestAnimationFrame || window.webkitRequestAnimationFrame;
    return raf ? raf.call(window, fn) : window.setTimeout(fn, 16);
  };
  api.escape = function (value) {
    return String(value == null ? '' : value).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  };
  api.safeMedia = function (value) {
    value = String(value || '');
    /* Local relative paths or HTTP(S), never executable URL schemes. */
    return /^(?:https?:\/\/|(?:\.\.?\/|\/)?[^\s:<>]+$)/i.test(value) ? value : '';
  };
  window.PMT = api;
}(window, document));
