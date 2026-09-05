var LANGS = { ru: "Русский", ua: "Українська" };
var LS_KEY = "pmt-lang";
function getLang() {
  var v = PMT.getLang();
  return v === "ru" || v === "ua" ? v : null;
}
var LANG = getLang() || "ru";
function T(x) {
  var _a, _b;
  if (x == null) return "";
  if (typeof x === "object") return (_b = (_a = x[LANG]) != null ? _a : x.ru) != null ? _b : "";
  if (LANG === "ua" && Object.prototype.hasOwnProperty.call(DICT, x)) return DICT[x];
  return x;
}
var U = function(k) {
  return T(UI[k]);
};
var plain = function(s) {
  return String(s).replace(/<br\s*\/?>/gi, " ").replace(/&nbsp;/g, " ");
};
var nn = function(i) {
  return (i + 1 < 10 ? "0" : "") + (i + 1);
};
var metaFirst = function(p) {
  return p.meta && p.meta[0] ? T(p.meta[0][1]) : T(p.kind);
};
var isParts = function(p) {
  return /Комикс|Комікс/i.test(String(p.kind || ""));
};
var unitOne = function(p) {
  return isParts(p) ? U("onePart") : U("oneEpisode");
};
var unitMany = function(p) {
  return isParts(p) ? U("partsLabel") : U("episodesLabel");
};
var PLURALS = {
  ru: { ep: ["серия", "серии", "серий"], part: ["часть", "части", "частей"] },
  ua: { ep: ["серія", "серії", "серій"], part: ["частина", "частини", "частин"] }
};
function pluralForm(n) {
  var n10 = n % 10, n100 = n % 100;
  if (n10 === 1 && n100 !== 11) return 0;
  if (n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14)) return 1;
  return 2;
}
function countLabel(p) {
  var n = p.episodes.length;
  if (!n) return "";
  var table = PLURALS[LANG] || PLURALS.ru;
  var forms = isParts(p) ? table.part : table.ep;
  return n + " " + forms[pluralForm(n)];
}
var nameOf = function(m) {
  return LANG === "ua" && typeof NAMES_UA !== "undefined" && NAMES_UA[m.name] || m.name;
};
function pairedId(id, toLang) {
  if (!id || typeof LANG_PAIRS === "undefined") return null;
  var row = PMT.find(LANG_PAIRS, function(r) {
    return r[0] === id || r[1] === id;
  });
  if (!row) return null;
  return toLang === "ua" ? row[1] : row[0];
}
function setLang(lang, reload, keepPage) {
  if (typeof reload === "undefined") reload = true;
  if (typeof keepPage === "undefined") keepPage = false;
  if (!PMT.validLang(lang)) return;
  PMT.saveLang(lang);
  if (!reload) return;
  var file = location.pathname.split("/").pop();
  var target = location.href;
  if (!keepPage && (file === "project.html" || file === "watch.html")) {
    var next = pairedId(PMT.query().get("p"), lang);
    target = next ? "project.html?p=" + encodeURIComponent(next) : "projects.html";
  }
  location.href = PMT.withLang(target, lang);
}
var LOGO = '<img class="logo" src="assets/pmt.png" alt="PMT" width="135" height="62">';
var ARROW = '<svg class="btn__arrow" viewBox="0 0 34 10" fill="none" aria-hidden="true">\n<path d="M0 5h31M26.5 1 32 5l-5.5 4" stroke="currentColor" stroke-width="1.2"/></svg>';
var PLAY = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M7 4.5 20 12 7 19.5z"/></svg>';
var btn = function(text, href, kind, attrs) {
  if (typeof kind === "undefined") kind = "line";
  if (typeof attrs === "undefined") attrs = "";
  return '\n  <a class="btn btn--'.concat(kind, '" href="').concat(href, '" ').concat(attrs, '>\n    <span class="btn__fill" aria-hidden="true"></span>\n    <span class="btn__label">').concat(text, "</span>").concat(ARROW, "\n  </a>");
};
var btnBtn = function(text, kind, attrs) {
  if (typeof attrs === "undefined") attrs = "";
  return '\n  <button class="btn btn--'.concat(kind, '" type="button" ').concat(attrs, '>\n    <span class="btn__fill" aria-hidden="true"></span>\n    <span class="btn__label">').concat(text, "</span>").concat(ARROW, "\n  </button>");
};
function mountLangGate() {
  if (getLang()) return;
  var gate = document.createElement("div");
  gate.className = "gate";
  gate.innerHTML = '\n    <div class="gate__box">\n      '.concat(LOGO, '\n      <h2>Выбери язык<span>Обери мову</span></h2>\n      <div class="gate__row">\n        <button class="btn btn--line" data-lang="ru"><span class="btn__fill"></span><span class="btn__label">Русский</span>').concat(ARROW, '</button>\n        <button class="btn btn--line" data-lang="ua"><span class="btn__fill"></span><span class="btn__label">Українська</span>').concat(ARROW, '</button>\n      </div>\n      <p class="label">Сайт полностью переведён · Сайт повністю перекладено</p>\n    </div>');
  document.body.appendChild(gate);
  PMT.toggleClass(document.documentElement, "is-locked", true);
  PMT.each(gate.querySelectorAll("[data-lang]"), function(b) {
    b.addEventListener("click", function() {
      return setLang(b.getAttribute("data-lang"), true, true);
    });
  });
}
function mountChrome() {
  document.documentElement.lang = LANG === "ua" ? "uk" : "ru";
  var head = document.querySelector("[data-head]");
  if (head) {
    var inner = head.getAttribute("data-head") === "inner";
    var nav = [
      [U("navProjects"), inner ? "projects.html" : "#projects"],
      [U("navTeam"), inner ? "index.html#team" : "#team"]
    ];
    head.innerHTML = '\n      <a class="mark" href="index.html" aria-label="'.concat(U("toHome"), '">').concat(LOGO, '</a>\n      <div class="nav">\n        ').concat(nav.map(function(row) {
      return '<a href="'.concat(row[1], '">').concat(row[0], "</a>");
    }).join(""), '\n        <div class="lang" role="group" aria-label="').concat(U("langTitle"), '">\n          ').concat(Object.keys(LANGS).map(function(k) {
      return '\n            <button type="button" class="lang__btn'.concat(k === LANG ? " is-on" : "", '" data-setlang="').concat(k, '"\n              aria-pressed="').concat(k === LANG, '">').concat(k === "ru" ? "RU" : "UA", "</button>");
    }).join(""), "\n        </div>\n      </div>");
    PMT.each(head.querySelectorAll("[data-setlang]"), function(b) {
      b.addEventListener("click", function() {
        if (b.getAttribute("data-setlang") !== LANG) setLang(b.getAttribute("data-setlang"));
      });
    });
  }
  var foot = document.querySelector("[data-foot]");
  if (foot) {
    foot.innerHTML = '\n      <div class="foot__mark">'.concat(LOGO, '<span class="label">Problematic&nbsp;Team / ').concat(U("archiveShort"), '</span></div>\n      <p class="label foot__note">').concat(U("closed"), '</p>\n      <span class="label">').concat(U("credits"), "</span>");
  }
}
function mountStatic() {
  PMT.each(document.querySelectorAll("[data-t]"), function(el) {
    el.innerHTML = U(el.getAttribute("data-t"));
  });
  var t = document.querySelector("[data-title]");
  if (t) document.title = U(t.getAttribute("data-title"));
}
function mountHome() {
  var why = document.querySelector("[data-why]");
  if (why) why.innerHTML = WHY.map(function(w, i) {
    return '\n    <article class="why__item rise" data-d="'.concat(i * 100, '" tabindex="0">\n      <span class="num">').concat(w.n, "</span>\n      <h3>").concat(LANG === "ua" ? w.tu : w.t, "</h3>\n      <p>").concat(T(w.d), "</p>\n    </article>");
  }).join("");
  var list = document.querySelector("[data-plist]");
  if (list) list.innerHTML = PROJECTS.map(function(p, i) {
    return '\n    <a class="prow rise" data-d="'.concat(i * 50, '" href="project.html?p=').concat(p.id, '">\n      <span class="num prow__num">').concat(nn(i), '</span>\n      <div class="prow__media"><img src="').concat(p.poster, '" alt="').concat(plain(T(p.titlePlain)), '" loading="lazy"></div>\n      <div class="prow__body">\n        <span class="label label--accent">').concat(T(p.kind), "</span>\n        <h3>").concat(T(p.title), '</h3>\n        <div class="prow__meta">\n          <span class="label">').concat(metaFirst(p), "</span>\n          ").concat(countLabel(p) ? '<span class="label">'.concat(countLabel(p), "</span>") : "", "\n        </div>\n      </div>\n    </a>");
  }).join("");
  var team = document.querySelector("[data-team]");
  if (team) team.innerHTML = TEAM.map(function(m, i) {
    return '\n    <div class="team__row rise" data-d="'.concat(Math.min(i, 8) * 50, '">\n      <b>').concat(nameOf(m), "</b><span>").concat(T(m.role), "</span>\n    </div>");
  }).join("");
}
function mountArchive() {
  var grid = document.querySelector("[data-grid]");
  if (!grid) return;
  grid.innerHTML = PROJECTS.map(function(p, i) {
    var year = PMT.find(p.meta, function(m) {
      return ["Год", "Год выпуска", "Премьера", "Рік"].indexOf(m[0]) !== -1;
    }) || null;
    return '\n    <a class="card rise" data-d="'.concat(i * 60, '" href="project.html?p=').concat(p.id, '">\n      <div class="card__media"><img src="').concat(p.poster, '" alt="').concat(plain(T(p.titlePlain)), '" loading="lazy"></div>\n      <div class="card__body">\n        <span class="num">').concat(nn(i), " / ").concat(T(p.kind), "</span>\n        <h3>").concat(T(p.title), '</h3>\n      </div>\n      <div class="card__hair"></div>\n      ').concat(countLabel(p) || year ? '<div class="card__body"><p class="label">'.concat([countLabel(p), year ? T(year[1]) : ""].filter(Boolean).join(" / "), "</p></div>") : "", "\n    </a>");
  }).join("");
}
var modal = null;
function ensureModal() {
  if (modal) return modal;
  modal = document.createElement("div");
  modal.className = "modal";
  modal.innerHTML = '\n    <div class="modal__bar">\n      <span class="label" data-modal-title></span>\n      <button class="modal__x" type="button" aria-label="'.concat(U("closePlayer"), '">\n        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5l14 14M19 5L5 19" stroke="currentColor" stroke-width="1.4" fill="none"/></svg>\n      </button>\n    </div>\n    <div class="modal__stage" data-modal-stage></div>');
  document.body.appendChild(modal);
  modal.querySelector(".modal__x").addEventListener("click", closeModal);
  modal.addEventListener("click", function(e) {
    if (e.target === modal) closeModal();
  });
  document.addEventListener("keydown", function(e) {
    if (e.key === "Escape" || e.keyCode === 27) closeModal();
  });
  return modal;
}
function openModal(id, title) {
  var m = ensureModal();
  m.querySelector("[data-modal-title]").textContent = title;
  m.querySelector("[data-modal-stage]").innerHTML = '<iframe src="https://kinescope.io/embed/'.concat(id, '?autoplay=1"\n      allow="autoplay; fullscreen; picture-in-picture; encrypted-media; clipboard-write; screen-wake-lock;"\n      allowfullscreen title="').concat(title, '"></iframe>');
  PMT.toggleClass(m, "is-open", true);
  PMT.toggleClass(document.documentElement, "is-locked", true);
}
function closeModal() {
  if (!modal || !PMT.hasClass(modal, "is-open")) return;
  PMT.toggleClass(modal, "is-open", false);
  modal.querySelector("[data-modal-stage]").innerHTML = "";
  PMT.toggleClass(document.documentElement, "is-locked", false);
}
function playerMarkup(ep) {
  var title = PMT.escape(plain(T(ep.title)));
  var poster = PMT.escape(PMT.legacy && ep.posterLegacy || ep.poster || "assets/compat/placeholder.png");
  var mp4 = PMT.safeMedia(ep.mp4), hls = PMT.safeMedia(ep.hls);
  if (mp4 || hls) {
    return '<div class="player player--native"><video controls preload="none" poster="' + poster + '" playsinline webkit-playsinline>' + (mp4 ? '<source src="' + PMT.escape(mp4) + '" type="video/mp4">' : "") + (hls ? '<source src="' + PMT.escape(hls) + '" type="application/vnd.apple.mpegurl">' : "") + '</video></div><p class="player__help"><a href="' + PMT.escape(mp4 || hls) + '">' + (LANG === "ua" ? "Відкрити відеофайл" : "Открыть видеофайл") + "</a></p>";
  }
  if (!ep.kinescope) {
    return '<div class="player player--empty"><img src="' + poster + '" alt=""><div class="player__soon"><span class="label">' + (ep.fallback ? U("playerMoved") : U("inProduction")) + "</span>" + (ep.fallback ? btn(U("oldPlayer"), PMT.escape(ep.fallback), "line", 'target="_blank" rel="noopener noreferrer"') : "") + "</div></div>";
  }
  var note = "";
  if (PMT.legacy) {
    note = '<div class="player__help"><p>' + (LANG === "ua" ? "Зовнішній плеєр може не підтримувати цей браузер. Якщо він не запускається, потрібне пряме MP4/HLS-посилання від власника сайту." : "Внешний плеер может не поддерживать этот браузер. Если он не запускается, нужна прямая MP4/HLS-ссылка от владельца сайта.") + '</p><a target="_blank" rel="noopener noreferrer" href="https://kinescope.io/' + encodeURIComponent(ep.kinescope) + '">' + (LANG === "ua" ? "Відкрити Kinescope окремо" : "Открыть Kinescope отдельно") + "</a>" + (ep.fallback ? ' · <a target="_blank" rel="noopener noreferrer" href="' + PMT.escape(ep.fallback) + '">' + U("oldPlayer") + "</a>" : "") + "</div>";
  }
  return '<div class="player-wrap"><div class="player" data-player="' + PMT.escape(ep.kinescope) + '" data-title="' + title + '"><img src="' + poster + '" alt="' + title + '" loading="lazy"><button class="player__btn" type="button" aria-label="' + U("openEpisode") + ": " + title + '"><span class="player__disc">' + PLAY + "</span></button></div>" + note + "</div>";
}
function wirePlayers(scope) {
  if (!scope) scope = document;
  PMT.each(scope.querySelectorAll("[data-player]"), function(box) {
    var button = box.querySelector(".player__btn");
    if (!button || button.getAttribute("data-wired")) return;
    button.setAttribute("data-wired", "1");
    button.addEventListener("click", function() {
      box.innerHTML = '<iframe src="https://kinescope.io/embed/' + encodeURIComponent(box.getAttribute("data-player")) + (PMT.legacy ? "" : "?autoplay=1") + '" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen webkitallowfullscreen title="' + PMT.escape(box.getAttribute("data-title")) + '"></iframe>';
    }, false);
  });
}
function epRow(p, ep) {
  var t = plain(T(ep.title));
  var idx = p.episodes.indexOf(ep);
  return '\n    <article class="ep">\n      <div class="ep__info">\n        <span class="num">'.concat(T(ep.n), '</span>\n        <h3 class="ep__title">').concat(t || T(ep.n), "</h3>\n        ").concat(btn(U("openSeparately"), "watch.html?p=".concat(p.id, "&e=").concat(idx + 1), "bare"), '\n      </div>\n      <div class="ep__stage">\n        ').concat(playerMarkup(ep), "\n        ").concat(ep.note ? '<p class="ep__note">'.concat(T(ep.note), "</p>") : "", "\n      </div>\n    </article>");
}
function mountProject() {
  var root = document.querySelector("[data-project]");
  if (!root) return;
  var id = PMT.query().get("p") || PROJECTS[0].id;
  var p = findProject(id) || PROJECTS[0];
  document.title = "".concat(plain(T(p.titlePlain)), " / Problematic Team");
  root.innerHTML = '\n    <section class="pj">\n      <div class="pj__media"><img src="'.concat(p.poster, '" alt="').concat(plain(T(p.titlePlain)), '"></div>\n      <div class="pj__side">\n        <span class="label label--accent rise" data-d="300">').concat(T(p.kind)).concat(p.original ? " / " + p.original : "", '</span>\n        <h1 class="rise" data-d="420">').concat(T(p.title), "</h1>\n        ").concat(p.trailer ? '<div class="ptrailer rise" data-d="700">\n          <span class="label">'.concat(U("trailerLabel")).concat(p.trailer.title ? " · " + plain(T(p.trailer.title)) : "", "</span>\n          ").concat(playerMarkup(p.trailer), "\n        </div>") : "", '\n        <p class="lead rise" data-d="900">').concat(T(p.lead), '</p>\n        <div class="metagrid rise" data-d="1040">\n          ').concat((p.meta || []).map(function(row) {
    return '<div><span class="label">'.concat(T(row[0]), "</span><span>").concat(T(row[1]), "</span></div>");
  }).join(""), "\n        </div>\n        ").concat(p.cast && p.cast.length ? '<div class="castblock rise" data-d="1140">\n          <span class="label">'.concat(U("castLabel"), '</span>\n          <div class="castlist">').concat(p.cast.map(function(row) {
    return "<span>".concat(T(row[0]), "&nbsp;— ").concat(row[1], "</span>");
  }).join(""), "</div>\n        </div>") : "", "\n        ").concat(p.features ? '<div class="features rise" data-d="1200">\n          '.concat(p.features.map(function(row) {
    return "<div><b>".concat(T(row[0]), "</b><p>").concat(T(row[1]), "</p></div>");
  }).join(""), "\n        </div>") : "", '\n        <p class="tagline rise" data-d="1260">').concat(T(p.tagline), '</p>\n      </div>\n    </section>\n\n    <section class="section wrap" id="episodes">\n      <div class="statement">\n        <div>\n          <span class="label label--accent rise">').concat(unitMany(p), '</span>\n          <h2 class="rise" data-d="100">').concat(U("episodesH"), "</h2>\n        </div>\n        ").concat(U("episodesLead") ? '<p class="lead rise" data-d="200">'.concat(U("episodesLead"), "</p>") : "", "\n      </div>\n      ").concat(p.seasons ? '<div class="seasons rise" data-d="240">\n        '.concat(p.seasons.map(function(sn, si) {
    return '<button type="button" class="season__btn'.concat(si === 0 ? " is-on" : "", '"\n          data-season="').concat(si, '" aria-pressed="').concat(si === 0, '">').concat(T(sn.label), "</button>");
  }).join(""), "\n      </div>") : "", "\n      ").concat(p.seasons ? p.seasons.map(function(sn, si) {
    return '\n        <div class="seasonbox'.concat(si === 0 ? " is-on" : "", '" data-seasonbox="').concat(si, '">\n          ').concat(sn.trailer ? '<div class="ep ep--trailer">\n            <div class="ep__info">\n              <span class="num">'.concat(U("seasonTrailer"), '</span>\n              <h3 class="ep__title">').concat(plain(T(sn.trailer.title)) || T(sn.label), '</h3>\n            </div>\n            <div class="ep__stage">').concat(playerMarkup(sn.trailer), "</div>\n          </div>") : "", '\n          <div class="eplist">').concat(sn.episodes.map(function(ep) {
      return epRow(p, ep);
    }).join(""), "</div>\n        </div>");
  }).join("") : p.episodes.length ? '<div class="eplist">'.concat(p.episodes.map(function(ep) {
    return epRow(p, ep);
  }).join(""), "</div>") : '<p class="lead">'.concat(U("noEpisodes"), "</p>"), '\n    </section>\n\n    <section class="section wrap">\n      <div class="statement">\n        <div>\n          <span class="label label--accent rise">').concat(U("otherLabel"), '</span>\n          <h2 class="rise" data-d="100">').concat(U("otherH"), '</h2>\n        </div>\n        <p class="lead rise" data-d="200">').concat(U("closed"), '</p>\n      </div>\n      <div class="plist mt-l">\n        ').concat(PROJECTS.filter(function(o) {
    return o.id !== p.id;
  }).map(function(o, i) {
    return '\n          <a class="prow rise" data-d="'.concat(i * 50, '" href="project.html?p=').concat(o.id, '">\n            <span class="num prow__num">').concat(nn(PROJECTS.indexOf(o)), '</span>\n            <div class="prow__media"><img src="').concat(o.poster, '" alt="').concat(plain(T(o.titlePlain)), '" loading="lazy"></div>\n            <div class="prow__body">\n              <span class="label label--accent">').concat(T(o.kind), "</span>\n              <h3>").concat(T(o.title), "</h3>\n            </div>\n          </a>");
  }).join(""), "\n      </div>\n    </section>");
  PMT.each(root.querySelectorAll("[data-open]"), function(b) {
    b.addEventListener("click", function() {
      return openModal(b.getAttribute("data-open"), b.getAttribute("data-eptitle"));
    });
  });
  wirePlayers(root);
  PMT.each(root.querySelectorAll("[data-season]"), function(b) {
    b.addEventListener("click", function() {
      var si = b.getAttribute("data-season");
      PMT.each(root.querySelectorAll("[data-season]"), function(x) {
        var on = x === b;
        PMT.toggleClass(x, "is-on", on);
        x.setAttribute("aria-pressed", on);
      });
      PMT.each(root.querySelectorAll("[data-seasonbox]"), function(box) {
        var active = box.getAttribute("data-seasonbox") === si;
        PMT.toggleClass(box, "is-on", active);
        if (!active) {
          PMT.each(box.querySelectorAll("[data-player]"), function(player) {
            if (!player.querySelector("iframe")) return;
            player.innerHTML = '<button class="player__btn" type="button" aria-label="' + U("openEpisode") + '"><span class="player__disc">' + PLAY + "</span></button>";
          });
          PMT.each(box.querySelectorAll("video"), function(video) {
            if (video.pause) video.pause();
          });
        }
      });
      wirePlayers(root);
    });
  });
}
function mountWatch() {
  var root = document.querySelector("[data-watch]");
  if (!root) return;
  var q = PMT.query();
  var p = findProject(q.get("p")) || PROJECTS[0];
  if (!p.episodes.length) {
    document.title = plain(T(p.titlePlain)) + " / Problematic Team";
    root.innerHTML = '<section class="watch wrap"><h1 class="h1--watch">' + T(p.title) + '</h1><p class="lead mt-s">' + U("noEpisodes") + "</p>" + btn(U("allEpisodes"), "project.html?p=" + p.id, "line") + "</section>";
    return;
  }
  var requested = parseInt(q.get("e") || "1", 10);
  var idx = Math.min(Math.max(isNaN(requested) ? 1 : requested, 1), p.episodes.length) - 1;
  var ep = p.episodes[idx];
  var prev = p.episodes[idx - 1] ? idx : null;
  var next = p.episodes[idx + 1] ? idx + 2 : null;
  var t = plain(T(ep.title));
  document.title = "".concat(t, " / ").concat(plain(T(p.titlePlain)));
  var credits = ep.credits && Object.keys(ep.credits).length ? ep.credits : null;
  root.innerHTML = '\n    <section class="watch wrap">\n      <div class="watch__top">\n        <div class="watch__head">\n          <span class="label label--accent rise" data-d="300">'.concat(plain(T(p.titlePlain)), '</span>\n          <h1 class="rise h1--watch" data-d="420">').concat(T(ep.n)).concat(t ? "<br>«".concat(t, "»") : "", '</h1>\n        </div>\n        <p class="lead rise" data-d="900">').concat(T(p.lead), '</p>\n      </div>\n      <div class="watch__stage rise" data-d="1000">').concat(playerMarkup(ep), "</div>\n      ").concat(ep.note ? '<p class="ep__note ep__note--watch rise" data-d="1050">'.concat(T(ep.note), "</p>") : "", '\n      <div class="credits">\n        ').concat(PMT.entries(credits || {}).map(function(credit, i) {
    return '\n          <div class="credits__col rise" data-d="'.concat(i * 50, '">\n            <span class="label">').concat(T(credit[0]), "</span>\n            <ul>").concat(credit[1].map(function(row) {
      return "<li>".concat(row[1] ? "".concat(T(row[0]), " <span>— ").concat(row[1], "</span>") : T(row[0]), "</li>");
    }).join(""), "</ul>\n          </div>");
  }).join(""), '\n      </div>\n      <div class="pager">\n        ').concat(prev ? btn(U("prevEpisode"), "watch.html?p=".concat(p.id, "&e=").concat(prev), "bare btn--back") : '<span class="label">'.concat(U("firstEpisode"), "</span>"), "\n        ").concat(btn(U("allEpisodes"), "project.html?p=".concat(p.id, "#episodes"), "bare"), "\n        ").concat(next ? btn(U("nextEpisode"), "watch.html?p=".concat(p.id, "&e=").concat(next), "bare") : '<span class="label">'.concat(U("noMore"), "</span>"), "\n      </div>\n    </section>");
  wirePlayers(root);
}
function mountSmoothScroll() {
  function findTarget(hash) {
    if (!hash || hash === "#") return null;
    return document.getElementById(PMT.decode(hash.slice(1)));
  }
  function scrollToTarget(target) {
    var head = document.querySelector("[data-head]");
    var top = Math.max(0, target.getBoundingClientRect().top + PMT.scrollY() - (head ? head.offsetHeight : 0) - 8);
    window.scrollTo(0, top);
  }
  document.addEventListener("click", function(e) {
    if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey || e.button && e.button !== 0) return;
    var a = e.target;
    while (a && a !== document && String(a.nodeName).toLowerCase() !== "a") a = a.parentNode;
    if (!a || a === document || a.target === "_blank" || a.host !== location.host || a.pathname !== location.pathname || a.search !== location.search) return;
    var target = findTarget(a.hash);
    if (!target) return;
    e.preventDefault();
    try {
      history.pushState(null, "", a.hash);
    } catch (err) {
      location.hash = a.hash;
    }
    scrollToTarget(target);
  }, false);
  function initialHash() {
    var target = findTarget(location.hash);
    if (target) window.setTimeout(function() {
      scrollToTarget(target);
    }, 120);
  }
  initialHash();
  window.addEventListener("load", initialHash, false);
}
function mountMotion() {
  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (!PMT.legacy && !reduced && window.IntersectionObserver) {
    try {
      var io = new window.IntersectionObserver(function(entries) {
        PMT.each(entries, function(entry) {
          if (entry.isIntersecting) {
            PMT.toggleClass(entry.target, "is-in", true);
            io.unobserve(entry.target);
          }
        });
      }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
      PMT.each(document.querySelectorAll(".rise"), function(el) {
        if (el.getAttribute("data-d")) el.style.setProperty("--d", el.getAttribute("data-d") + "ms");
        io.observe(el);
      });
      PMT.toggleClass(document.documentElement, "has-motion", true);
    } catch (err) {
      PMT.toggleClass(document.documentElement, "has-motion", false);
    }
  }
  var head = document.querySelector("[data-head]");
  if (!head) return;
  var hero = document.querySelector(".hero");
  var queued = false;
  function update() {
    queued = false;
    var compact = (window.innerWidth || document.documentElement.clientWidth) <= 1080;
    var limit = compact ? 12 : hero ? hero.offsetHeight - head.offsetHeight : 40;
    PMT.toggleClass(head, "is-stuck", !hero || PMT.scrollY() > limit);
  }
  function schedule() {
    if (!queued) {
      queued = true;
      PMT.raf(update);
    }
  }
  update();
  window.addEventListener("scroll", schedule, false);
  window.addEventListener("resize", schedule, false);
}
function wireLocalLinks() {
  PMT.each(document.querySelectorAll("a[href]"), function(a) {
    var href = a.getAttribute("href");
    if (/^(?:index|projects|project|watch)\.html(?:[?#]|$)/.test(href)) a.setAttribute("href", PMT.withLang(href, LANG));
  });
}
function wireImages() {
  PMT.each(document.querySelectorAll("img"), function(img) {
    function fallback() {
      if (img.getAttribute("data-fallback-used")) return;
      img.setAttribute("data-fallback-used", "1");
      img.src = img.className.indexOf("logo") !== -1 ? "assets/compat/mark.png" : "assets/compat/placeholder.png";
    }
    img.addEventListener("error", fallback, false);
    if (img.complete && typeof img.naturalWidth === "number" && img.naturalWidth === 0) fallback();
  });
}
function mountFonts() {
  if (PMT.legacy) return;
  var link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = "https://fonts.googleapis.com/css2?family=Onest:wght@300;400&display=swap";
  document.getElementsByTagName("head")[0].appendChild(link);
}
function boot() {
  mountChrome();
  mountStatic();
  mountHome();
  mountArchive();
  mountProject();
  mountWatch();
  wirePlayers();
  wireLocalLinks();
  mountLangGate();
  wireImages();
  mountSmoothScroll();
  mountMotion();
}
if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, false);
else boot();
