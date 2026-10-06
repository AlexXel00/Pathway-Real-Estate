/* Pathway Real Estate: cookie consent
 * The website itself sets no tracking cookies. Third-party content (Google Maps,
 * YouTube, Vimeo, Instagram, Facebook, TikTok) can set cookies, so it is only
 * loaded after the visitor agrees. Embeds use data-consent-src instead of src.
 * The choice is stored in the visitor's browser (localStorage) for 12 months.
 */
(function () {
  var KEY = 'pathway_consent';
  var MAX_AGE = 365 * 24 * 60 * 60 * 1000;

  var SERVICES = [
    [/google\.[a-z.]+\/maps|maps\.google/, 'Google Maps'],
    [/youtube(-nocookie)?\.com/, 'YouTube'],
    [/vimeo\.com/, 'Vimeo'],
    [/instagram\.com/, 'Instagram'],
    [/facebook\.com/, 'Facebook'],
    [/tiktok\.com/, 'TikTok']
  ];

  function serviceName(url) {
    for (var i = 0; i < SERVICES.length; i++) {
      if (SERVICES[i][0].test(url)) return SERVICES[i][1];
    }
    return 'an external provider';
  }

  // ---------- stored choice ----------
  function readChoice() {
    try {
      var raw = window.localStorage.getItem(KEY);
      if (!raw) return null;
      var data = JSON.parse(raw);
      if (!data || !data.value || !data.time || Date.now() - data.time > MAX_AGE) return null;
      return data.value;
    } catch (e) {
      return null;
    }
  }

  function saveChoice(value) {
    try {
      window.localStorage.setItem(KEY, JSON.stringify({ value: value, time: Date.now() }));
    } catch (e) {
      // storage blocked: the choice still applies for this page view
    }
  }

  var choice = readChoice();
  function allowed() { return choice === 'all'; }

  // ---------- styles ----------
  var css =
    '.pw-consent{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:9999;width:calc(100% - 32px);max-width:720px;' +
    'background:var(--white,#fff);border:0.5px solid var(--c4,#e4ded3);box-shadow:0 10px 40px rgba(42,42,42,0.12);padding:22px 26px;' +
    'display:flex;gap:22px;align-items:center;font-family:var(--sans,"Montserrat",sans-serif);animation:pwUp .4s ease both;}' +
    '@keyframes pwUp{from{opacity:0;transform:translate(-50%,12px)}to{opacity:1;transform:translate(-50%,0)}}' +
    '.pw-consent p{margin:0;font-size:12px;line-height:1.8;color:var(--c2,#8d7764);}' +
    '.pw-consent p b{display:block;font-family:var(--serif,"Cormorant Garamond",serif);font-weight:400;font-size:19px;color:var(--c6,#2a2a2a);margin-bottom:4px;}' +
    '.pw-consent a{color:var(--c1,#7e6454);text-underline-offset:3px;}' +
    '.pw-consent-btns{display:flex;flex-direction:column;gap:8px;flex:0 0 auto;}' +
    '.pw-btn{font-family:var(--sans,"Montserrat",sans-serif);font-size:10px;letter-spacing:0.14em;text-transform:uppercase;padding:11px 20px;cursor:pointer;border:0.5px solid var(--c1,#7e6454);white-space:nowrap;}' +
    '.pw-btn-main{background:var(--c1,#7e6454);color:var(--bg,#fffaf0);}' +
    '.pw-btn-main:hover{background:var(--c6,#2a2a2a);border-color:var(--c6,#2a2a2a);}' +
    '.pw-btn-alt{background:transparent;color:var(--c1,#7e6454);}' +
    '.pw-btn-alt:hover{background:var(--bg,#fffaf0);}' +
    '@media (max-width:640px){.pw-consent{flex-direction:column;align-items:stretch;bottom:12px;padding:20px;gap:16px}.pw-consent-btns{flex-direction:row}.pw-btn{flex:1}}' +
    '.pw-ph{display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;gap:12px;padding:28px 22px;min-height:220px;' +
    'background:var(--bg,#fffaf0);border:0.5px solid var(--c4,#e4ded3);font-family:var(--sans,"Montserrat",sans-serif);box-sizing:border-box;width:100%;}' +
    '.pw-ph p{margin:0;font-size:11px;line-height:1.8;color:var(--c2,#8d7764);max-width:360px;}' +
    '.pw-ph p b{display:block;font-family:var(--serif,"Cormorant Garamond",serif);font-weight:400;font-size:18px;color:var(--c6,#2a2a2a);}' +
    '.pw-ph a{color:var(--c1,#7e6454);}';
  var style = document.createElement('style');
  style.id = 'pw-consent-css';
  style.textContent = css;
  document.head.appendChild(style);

  // ---------- embeds ----------
  function activate(frame) {
    var src = frame.getAttribute('data-consent-src');
    if (!src) return;
    var ph = frame.previousElementSibling;
    if (ph && ph.classList && ph.classList.contains('pw-ph')) ph.remove();
    frame.style.display = '';
    frame.setAttribute('src', src);
    frame.removeAttribute('data-consent-src');
  }

  function block(frame) {
    var prev = frame.previousElementSibling;
    if (prev && prev.classList && prev.classList.contains('pw-ph')) return;
    var name = serviceName(frame.getAttribute('data-consent-src') || '');
    var h = frame.offsetHeight || parseInt(window.getComputedStyle(frame).height, 10) || 0;
    var ph = document.createElement('div');
    ph.className = 'pw-ph';
    if (h > 220) ph.style.minHeight = h + 'px';
    ph.innerHTML =
      '<p><b>Content from ' + name + '</b>This content is provided by ' + name +
      ' and may set cookies. It loads only with your consent. <a href="/privacy.html#cookies">Learn more</a></p>' +
      '<button type="button" class="pw-btn pw-btn-main">Allow and load</button>';
    ph.querySelector('button').addEventListener('click', function () { setChoice('all'); });
    frame.style.display = 'none';
    frame.parentNode.insertBefore(ph, frame);
  }

  function handle(root) {
    var frames = (root || document).querySelectorAll ? (root || document).querySelectorAll('iframe[data-consent-src]') : [];
    for (var i = 0; i < frames.length; i++) {
      if (allowed()) activate(frames[i]); else block(frames[i]);
    }
    if (root && root.tagName === 'IFRAME' && root.hasAttribute('data-consent-src')) {
      if (allowed()) activate(root); else block(root);
    }
  }

  // ---------- banner ----------
  var banner = null;

  function closeBanner() {
    if (banner) { banner.remove(); banner = null; }
  }

  function openBanner() {
    if (banner) return;
    banner = document.createElement('div');
    banner.className = 'pw-consent';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', 'Cookie settings');
    banner.innerHTML =
      '<p><b>Your privacy</b>Our website does not track you. Some pages show maps, videos and social media posts ' +
      'from Google, YouTube, Instagram, Facebook and TikTok, which may set cookies. We only load them with your consent. ' +
      'You can change your choice at any time under Cookie settings. <a href="/privacy.html#cookies">Privacy Policy</a></p>' +
      '<div class="pw-consent-btns">' +
      '<button type="button" class="pw-btn pw-btn-main" data-choice="all">Accept all</button>' +
      '<button type="button" class="pw-btn pw-btn-alt" data-choice="necessary">Only necessary</button>' +
      '</div>';
    banner.addEventListener('click', function (e) {
      var b = e.target.closest('[data-choice]');
      if (b) setChoice(b.getAttribute('data-choice'));
    });
    document.body.appendChild(banner);
  }

  function setChoice(value) {
    var wasAllowed = allowed();
    choice = value;
    saveChoice(value);
    closeBanner();
    if (allowed()) {
      handle(document);
    } else if (wasAllowed) {
      // consent withdrawn: reload so already loaded embeds disappear
      window.location.reload();
    }
  }

  // ---------- start ----------
  function start() {
    handle(document);
    new MutationObserver(function (list) {
      for (var i = 0; i < list.length; i++) {
        var added = list[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          if (added[j].nodeType === 1) handle(added[j]);
        }
      }
    }).observe(document.body, { childList: true, subtree: true });
    if (!choice) openBanner();
    document.addEventListener('click', function (e) {
      var link = e.target.closest('[data-cookie-settings]');
      if (link) { e.preventDefault(); openBanner(); }
    });
  }

  window.PathwayConsent = { open: openBanner, allowed: allowed };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
