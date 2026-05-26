// Sena Colectivo shared UI: bilingual toggle only.
(function () {
  var STORAGE_KEY = 'sena_lang';
  var root = document.documentElement;
  var body = document.body;

  function detectInitialLang() {
    var saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'es') return saved;
    return (navigator.language || '').toLowerCase().indexOf('es') === 0 ? 'es' : 'en';
  }

  function setLanguage(lang) {
    var next = lang === 'es' ? 'es' : 'en';
    localStorage.setItem(STORAGE_KEY, next);
    root.lang = next;
    body.classList.toggle('lang-es', next === 'es');
    body.classList.toggle('lang-en', next === 'en');
    var buttons = document.querySelectorAll('[data-lang-button]');
    buttons.forEach(function (button) {
      var active = button.getAttribute('data-lang-button') === next;
      button.setAttribute('aria-pressed', active ? 'true' : 'false');
    });
  }

  window.senaSetLanguage = setLanguage;
  document.addEventListener('click', function (event) {
    var target = event.target.closest('[data-lang-button]');
    if (!target) return;
    setLanguage(target.getAttribute('data-lang-button'));
  });

  setLanguage(detectInitialLang());
})();
