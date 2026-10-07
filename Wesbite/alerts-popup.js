/* Pathway Real Estate: new listing alerts
 * Shows a sign-up window on the Properties and Condos pages after about 25 seconds
 * (not while the cookie notice or a listing detail is open), and whenever a button
 * with data-alerts-open is clicked. After "No thanks" it comes back on every second
 * visit (a new visit starts after 30 minutes without activity); after a sign-up it no
 * longer opens by itself.
 * Everything is stored in the visitor's browser only.
 */
(function () {
  var DELAY = 25000;
  var SHOW_EVERY = 2;                 // after "No thanks": show again on every 2nd visit
  var KEY = 'pathway_alerts';
  var VISITS_KEY = 'pathway_visits';
  var LOCATIONS = ['El Nido', 'Taytay', 'Port Barton', 'San Vicente', 'Coron', 'Puerto Princesa',
    'Napsan', 'Aborlan', 'Narra', "Brooke's Point", 'Balabac'];
  var PRICES = [[5e6, '5M'], [10e6, '10M'], [25e6, '25M'], [50e6, '50M'], [100e6, '100M'], [200e6, '200M']];

  // texts in English, or in German on the pages under /de/
  var DE = document.documentElement.lang === 'de';
  var T = DE ? {
    eyebrow: 'Neue Angebote per E-Mail', title: 'Immer <em>als Erstes informiert</em>',
    sub: 'Sie erhalten eine E-Mail, sobald ein neues Angebot zu Ihrer Suche passt. Kostenlos, ohne Spam und jederzeit abbestellbar.',
    what: 'Wonach suchen Sie?', both: 'Beides', properties: 'Immobilien', condos: 'Wohnungen',
    where: 'Wo?', allLocations: 'Alle Orte', budget: 'Budget', budgetFrom: 'Budget ab', fromAny: 'Ab: beliebig',
    budgetTo: 'Budget bis', toAny: 'Bis: beliebig', million: ' Mio.', email: 'Ihre E-Mail-Adresse', placeholder: 'name@beispiel.de',
    leaveEmpty: 'Leer lassen',
    small: 'Sie erhalten zunächst eine kurze E-Mail, mit der Sie Ihre Adresse bestätigen. Mit der Anmeldung erklären Sie sich damit einverstanden, dass wir Ihre E-Mail-Adresse für diese Benachrichtigungen verwenden, wie in unserer <a href="/de/privacy.html#alerts">Datenschutzerklärung</a> beschrieben.',
    submit: 'Jetzt anmelden', later: 'Nein, danke', close: 'Schließen',
    invalid: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.', sending: 'Wird gesendet …',
    wrong: 'Etwas ist schiefgelaufen.', wrongRetry: 'Etwas ist schiefgelaufen. Bitte versuchen Sie es erneut.',
    updatedTitle: 'Benachrichtigung <em>aktualisiert</em>',
    updatedText: 'Wir haben Ihre neue Auswahl gespeichert. Sie hören von uns, sobald ein passendes Angebot online geht.',
    pendingTitle: 'Fast <em>geschafft</em>',
    pendingText: 'Bitte prüfen Sie Ihr Postfach und klicken Sie auf den Link in unserer E-Mail, um Ihre Adresse zu bestätigen. Falls die E-Mail nicht innerhalb weniger Minuten ankommt, sehen Sie bitte in Ihrem Spam-Ordner nach.'
  } : {
    eyebrow: 'Listing alerts', title: 'Be the first <em>to know</em>',
    sub: 'Get an email as soon as a new listing matches what you are looking for. Free, no spam, unsubscribe anytime.',
    what: 'What are you looking for?', both: 'Both', properties: 'Properties', condos: 'Condos',
    where: 'Where?', allLocations: 'All locations', budget: 'Budget', budgetFrom: 'Budget from', fromAny: 'From: any',
    budgetTo: 'Budget up to', toAny: 'Up to: any', million: 'M', email: 'Your email', placeholder: 'name@example.com',
    leaveEmpty: 'Leave empty',
    small: 'We first send you a short email to confirm your address. By signing up you agree that we use your email for these alerts, as described in our <a href="/privacy.html#alerts">Privacy Policy</a>.',
    submit: 'Notify me', later: 'No thanks', close: 'Close',
    invalid: 'Please enter a valid email address.', sending: 'Sending...',
    wrong: 'Something went wrong.', wrongRetry: 'Something went wrong. Please try again.',
    updatedTitle: 'Alert <em>updated</em>',
    updatedText: 'We saved your new choices. You will hear from us when a matching listing goes online.',
    pendingTitle: 'Almost <em>done</em>',
    pendingText: 'Please check your inbox and click the link in our email to confirm your address. If it does not arrive within a few minutes, look in your spam folder.'
  };

  // count visits: a new visit starts after 30 minutes without activity on the site
  // (shared across tabs, so opening a listing in a new tab is the same visit)
  var GAP = 30 * 60 * 1000;
  var visit = (function () {
    var n = 1;
    try {
      var v = JSON.parse(window.localStorage.getItem(VISITS_KEY) || 'null') || { n: 0, last: 0 };
      if (Date.now() - v.last > GAP) v.n += 1;
      v.last = Date.now();
      window.localStorage.setItem(VISITS_KEY, JSON.stringify(v));
      n = v.n;
    } catch (e) {}
    return n || 1;
  })();
  function touch() {
    try {
      var v = JSON.parse(window.localStorage.getItem(VISITS_KEY) || 'null');
      if (v) { v.last = Date.now(); window.localStorage.setItem(VISITS_KEY, JSON.stringify(v)); }
    } catch (e) {}
  }
  ['click', 'scroll', 'keydown'].forEach(function (ev) {
    var t = 0;
    window.addEventListener(ev, function () { if (Date.now() - t > 60000) { t = Date.now(); touch(); } }, { passive: true });
  });

  function readState() {
    try { return JSON.parse(window.localStorage.getItem(KEY) || 'null'); } catch (e) { return null; }
  }
  function saveState(state) {
    try { window.localStorage.setItem(KEY, JSON.stringify({ state: state, time: Date.now(), visit: visit })); } catch (e) {}
  }
  function autoShowAllowed() {
    var s = readState();
    if (!s) return true;
    if (s.state === 'subscribed') return false;
    if (s.state === 'dismissed') {
      var since = visit - (s.visit || 0);
      return since > 0 && since % SHOW_EVERY === 0;
    }
    return true;
  }

  var css =
    '.alerts-trigger{display:inline-flex;align-items:center;gap:8px;background:none;border:0.5px solid var(--c3,#b6a180);padding:9px 16px;cursor:pointer;' +
    'font-family:var(--sans,"Montserrat",sans-serif);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--c1,#7e6454);transition:background .2s,color .2s;}' +
    '.alerts-trigger:hover{background:var(--c1,#7e6454);color:var(--bg,#fffaf0);border-color:var(--c1,#7e6454);}' +
    '.al-overlay{position:fixed;inset:0;z-index:9000;background:rgba(42,42,42,0.45);display:flex;align-items:center;justify-content:center;padding:16px;animation:alFade .3s ease both;}' +
    '@keyframes alFade{from{opacity:0}to{opacity:1}}' +
    '.al-box{position:relative;width:100%;max-width:560px;max-height:calc(100vh - 32px);overflow:auto;background:var(--bg,#fffaf0);border:0.5px solid var(--c4,#e4ded3);' +
    'box-shadow:0 20px 60px rgba(42,42,42,0.25);padding:34px 34px 28px;font-family:var(--sans,"Montserrat",sans-serif);animation:alUp .35s ease both;}' +
    '@keyframes alUp{from{transform:translateY(14px);opacity:0}to{transform:none;opacity:1}}' +
    '.al-close{position:absolute;top:12px;right:14px;background:none;border:0;font-size:24px;line-height:1;color:var(--c3,#b6a180);cursor:pointer;padding:6px;}' +
    '.al-eyebrow{font-size:10px;letter-spacing:0.2em;text-transform:uppercase;color:var(--c3,#b6a180);margin:0 0 8px;}' +
    '.al-title{font-family:var(--serif,"Cormorant Garamond",serif);font-weight:300;font-size:32px;line-height:1.15;color:var(--c6,#2a2a2a);margin:0 0 8px;}' +
    '.al-title em{font-style:italic;color:var(--c1,#7e6454);}' +
    '.al-sub{font-size:12px;line-height:1.8;color:var(--c2,#8d7764);margin:0 0 22px;}' +
    '.al-label{display:block;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--c2,#8d7764);margin:0 0 8px;}' +
    '.al-group{margin-bottom:18px;}' +
    '.al-chips{display:flex;flex-wrap:wrap;gap:6px;}' +
    '.al-chip{background:#fff;border:0.5px solid var(--c4,#e4ded3);padding:7px 12px;font-family:inherit;font-size:11px;color:var(--c2,#8d7764);cursor:pointer;transition:all .15s;}' +
    '.al-chip:hover{border-color:var(--c3,#b6a180);}' +
    '.al-chip.on{background:var(--c1,#7e6454);border-color:var(--c1,#7e6454);color:var(--bg,#fffaf0);}' +
    '.al-row{display:grid;grid-template-columns:1fr 1fr;gap:10px;}' +
    '.al-box select,.al-box input[type=email]{width:100%;box-sizing:border-box;padding:11px 12px;border:0.5px solid var(--c3,#b6a180);background:#fff;font-family:inherit;font-size:13px;color:var(--c6,#2a2a2a);border-radius:0;}' +
    '.al-small{font-size:10px;line-height:1.7;color:var(--c3,#b6a180);margin:10px 0 0;}' +
    '.al-small a{color:inherit;}' +
    '.al-submit{margin-top:18px;width:100%;background:var(--c1,#7e6454);color:var(--bg,#fffaf0);border:0;padding:14px;font-family:inherit;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;cursor:pointer;}' +
    '.al-submit:hover{background:var(--c6,#2a2a2a);}' +
    '.al-submit[disabled]{opacity:.6;cursor:wait;}' +
    '.al-error{font-size:12px;color:#a2463b;margin:10px 0 0;}' +
    '.al-later{display:block;margin:12px auto 0;background:none;border:0;font-family:inherit;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:var(--c3,#b6a180);cursor:pointer;text-decoration:underline;text-underline-offset:4px;}' +
    '.al-done{text-align:center;padding:16px 0 6px;}' +
    '.al-hp{position:absolute;left:-9999px;width:1px;height:1px;overflow:hidden;}' +
    '@media (max-width:560px){.al-box{padding:28px 20px 22px}.al-title{font-size:27px}.al-row{grid-template-columns:1fr}.al-box select,.al-box input[type=email]{font-size:16px}}';
  var st = document.createElement('style');
  st.textContent = css;
  document.head.appendChild(st);

  var overlay = null;

  function priceOptions(includeMax) {
    var h = '<option value="">Any</option>';
    PRICES.forEach(function (p, i) {
      if (!includeMax && i === PRICES.length - 1) return;
      h += '<option value="' + p[0] + '">PHP ' + p[1].replace('M', T.million) + '</option>';
    });
    return h;
  }

  function build() {
    overlay = document.createElement('div');
    overlay.className = 'al-overlay';
    overlay.innerHTML =
      '<div class="al-box" role="dialog" aria-modal="true" aria-labelledby="alTitle">' +
      '<button type="button" class="al-close" aria-label="' + T.close + '">&times;</button>' +
      '<div class="al-form-wrap">' +
      '<p class="al-eyebrow">' + T.eyebrow + '</p>' +
      '<h2 class="al-title" id="alTitle">' + T.title + '</h2>' +
      '<p class="al-sub">' + T.sub + '</p>' +
      '<form class="al-form" novalidate>' +
      '<div class="al-group"><span class="al-label">' + T.what + '</span><div class="al-chips" data-group="kind">' +
      '<button type="button" class="al-chip" data-v="all">' + T.both + '</button>' +
      '<button type="button" class="al-chip" data-v="property">' + T.properties + '</button>' +
      '<button type="button" class="al-chip" data-v="condo">' + T.condos + '</button></div></div>' +
      '<div class="al-group"><span class="al-label">' + T.where + '</span><div class="al-chips" data-group="loc">' +
      '<button type="button" class="al-chip on" data-v="all">' + T.allLocations + '</button>' +
      LOCATIONS.map(function (l) { return '<button type="button" class="al-chip" data-v="' + l.replace(/"/g, '&quot;') + '">' + l + '</button>'; }).join('') +
      '</div></div>' +
      '<div class="al-group"><span class="al-label">' + T.budget + '</span><div class="al-row">' +
      '<select name="min" aria-label="' + T.budgetFrom + '"><option value="">' + T.fromAny + '</option>' + priceOptions(false).replace('<option value="">Any</option>', '') + '</select>' +
      '<select name="max" aria-label="' + T.budgetTo + '"><option value="">' + T.toAny + '</option>' + priceOptions(true).replace('<option value="">Any</option>', '') + '</select>' +
      '</div></div>' +
      '<div class="al-group"><label class="al-label" for="alEmail">' + T.email + '</label>' +
      '<input type="email" id="alEmail" name="email" autocomplete="email" placeholder="' + T.placeholder + '" required>' +
      '<div class="al-hp" aria-hidden="true"><label>' + T.leaveEmpty + ' <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>' +
      '<p class="al-small">' + T.small + '</p>' +
      '</div>' +
      '<p class="al-error" hidden></p>' +
      '<button type="submit" class="al-submit">' + T.submit + '</button>' +
      '<button type="button" class="al-later">' + T.later + '</button>' +
      '</form></div></div>';
    document.body.appendChild(overlay);

    // both types are preselected; visitors can narrow it down
    overlay.querySelector('[data-group="kind"] [data-v="all"]').classList.add('on');

    overlay.addEventListener('click', function (e) {
      if (e.target === overlay || e.target.closest('.al-close')) { close(true); return; }
      if (e.target.closest('.al-later')) { close(true); return; }
      var chip = e.target.closest('.al-chip');
      if (!chip) return;
      var group = chip.parentNode, v = chip.getAttribute('data-v');
      var chips = group.querySelectorAll('.al-chip');
      if (group.getAttribute('data-group') === 'kind') {
        [].forEach.call(chips, function (c) { c.classList.toggle('on', c === chip); });
      } else {
        var all = group.querySelector('[data-v="all"]');
        if (v === 'all') {
          [].forEach.call(chips, function (c) { c.classList.toggle('on', c === all); });
        } else {
          chip.classList.toggle('on');
          var any = group.querySelectorAll('.al-chip.on:not([data-v="all"])').length;
          all.classList.toggle('on', !any);
        }
      }
    });

    overlay.querySelector('.al-form').addEventListener('submit', submit);
    document.addEventListener('keydown', onKey);
  }

  function onKey(e) { if (e.key === 'Escape' && overlay) close(true); }

  function open() {
    if (overlay) return;
    build();
    setTimeout(function () { var i = overlay && overlay.querySelector('.al-chip.on'); if (i) i.focus(); }, 50);
  }

  function close(dismissed) {
    if (!overlay) return;
    overlay.remove();
    overlay = null;
    document.removeEventListener('keydown', onKey);
    if (dismissed && !(readState() && readState().state === 'subscribed')) saveState('dismissed');
  }

  function submit(e) {
    e.preventDefault();
    var form = e.target;
    var err = form.querySelector('.al-error');
    var btn = form.querySelector('.al-submit');
    var email = form.email.value.trim();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      err.textContent = T.invalid; err.hidden = false; form.email.focus(); return;
    }
    var kind = form.querySelector('[data-group="kind"] .al-chip.on').getAttribute('data-v');
    var locs = [].map.call(form.querySelectorAll('[data-group="loc"] .al-chip.on:not([data-v="all"])'), function (c) { return c.getAttribute('data-v'); });
    var min = form.min.value ? Number(form.min.value) : null;
    var max = form.max.value ? Number(form.max.value) : null;
    err.hidden = true;
    btn.disabled = true; btn.textContent = T.sending;
    fetch('/api/alerts/subscribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email,
        kinds: kind === 'all' ? ['property', 'condo'] : [kind],
        municipalities: locs,
        priceMin: min, priceMax: max,
        website: form.website.value,
        source: location.pathname,
        lang: DE ? 'de' : 'en'
      })
    }).then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (res) {
        if (!res.ok) throw new Error(res.d && res.d.error || T.wrong);
        saveState('subscribed');
        var wrap = overlay.querySelector('.al-form-wrap');
        wrap.innerHTML = res.d.status === 'updated'
          ? '<div class="al-done"><p class="al-eyebrow">' + T.eyebrow + '</p><h2 class="al-title">' + T.updatedTitle + '</h2><p class="al-sub">' + T.updatedText + '</p><button type="button" class="al-submit al-ok">' + T.close + '</button></div>'
          : '<div class="al-done"><p class="al-eyebrow">' + T.eyebrow + '</p><h2 class="al-title">' + T.pendingTitle + '</h2><p class="al-sub">' + T.pendingText + '</p><button type="button" class="al-submit al-ok">' + T.close + '</button></div>';
        wrap.querySelector('.al-ok').addEventListener('click', function () { close(false); });
      })
      .catch(function (x) {
        err.textContent = x.message || T.wrongRetry;
        err.hidden = false;
        btn.disabled = false; btn.textContent = T.submit;
      });
  }

  // ---------- timing ----------
  function busy() {
    return document.querySelector('.pw-consent') ||
      document.querySelector('#modalOverlay.open, .modal-overlay.open, #lightbox.open');
  }

  function shownThisVisit() {
    try { return Number(window.localStorage.getItem('pathway_alerts_shown')) === visit; } catch (e) { return false; }
  }
  function markShown() {
    try { window.localStorage.setItem('pathway_alerts_shown', String(visit)); } catch (e) {}
  }

  function scheduleAuto() {
    if (!autoShowAllowed() || shownThisVisit()) return;
    var start = Date.now();
    (function tick() {
      if (overlay) return;
      if (Date.now() - start >= DELAY && !busy()) { markShown(); open(); return; }
      setTimeout(tick, 2000);
    })();
  }

  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-alerts-open]');
    if (t) { e.preventDefault(); open(); }
  });

  window.PathwayAlerts = { open: open };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scheduleAuto);
  else scheduleAuto();
})();
