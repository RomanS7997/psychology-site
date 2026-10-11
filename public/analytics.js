// Счётчики посещаемости и цели. Подключается компонентом Analytics.astro и
// только тогда, когда в src/data/analytics.json вписан хотя бы один номер.
// Настройки приходят в window.__analytics. Почему всё устроено именно так
// (согласие, выключенный Вебвизор, что уходит в цели) — в Analytics.astro.
(function () {
  var cfg = window.__analytics;
  var KEY = 'analytics-consent';
  var loaded = false;
  var queue = [];

  function stored() {
    try { return localStorage.getItem(KEY); } catch (e) { return null; }
  }
  function store(value) {
    try { localStorage.setItem(KEY, value); } catch (e) {}
  }

  function send(name, params) {
    try { if (cfg.ym && window.ym) window.ym(Number(cfg.ym), 'reachGoal', name, params || {}); } catch (e) {}
    try { if (cfg.ga && window.gtag) window.gtag('event', name, params || {}); } catch (e) {}
  }

  // Единая точка для целей. Вызывать можно всегда: если счётчиков нет или
  // человек отказался, функция молча ничего не делает.
  window.siteTrack = function (name, params) {
    if (!cfg) return;
    if (loaded) { send(name, params); return; }
    // До согласия копим: согласится на этой же странице — цель не потеряется.
    // Откажется или не ответит — очередь просто исчезнет вместе со страницей.
    if (stored() !== 'denied' && queue.length < 20) queue.push([name, params]);
  };

  if (!cfg) return;

  function load() {
    if (loaded) return;
    loaded = true;

    if (cfg.ym) {
      (function (m, e, t, r, i, k, a) {
        m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
        m[i].l = 1 * new Date();
        k = e.createElement(t); a = e.getElementsByTagName(t)[0];
        k.async = 1; k.src = r; a.parentNode.insertBefore(k, a);
      })(window, document, 'script', 'https://mc.yandex.ru/metrika/tag.js', 'ym');
      window.ym(Number(cfg.ym), 'init', {
        clickmap: true,
        trackLinks: true,
        accurateTrackBounce: true,
        webvisor: false
      });
    }

    if (cfg.ga) {
      var s = document.createElement('script');
      s.async = true;
      s.src = 'https://www.googletagmanager.com/gtag/js?id=' + encodeURIComponent(cfg.ga);
      document.head.appendChild(s);
      window.dataLayer = window.dataLayer || [];
      window.gtag = function () { window.dataLayer.push(arguments); };
      window.gtag('js', new Date());
      window.gtag('config', cfg.ga);
    }

    queue.splice(0).forEach(function (q) { send(q[0], q[1]); });
  }

  // Клики по телефону, почте и мессенджерам — тоже цели
  document.addEventListener('click', function (event) {
    var link = event.target && event.target.closest ? event.target.closest('a[href]') : null;
    if (!link) return;
    var href = link.getAttribute('href') || '';
    if (href.indexOf('tel:') === 0) window.siteTrack('phone_click');
    else if (href.indexOf('mailto:') === 0) window.siteTrack('email_click');
    else if (href.indexOf('wa.me') !== -1) window.siteTrack('whatsapp_click');
    else if (href.indexOf('t.me') !== -1) window.siteTrack('telegram_click');
  }, true);

  var note = null;
  function noteEl() { return note || (note = document.getElementById('cookie-note')); }

  function showNote() {
    var el = noteEl();
    if (!el) return;
    el.hidden = false;
    document.body.classList.add('has-cookie-note');
    // Кнопка записи в углу не должна оказаться под плашкой
    document.documentElement.style.setProperty('--cookie-note-h', el.offsetHeight + 'px');
  }
  function hideNote() {
    var el = noteEl();
    if (el) el.hidden = true;
    document.body.classList.remove('has-cookie-note');
  }

  function decide(value) {
    store(value);
    hideNote();
    if (value === 'granted') load();
  }

  // Ссылка «изменить выбор» в политике конфиденциальности
  window.siteCookieChoice = function () {
    try { localStorage.removeItem(KEY); } catch (e) {}
    showNote();
  };

  function boot() {
    var choice = stored();
    if (!cfg.requireConsent) {
      // Владелец решил считать всех: счётчики включаются сразу, плашки нет
      load();
    } else if (choice === 'granted') {
      load();
    } else if (!choice) {
      showNote();
    }

    var el = noteEl();
    if (!el) return;
    var yes = el.querySelector('[data-cookie-yes]');
    var no = el.querySelector('[data-cookie-no]');
    if (yes) yes.addEventListener('click', function () { decide('granted'); });
    if (no) no.addEventListener('click', function () { decide('denied'); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
