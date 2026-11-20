(function () {
  'use strict';

  var el = function (id) {
    return document.getElementById(id);
  };
  var TOKEN_KEY = 'sena_admin_token';

  function getToken() {
    try {
      return sessionStorage.getItem(TOKEN_KEY) || '';
    } catch (_e) {
      return '';
    }
  }

  function setToken(t) {
    try {
      if (t) sessionStorage.setItem(TOKEN_KEY, t);
      else sessionStorage.removeItem(TOKEN_KEY);
    } catch (_e) {}
  }

  function authHeaders() {
    var t = getToken();
    return t ? { Authorization: 'Bearer ' + t } : {};
  }

  async function refreshOverview() {
    var statusEl = el('adminAuthStatus');
    var t = getToken();
    if (!t) {
      if (statusEl) statusEl.textContent = 'Locked. Enter SUBSTRATE_TOKEN to unlock admin endpoints.';
      return;
    }
    if (statusEl) statusEl.textContent = 'Checking /api/admin/overview...';
    try {
      var res = await fetch('/api/admin/overview', { headers: authHeaders() });
      var data = await res.json();
      if (!res.ok || !data.ok) {
        if (statusEl) statusEl.textContent = 'Auth error (HTTP ' + res.status + '): ' + (data.error || 'Denied');
        return;
      }
      if (statusEl) statusEl.textContent = 'Connected · ' + data.siteUrl + ' · ' + data.timestamp;
      var s = data.substrate || {};
      var tiers = s.tiers || {};
      if (el('statTier1')) el('statTier1').textContent = tiers.tier1_deterministic ? 'Online' : 'Offline';
      if (el('statTier2')) el('statTier2').textContent = tiers.tier2_edge_workers_ai ? 'Online' : 'Fallback';
      if (el('statTier3')) el('statTier3').textContent = tiers.tier3_custom_lm ? 'Connected' : 'Unconfigured';
      var rl = data.rateLimit || {};
      if (el('statRate')) el('statRate').textContent = (rl.limitPerMinute || 20) + '/min (' + (rl.activeTrackedIps || 0) + ' active)';
    } catch (_e) {
      if (statusEl) statusEl.textContent = 'Network error querying /api/admin/overview.';
    }
  }

  el('adminAuthForm')?.addEventListener('submit', function (e) {
    e.preventDefault();
    var val = (el('adminTokenInput')?.value || '').trim();
    if (!val) return;
    setToken(val);
    el('adminTokenInput').value = '';
    refreshOverview();
  });

  el('adminLockBtn')?.addEventListener('click', function () {
    setToken('');
    if (el('statTier1')) el('statTier1').textContent = '—';
    if (el('statTier2')) el('statTier2').textContent = '—';
    if (el('statTier3')) el('statTier3').textContent = '—';
    if (el('statRate')) el('statRate').textContent = '—';
    if (el('adminAuthStatus')) el('adminAuthStatus').textContent = 'Locked. Token cleared from sessionStorage.';
  });

  el('adminRefreshBtn')?.addEventListener('click', refreshOverview);

  el('runHealthBtn')?.addEventListener('click', async function () {
    var out = el('healthOutput');
    if (!out) return;
    out.textContent = 'Checking routes...';
    var paths = ['/', '/tools/', '/projects/', '/publications/', '/colophon/', '/commons-greenhouse-calculator-secure/', '/api/health', '/api/substrate/status'];
    var lines = [];
    for (var i = 0; i < paths.length; i++) {
      try {
        var r = await fetch(paths[i], { method: 'GET' });
        lines.push(paths[i] + ' -> HTTP ' + r.status);
      } catch (_e) {
        lines.push(paths[i] + ' -> ERROR');
      }
    }
    out.textContent = lines.join('\n');
  });

  el('auditForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    var out = el('auditOutput');
    var target = (el('auditUrlInput')?.value || '').trim();
    if (!out || !target) return;
    out.textContent = 'Running /api/audit...';
    try {
      var res = await fetch('/api/audit?url=' + encodeURIComponent(target), { headers: authHeaders() });
      var data = await res.json();
      out.textContent = JSON.stringify(data, null, 2);
    } catch (_e) {
      out.textContent = 'Network error running /api/audit.';
    }
  });

  el('inferForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    var out = el('inferOutput');
    var prompt = (el('inferPromptInput')?.value || '').trim();
    if (!out || !prompt) return;
    out.textContent = 'Running /api/substrate/infer...';
    try {
      var headers = Object.assign({ 'Content-Type': 'application/json' }, authHeaders());
      var res = await fetch('/api/substrate/infer', {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({ prompt: prompt }),
      });
      var data = await res.json();
      out.textContent = JSON.stringify(data, null, 2);
    } catch (_e) {
      out.textContent = 'Network error running /api/substrate/infer.';
    }
  });

  refreshOverview();
})();
