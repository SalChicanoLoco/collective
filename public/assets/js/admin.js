(function () {
  'use strict';

  var el = function (id) {
    return document.getElementById(id);
  };
  var TOKEN_KEY = 'sena_admin_token';

  // Written ES, Salvador's voice — no machine translation. Dynamic status
  // strings pick their language from body.lang-es, like greenhouse-cad.js.
  function isES() {
    return document.body && document.body.classList.contains('lang-es');
  }

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
      if (statusEl) statusEl.textContent = isES() ? 'Bloqueado. Ingresa SUBSTRATE_TOKEN para desbloquear los endpoints de administración.' : 'Locked. Enter SUBSTRATE_TOKEN to unlock admin endpoints.';
      return;
    }
    if (statusEl) statusEl.textContent = isES() ? 'Consultando /api/admin/overview…' : 'Checking /api/admin/overview...';
    try {
      var res = await fetch('/api/admin/overview', { headers: authHeaders() });
      var data = await res.json();
      if (!res.ok || !data.ok) {
        if (statusEl) statusEl.textContent = (isES() ? 'Error de autenticación (HTTP ' : 'Auth error (HTTP ') + res.status + '): ' + (data.error || (isES() ? 'Denegado' : 'Denied'));
        return;
      }
      if (statusEl) statusEl.textContent = (isES() ? 'Conectado · ' : 'Connected · ') + data.siteUrl + ' · ' + data.timestamp;
      var s = data.substrate || {};
      var tiers = s.tiers || {};
      if (el('statTier1')) el('statTier1').textContent = tiers.tier1_deterministic ? (isES() ? 'En línea' : 'Online') : (isES() ? 'Sin conexión' : 'Offline');
      if (el('statTier2')) el('statTier2').textContent = tiers.tier2_edge_workers_ai ? (isES() ? 'En línea' : 'Online') : (isES() ? 'Respaldo' : 'Fallback');
      if (el('statTier3')) el('statTier3').textContent = tiers.tier3_custom_lm ? (isES() ? 'Conectado' : 'Connected') : (isES() ? 'Sin configurar' : 'Unconfigured');
      var rl = data.rateLimit || {};
      if (el('statRate')) el('statRate').textContent = (rl.limitPerMinute || 20) + '/min (' + (rl.activeTrackedIps || 0) + ' active)';
      if (data.config) {
        if (el('cfgAskEnabled')) el('cfgAskEnabled').checked = data.config.askEnabled !== false;
        if (el('cfgRateLimit')) el('cfgRateLimit').value = String(data.config.askRateLimitPerMin || 20);
        if (el('cfgFactsAppend')) el('cfgFactsAppend').value = data.config.edgeFactsAppend || '';
      }
      if (el('auditLogOutput')) {
        var logs = data.auditLog || [];
        el('auditLogOutput').textContent = logs.length
          ? logs.map(function (l) { return l.at + ' · ' + l.actor + ' (' + l.ipHash + ') · ' + l.action + ' — ' + l.summary; }).join('\n')
          : 'No config mutations recorded yet.';
      }
    } catch (_e) {
      if (statusEl) statusEl.textContent = isES() ? 'Error de red al consultar /api/admin/overview.' : 'Network error querying /api/admin/overview.';
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
    if (el('adminAuthStatus')) el('adminAuthStatus').textContent = isES() ? 'Bloqueado. Token eliminado de sessionStorage.' : 'Locked. Token cleared from sessionStorage.';
  });

  el('adminRefreshBtn')?.addEventListener('click', refreshOverview);

  el('runHealthBtn')?.addEventListener('click', async function () {
    var out = el('healthOutput');
    if (!out) return;
    out.textContent = isES() ? 'Verificando rutas…' : 'Checking routes...';
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
    out.textContent = isES() ? 'Ejecutando /api/audit…' : 'Running /api/audit...';
    try {
      var res = await fetch('/api/audit?url=' + encodeURIComponent(target), { headers: authHeaders() });
      var data = await res.json();
      out.textContent = JSON.stringify(data, null, 2);
    } catch (_e) {
      out.textContent = isES() ? 'Error de red al ejecutar /api/audit.' : 'Network error running /api/audit.';
    }
  });

  el('inferForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    var out = el('inferOutput');
    var prompt = (el('inferPromptInput')?.value || '').trim();
    if (!out || !prompt) return;
    out.textContent = isES() ? 'Ejecutando /api/substrate/infer…' : 'Running /api/substrate/infer...';
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
      out.textContent = isES() ? 'Error de red al ejecutar /api/substrate/infer.' : 'Network error running /api/substrate/infer.';
    }
  });

  el('opsConfigForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    var out = el('cfgSaveStatus');
    if (out) out.textContent = isES() ? 'Guardando en OPS_KV…' : 'Saving to OPS_KV...';
    try {
      var headers = Object.assign({ 'Content-Type': 'application/json' }, authHeaders());
      var res = await fetch('/api/admin/config', {
        method: 'PUT',
        headers: headers,
        body: JSON.stringify({
          askEnabled: Boolean(el('cfgAskEnabled')?.checked),
          askRateLimitPerMin: Number(el('cfgRateLimit')?.value || 20),
          edgeFactsAppend: el('cfgFactsAppend')?.value || '',
        }),
      });
      var data = await res.json();
      if (!res.ok || !data.ok) {
        if (out) out.textContent = data.error || 'Save failed (HTTP ' + res.status + ').';
        return;
      }
      if (out) out.textContent = (isES() ? 'Guardado: ' : 'Saved: ') + data.config.updatedAt;
      refreshOverview();
    } catch (_e) {
      if (out) out.textContent = isES() ? 'Error de red al guardar.' : 'Network error saving config.';
    }
  });

  // Re-render the status line when the visitor switches language.
  window.addEventListener('sena:lang-change', refreshOverview);

  refreshOverview();
})();
