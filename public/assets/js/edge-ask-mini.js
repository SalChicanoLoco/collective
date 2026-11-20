(function () {
  'use strict';

  var form = document.getElementById('edgeMiniForm');
  var input = document.getElementById('edgeMiniInput');
  var out = document.getElementById('edgeMiniOut');
  if (!form || !input || !out) return;

  async function ask(q) {
    var lang = document.documentElement.lang === 'es' ? 'es' : 'en';
    out.hidden = false;
    out.textContent = lang === 'es' ? 'Consultando al borde...' : 'Asking Edge AI...';
    try {
      var res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q, lang: lang, history: [] }),
      });
      var data = await res.json();
      out.textContent = data.ok ? data.answer : data.error || 'Request failed.';
    } catch (_e) {
      out.textContent = 'Network error. Email salvadorsena@senacolectivo.com or call (505) 451-9341.';
    }
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q) return;
    ask(q);
  });

  document.querySelectorAll('.edge-mini__chip').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var q = btn.getAttribute('data-q') || '';
      if (!q) return;
      input.value = q;
      ask(q);
    });
  });
})();
