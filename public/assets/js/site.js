// Language precedence (Salvador, 2026-11-20):
//   1) Manual EN/ES toggle — setLanguage() persists it, so it always wins.
//   2) Persisted sena_lang from a previous visit.
//   3) Browser/OS locale (navigator.languages[0] || navigator.language) on
//      first visit only — detection, never a guess, and never Google
//      Translate / any auto-translate widget (would break CSP and mangle the
//      curated ES copy). The ES content is ours; the locale only picks which
//      pack shows first.
// The inline boot script in BaseLayout.astro applies the same resolution
// before first paint (no wrong-language flash); this file owns the toggle
// and persists the choice.
(function () {
  var LANG_KEY = 'sena_lang';
  var THEME_KEY = 'sena_theme';
  var VALID_THEMES = ['lcars-hud', 'earth-gold', 'blueprint'];
  var root = document.documentElement;
  var body = document.body;

  function detectInitialLang() {
    var saved = localStorage.getItem(LANG_KEY);
    if (saved === 'en' || saved === 'es') return saved;
    var nav = (navigator.languages && navigator.languages[0]) || navigator.language || '';
    return nav.toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  }

  function setLanguage(lang) {
    var next = lang === 'es' ? 'es' : 'en';
    localStorage.setItem(LANG_KEY, next);
    root.lang = next;
    body.classList.toggle('lang-es', next === 'es');
    body.classList.toggle('lang-en', next === 'en');
    document.querySelectorAll('[data-lang-button]').forEach(function (button) {
      var active = button.getAttribute('data-lang-button') === next;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    // Let page scripts (e.g. the CAD Studio label sync) re-apply their own
    // language-dependent strings without a reload.
    window.dispatchEvent(new CustomEvent('sena:lang-change', { detail: next }));
  }

  function setTheme(theme) {
    var next = VALID_THEMES.indexOf(theme) !== -1 ? theme : 'lcars-hud';
    localStorage.setItem(THEME_KEY, next);
    root.setAttribute('data-theme', next);
    document.querySelectorAll('[data-theme-button]').forEach(function (button) {
      var active = button.getAttribute('data-theme-button') === next;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
    window.dispatchEvent(new CustomEvent('sena:theme-change', { detail: next }));
  }

  window.senaSetLanguage = setLanguage;
  window.senaSetTheme = setTheme;

  document.addEventListener('click', function (event) {
    var langBtn = event.target.closest('[data-lang-button]');
    if (langBtn) {
      setLanguage(langBtn.getAttribute('data-lang-button'));
      return;
    }
    var themeBtn = event.target.closest('[data-theme-button]');
    if (themeBtn) {
      setTheme(themeBtn.getAttribute('data-theme-button'));
    }
  });

  setLanguage(detectInitialLang());
  setTheme(localStorage.getItem(THEME_KEY) || 'lcars-hud');
})();
