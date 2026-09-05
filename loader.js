/* Sequential loading works with old WebKit and cached scripts. No Promise/fetch. */
(function (window, document) {
  'use strict';
  var head = document.getElementsByTagName('head')[0];
  function failure(file) {
    var box = document.createElement('p');
    box.style.cssText = 'position:relative;z-index:1002;padding:24px;background:#140B23;color:#fff';
    box.appendChild(document.createTextNode('Не удалось загрузить / Не вдалося завантажити: ' + file + '. Обновите страницу / Оновіть сторінку.'));
    document.body.insertBefore(box, document.body.firstChild);
  }
  function load(file, done) {
    var script = document.createElement('script'), finished = false;
    script.src = file;
    script.async = false;
    script.onload = script.onreadystatechange = function () {
      if (!finished && (!script.readyState || /loaded|complete/.test(script.readyState))) {
        finished = true;
        script.onload = script.onreadystatechange = null;
        if (done) done();
      }
    };
    script.onerror = function () { if (!finished) { finished = true; failure(file); } };
    head.appendChild(script);
  }
  if (!PMT.legacy) {
    var font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=Onest:wght@300;400&display=swap';
    head.appendChild(font);
  }
  load('data.js', function () { load(PMT.legacy ? 'script.legacy.js' : 'script.js'); });
}(window, document));
