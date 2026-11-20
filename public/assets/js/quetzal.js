(function () {
  'use strict';

  var magInput = document.getElementById('qzMagInput');
  var magVal = document.getElementById('qzMagVal');
  var energyOut = document.getElementById('qzEnergyOut');
  var tntOut = document.getElementById('qzTntOut');
  var fetchBtn = document.getElementById('qzFetchBtn');
  var statusEl = document.getElementById('qzStatus');
  var bodyEl = document.getElementById('qzEventsBody');

  function formatEnergy(j) {
    if (j >= 1e15) return (j / 1e15).toFixed(2) + ' PJ';
    if (j >= 1e9) return (j / 1e9).toFixed(2) + ' GJ';
    if (j >= 1e6) return (j / 1e6).toFixed(2) + ' MJ';
    return j.toExponential(2) + ' J';
  }

  function updateCalc() {
    if (!magInput) return;
    var m = parseFloat(magInput.value) || 3.5;
    if (magVal) magVal.textContent = m.toFixed(1);
    var j = Math.pow(10, 4.8 + 1.5 * m);
    var tonsTnt = j / 4.184e9;
    if (energyOut) energyOut.textContent = formatEnergy(j);
    if (tntOut) {
      tntOut.textContent =
        tonsTnt >= 1e6
          ? (tonsTnt / 1e6).toFixed(2) + ' Mt TNT'
          : tonsTnt >= 1e3
            ? (tonsTnt / 1e3).toFixed(2) + ' kt TNT'
            : tonsTnt.toFixed(2) + ' t TNT';
    }
  }

  magInput?.addEventListener('input', updateCalc);
  updateCalc();

  fetchBtn?.addEventListener('click', async function () {
    if (!statusEl || !bodyEl) return;
    statusEl.textContent = 'Querying /api/quetzal/seismic...';
    try {
      var res = await fetch('/api/quetzal/seismic');
      var data = await res.json();
      if (!res.ok || !data.ok) {
        statusEl.textContent = data.error || 'Request failed (HTTP ' + res.status + ').';
        return;
      }
      statusEl.textContent =
        data.datasource +
        ' · ' +
        data.classification +
        ' · ' +
        (data.cached ? 'KV Cache Hit' : 'Fresh Fetch') +
        ' · ' +
        data.retrievedAt;
      bodyEl.textContent = '';
      (data.events || []).forEach(function (ev) {
        var tr = document.createElement('tr');
        [
          'M ' + Number(ev.mag).toFixed(1),
          ev.place,
          ev.depthKm + ' km',
          ev.energyGj + ' GJ',
          ev.timeUtc,
        ].forEach(function (val) {
          var td = document.createElement('td');
          td.textContent = String(val);
          tr.appendChild(td);
        });
        bodyEl.appendChild(tr);
      });
    } catch (_e) {
      statusEl.textContent = 'Network error querying /api/quetzal/seismic.';
    }
  });
})();
