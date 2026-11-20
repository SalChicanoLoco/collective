(function () {
  'use strict';
  var tabs = document.querySelectorAll('[data-tab-target]');
  var panels = document.querySelectorAll('[data-tab-panel]');
  if (!tabs.length || !panels.length) return;

  tabs.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var target = btn.getAttribute('data-tab-target');
      tabs.forEach(function (t) {
        var active = t === btn;
        t.classList.toggle('button--primary', active);
        t.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      panels.forEach(function (p) {
        p.hidden = p.id !== target;
      });
    });
  });
})();
