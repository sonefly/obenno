/* 梵音殿 OBENNO · 供台动态与个人记数
   只在首页供养处生效；所有数据留在本机浏览器，不上传、不共享。 */
(function () {
  "use strict";
  var hero = document.getElementById("offHero");
  if (!hero) return;

  var lineEl = document.getElementById("offHeroLine"),
      zEl = document.getElementById("offHeroZ"),
      enEl = document.getElementById("offHeroEn"),
      stepsEl = document.getElementById("offSteps"),
      nowEl = document.getElementById("offStepsNow"),
      addBtn = document.getElementById("lampAdd"),
      tabsEl = document.querySelector(".off-tabs");

  var KINDS = {
    lamp:   { key: "fxy-lamps",         unit: "盏", zh: "供灯", en: "LAMPS",   line: "愿此灯明，照我心地" },
    flower: { key: "fxy-offer-flowers", unit: "枝", zh: "供花", en: "FLOWERS", line: "愿此花香，遍及一切" },
    water:  { key: "fxy-offer-water",   unit: "盅", zh: "供水", en: "WATER",   line: "愿此水净，澄我心地" }
  };
  var DAILY = "obenno-offer-days";     /* { "2026-11-24": 3 } */
  var STEPS = [1, 7, 21, 49, 100];

  function read(k) {
    try { var a = JSON.parse(localStorage.getItem(k) || "[]"); return a && a.length ? a : []; }
    catch (e) { return []; }
  }
  function readDays() {
    try { return JSON.parse(localStorage.getItem(DAILY) || "{}") || {}; }
    catch (e) { return {}; }
  }
  function saveDays(o) { try { localStorage.setItem(DAILY, JSON.stringify(o)); } catch (e) {} }
  function today() {
    var d = new Date(), m = d.getMonth() + 1, day = d.getDate();
    return d.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (day < 10 ? "0" + day : day);
  }
  function totals() {
    var t = 0;
    for (var k in KINDS) { if (KINDS.hasOwnProperty(k)) t += read(KINDS[k].key).length; }
    return t;
  }

  /* —— 供台换景 —— */
  var kind = "lamp";
  function setKind(k) {
    if (!KINDS[k]) k = "lamp";
    kind = k;
    var imgs = hero.querySelectorAll("img[data-for]");
    for (var i = 0; i < imgs.length; i++) {
      var on = imgs[i].getAttribute("data-for") === k;
      imgs[i].classList.toggle("on", on);
    }
    hero.setAttribute("data-kind", k);
    if (zEl) zEl.textContent = KINDS[k].zh;
    if (enEl) enEl.textContent = KINDS[k].en;
    if (lineEl) lineEl.textContent = KINDS[k].line;
    var n = read(KINDS[k].key).length;
    if (n && lineEl) lineEl.textContent = KINDS[k].line + " · 此处已供 " + n + " " + KINDS[k].unit;
  }
  function flash(txt) {
    hero.classList.remove("lit");
    void hero.offsetWidth;
    hero.classList.add("lit");
    setTimeout(function () { hero.classList.remove("lit"); }, 1700);
    if (lineEl && txt) {
      var keep = KINDS[kind].line;
      lineEl.textContent = txt;
      setTimeout(function () { setKind(kind); }, 4200);
    }
  }
  if (tabsEl) {
    tabsEl.addEventListener("click", function (e) {
      var t = e.target.closest ? e.target.closest(".off-tab") : null;
      if (t) setKind(t.getAttribute("data-k") || "lamp");
    });
  }

  /* —— 供养记数 —— */
  var before = totals();
  function paintSteps() {
    var days = readDays(), n = 0, streak = 0, i;
    for (var d in days) { if (days.hasOwnProperty(d) && days[d] > 0) n++; }
    var cur = today(), t = new Date(), guard = 0;
    if (!days[cur]) { t.setDate(t.getDate() - 1); guard = 1; }
    var key = function (dt) {
      var m = dt.getMonth() + 1, g = dt.getDate();
      return dt.getFullYear() + "-" + (m < 10 ? "0" + m : m) + "-" + (g < 10 ? "0" + g : g);
    };
    while (guard < 400) {
      var kk = key(t);
      if (!(days[kk] > 0)) break;
      streak++; t.setDate(t.getDate() - 1); guard++;
    }
    if (stepsEl) {
      var lis = stepsEl.querySelectorAll("li");
      for (i = 0; i < lis.length; i++) {
        var need = parseInt(lis[i].getAttribute("data-need"), 10);
        lis[i].classList.toggle("on", n >= need);
      }
    }
    if (nowEl) {
      if (!n) nowEl.textContent = totals() > 0 ? "此处已有点供；从今日起，点一盏就记下一日。" : "还没有开始记数。点一盏、供一枝，这一日就记下了。";
      else nowEl.textContent = "已供养 " + n + " 日 · 连续 " + streak + " 日。这些记号只是你自己的记数，不是功德簿。";
    }
  }
  if (addBtn) {
    addBtn.addEventListener("click", function () {
      setTimeout(function () {
        var now = totals();
        if (now <= before) { before = now; return; }
        var delta = now - before; before = now;
        var days = readDays(), cur = today();
        days[cur] = (days[cur] || 0) + delta;
        saveDays(days);
        paintSteps();
        flash("第 " + read(KINDS[kind].key).length + " " + KINDS[kind].unit + "已点亮 · 今日 " + days[cur] + " " + KINDS[kind].unit);
      }, 120);
    });
  }

  var wallEl = document.getElementById("lampWall");
  if (wallEl && window.MutationObserver) {
    var lastN = wallEl.children.length;
    new MutationObserver(function () {
      var n = wallEl.children.length;
      if (n > lastN) {
        var fresh = wallEl.firstElementChild;
        if (fresh && fresh.classList && fresh.classList.contains("lamp")) {
          fresh.classList.add("just-lit");
          setTimeout(function () { fresh.classList.remove("just-lit"); }, 1900);
        }
      }
      lastN = n;
    }).observe(wallEl, { childList: true });
  }

  setKind(kind);
  paintSteps();
})();
