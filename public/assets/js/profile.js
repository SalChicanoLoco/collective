(function () {
  'use strict';

  var el = function (id) {
    return document.getElementById(id);
  };

  async function init() {
    var provRes = await fetch('/api/auth/providers').then(function (r) { return r.json(); }).catch(function () { return null; });
    if (provRes && provRes.ok) {
      var p = provRes.providers || {};
      var ready = [];
      if (p.google) ready.push('Google');
      if (p.microsoft) ready.push('Microsoft');
      if (p.meta) ready.push('Meta');
      if (el('providerStatus')) {
        el('providerStatus').textContent = ready.length
          ? 'Active providers: ' + ready.join(', ') + ' · Storage: ' + provRes.profileStorage
          : 'Fail-closed: OAuth secrets not configured on this Worker yet (AUTH_SESSION_SECRET + provider Client ID/Secret).';
      }
      if (!p.google && el('loginGoogleBtn')) el('loginGoogleBtn').setAttribute('aria-disabled', 'true');
      if (!p.microsoft && el('loginMicrosoftBtn')) el('loginMicrosoftBtn').setAttribute('aria-disabled', 'true');
      if (!p.meta && el('loginMetaBtn')) el('loginMetaBtn').setAttribute('aria-disabled', 'true');
    }

    var sess = await fetch('/api/auth/session').then(function (r) { return r.json(); }).catch(function () { return null; });
    if (!sess || !sess.authenticated || !sess.user) return;

    if (el('signInPanel')) el('signInPanel').hidden = true;
    if (el('profilePanel')) el('profilePanel').hidden = false;
    if (el('profileIdentityKicker')) {
      el('profileIdentityKicker').textContent =
        sess.user.provider.toUpperCase() + ' · ' + (sess.user.email || sess.user.id) + ' · ' + sess.user.role.toUpperCase();
    }
    if (el('profileHeading')) el('profileHeading').textContent = sess.user.name || 'Member Profile';
    if (sess.user.role === 'admin' && el('adminLinkBtn')) el('adminLinkBtn').hidden = false;

    var profRes = await fetch('/api/profile').then(function (r) { return r.json(); }).catch(function () { return null; });
    if (profRes && profRes.ok && profRes.profile) {
      var pr = profRes.profile;
      if (el('profDisplayName')) el('profDisplayName').value = pr.displayName || '';
      if (el('profHandle')) el('profHandle').value = pr.handle || '';
      if (el('profRegion')) el('profRegion').value = pr.region || '';
      if (el('profTheme')) el('profTheme').value = pr.preferredTheme || 'hud';
      if (el('profLang')) el('profLang').value = pr.preferredLang || 'en';
      if (el('profUnits')) el('profUnits').value = pr.preferredUnits || 'imperial';
      if (el('profBio')) el('profBio').value = pr.bio || '';
    }
  }

  el('profileForm')?.addEventListener('submit', async function (e) {
    e.preventDefault();
    var status = el('profileSaveStatus');
    if (status) status.textContent = 'Saving...';
    var payload = {
      displayName: el('profDisplayName')?.value || '',
      handle: el('profHandle')?.value || '',
      region: el('profRegion')?.value || '',
      preferredTheme: el('profTheme')?.value || 'hud',
      preferredLang: el('profLang')?.value || 'en',
      preferredUnits: el('profUnits')?.value || 'imperial',
      bio: el('profBio')?.value || '',
    };
    try {
      var res = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json();
      if (!res.ok || !data.ok) {
        if (status) status.textContent = data.error || 'Failed to save profile.';
        return;
      }
      try {
        localStorage.setItem('sena_theme', data.profile.preferredTheme);
        localStorage.setItem('sena_lang', data.profile.preferredLang);
        localStorage.setItem('sena_cad_units', data.profile.preferredUnits);
        document.documentElement.dataset.theme = data.profile.preferredTheme;
        document.documentElement.lang = data.profile.preferredLang;
      } catch (_e) {}
      if (status) status.textContent = 'Saved (' + data.profile.updatedAt + ')';
    } catch (_e) {
      if (status) status.textContent = 'Network error saving profile.';
    }
  });

  el('logoutBtn')?.addEventListener('click', async function () {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.reload();
  });

  init();
})();
