(function () {
  var form = document.getElementById('audit-form');
  var input = document.getElementById('audit-url');
  var statusEl = document.getElementById('audit-status');
  var resultsEl = document.getElementById('audit-results');
  if (!form || !input || !statusEl || !resultsEl) return;

  function makeCard(kicker, title, body) {
    var card = document.createElement('article');
    card.className = 'card';
    var k = document.createElement('div');
    k.className = 'kicker';
    k.textContent = kicker;
    var h = document.createElement('h3');
    h.textContent = title;
    var p = document.createElement('p');
    p.textContent = body;
    card.appendChild(k);
    card.appendChild(h);
    card.appendChild(p);
    return card;
  }

  form.addEventListener('submit', async function (event) {
    event.preventDefault();
    var target = input.value.trim();
    if (!target) return;

    statusEl.textContent = 'Running edge audit...';
    resultsEl.hidden = true;
    resultsEl.textContent = '';

    try {
      var res = await fetch('/api/audit?url=' + encodeURIComponent(target));
      var data = await res.json();

      if (!res.ok || !data.ok) {
        statusEl.textContent = data.error || 'Audit failed (HTTP ' + res.status + ').';
        return;
      }

      statusEl.textContent = 'Audit complete for ' + data.url + ' (HTTP ' + data.status + ').';
      resultsEl.appendChild(
        makeCard(
          'HTTP & Title',
          'Status ' + data.status,
          data.signals.title ? 'Title: ' + data.signals.title : 'No <title> tag detected.',
        ),
      );
      resultsEl.appendChild(
        makeCard(
          'Security Headers',
          data.missingHeaders.length === 0
            ? 'All 6 present'
            : data.missingHeaders.length + ' missing',
          data.missingHeaders.length === 0
            ? 'CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy.'
            : 'Missing: ' + data.missingHeaders.join(', '),
        ),
      );
      resultsEl.appendChild(
        makeCard(
          'External Assets',
          data.signals.externalScripts + ' scripts · ' + data.signals.externalStylesheets + ' stylesheets',
          'Measured from the first 200 KB of HTML.',
        ),
      );
      resultsEl.hidden = false;
    } catch {
      statusEl.textContent = 'Network error while contacting /api/audit. Please try again.';
    }
  });
})();
