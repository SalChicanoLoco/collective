(function () {
  var form = document.getElementById('ask-form');
  var input = document.getElementById('ask-input');
  var statusEl = document.getElementById('ask-status');
  var answerBox = document.getElementById('ask-answer');
  var answerText = document.getElementById('ask-answer-text');
  var answerMode = document.getElementById('ask-answer-mode');
  if (!form || !input || !statusEl || !answerBox || !answerText || !answerMode) return;

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (!question) return;

    statusEl.textContent =
      document.documentElement.lang === 'es' ? 'Consultando al borde...' : 'Asking the edge...';
    answerBox.hidden = true;

    try {
      var res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question }),
      });
      var data = await res.json();

      if (!res.ok || !data.ok) {
        statusEl.textContent = data.error || 'Request failed (HTTP ' + res.status + ').';
        return;
      }

      statusEl.textContent = '';
      answerMode.textContent =
        data.mode === 'workers-ai' ? 'Cloudflare Workers AI · Edge' : 'Direct fallback';
      answerText.textContent = data.answer;
      answerBox.hidden = false;
    } catch {
      statusEl.textContent =
        document.documentElement.lang === 'es'
          ? 'Error de red. Escribe a salvadorsena@senacolectivo.com o llama al (505) 451-9341.'
          : 'Network error. Write to salvadorsena@senacolectivo.com or call (505) 451-9341.';
    }
  });
})();
