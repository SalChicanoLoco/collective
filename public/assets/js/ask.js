(function () {
  var form = document.getElementById('ask-form');
  var input = document.getElementById('ask-input');
  var statusEl = document.getElementById('ask-status');
  var answerBox = document.getElementById('ask-answer');
  var threadEl = document.getElementById('ask-thread');
  var answerMode = document.getElementById('ask-answer-mode');
  var clearBtn = document.getElementById('ask-clear');
  if (!form || !input || !statusEl || !answerBox || !threadEl || !answerMode) return;

  var history = [];

  function appendTurn(role, text) {
    var item = document.createElement('div');
    item.style.marginTop = '0.75rem';
    item.style.paddingTop = '0.75rem';
    item.style.borderTop = threadEl.childElementCount ? '1px solid var(--border)' : 'none';

    var label = document.createElement('div');
    label.className = 'kicker';
    label.textContent =
      role === 'user'
        ? document.documentElement.lang === 'es'
          ? 'Tú'
          : 'You'
        : 'Edge AI';

    var body = document.createElement('p');
    body.style.margin = '0.25rem 0 0';
    body.textContent = text;

    item.appendChild(label);
    item.appendChild(body);
    threadEl.appendChild(item);
  }

  if (clearBtn) {
    clearBtn.addEventListener('click', function () {
      history = [];
      threadEl.textContent = '';
      answerBox.hidden = true;
      statusEl.textContent = '';
    });
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var question = input.value.trim();
    if (!question) return;

    var lang = document.documentElement.lang === 'es' ? 'es' : 'en';
    statusEl.textContent = lang === 'es' ? 'Consultando al borde...' : 'Asking the edge...';

    try {
      var res = await fetch('/api/ask', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: question, lang: lang, history: history }),
      });
      var data = await res.json();

      if (!res.ok || !data.ok) {
        statusEl.textContent = data.error || 'Request failed (HTTP ' + res.status + ').';
        return;
      }

      statusEl.textContent = '';
      answerMode.textContent =
        data.mode === 'workers-ai' ? 'Cloudflare Workers AI · Edge' : 'Direct fallback';
      appendTurn('user', question);
      appendTurn('assistant', data.answer);
      history.push({ role: 'user', content: question }, { role: 'assistant', content: data.answer });
      if (history.length > 6) history = history.slice(-6);
      input.value = '';
      answerBox.hidden = false;
    } catch {
      statusEl.textContent =
        lang === 'es'
          ? 'Error de red. Escribe a salvadorsena@senacolectivo.com o llama al (505) 451-9341.'
          : 'Network error. Write to salvadorsena@senacolectivo.com or call (505) 451-9341.';
    }
  });
})();
