(function () {
  'use strict';

  var el = function (id) { return document.getElementById(id); };

  var magInput = el('qzMagInput');
  var magVal = el('qzMagVal');
  var energyOut = el('qzEnergyOut');
  var tntOut = el('qzTntOut');
  var fetchBtn = el('qzFetchBtn');
  var kmlBtn = el('qzKmlBtn');
  var geoJsonBtn = el('qzGeoJsonBtn');
  var statusEl = el('qzStatus');
  var bodyEl = el('qzEventsBody');
  var globe = el('qzGlobe');

  var PRESETS = {
    nm: { lat: 35.7, lon: -105.9, r: 500, label: 'Northern NM / Rio Grande Rift' },
    yellowstone: { lat: 44.4, lon: -110.6, r: 300, label: 'Yellowstone Caldera' },
    ca: { lat: 34.0, lon: -118.4, r: 400, label: 'SoCal / San Andreas' },
    ak: { lat: 57.0, lon: -154.0, r: 600, label: 'Alaska Subduction' },
  };

  var state = {
    events: [],
    rotLon: -105.9,
    rotLat: 35.0,
    dragging: false,
    lastX: 0,
    lastY: 0,
  };

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

  function haversineKm(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var dLat = ((lat2 - lat1) * Math.PI) / 180;
    var dLon = ((lon2 - lon1) * Math.PI) / 180;
    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getAoi() {
    return {
      lat: parseFloat(el('qzAoiLat')?.value || '35.7') || 35.7,
      lon: parseFloat(el('qzAoiLon')?.value || '-105.9') || -105.9,
      radiusKm: Math.max(50, parseFloat(el('qzAoiRadius')?.value || '500') || 500),
    };
  }

  function projectPoint(latDeg, lonDeg, cx, cy, R) {
    var phi = (latDeg * Math.PI) / 180;
    var lam = ((lonDeg - state.rotLon) * Math.PI) / 180;
    var phi0 = (state.rotLat * Math.PI) / 180;
    var cosC = Math.sin(phi0) * Math.sin(phi) + Math.cos(phi0) * Math.cos(phi) * Math.cos(lam);
    var x = R * Math.cos(phi) * Math.sin(lam);
    var y = R * (Math.cos(phi0) * Math.sin(phi) - Math.sin(phi0) * Math.cos(phi) * Math.cos(lam));
    return { x: cx + x, y: cy - y, visible: cosC >= 0 };
  }

  function drawGlobe() {
    if (!globe) return;
    var ctx = globe.getContext('2d');
    var w = globe.width;
    var h = globe.height;
    var cx = w / 2;
    var cy = h / 2;
    var R = Math.min(w, h) * 0.41;

    var cs = getComputedStyle(document.documentElement);
    var bg = cs.getPropertyValue('--bg').trim() || '#070a0f';
    var accent = cs.getPropertyValue('--accent').trim() || '#4cc9f0';
    var accent2 = cs.getPropertyValue('--accent-2').trim() || '#f4a261';
    var border = cs.getPropertyValue('--border-strong').trim() || 'rgba(76,201,240,0.4)';

    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Outer limb
    ctx.beginPath();
    ctx.arc(cx, cy, R, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(13, 19, 28, 0.72)';
    ctx.fill();
    ctx.strokeStyle = border;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Graticule (lat/lon grid)
    ctx.strokeStyle = 'rgba(158, 176, 196, 0.16)';
    ctx.lineWidth = 0.8;
    for (var lat = -60; lat <= 60; lat += 30) {
      ctx.beginPath();
      var started = false;
      for (var lon = -180; lon <= 180; lon += 10) {
        var p = projectPoint(lat, lon, cx, cy, R);
        if (p.visible) {
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        } else started = false;
      }
      ctx.stroke();
    }
    for (var lonG = -180; lonG < 180; lonG += 30) {
      ctx.beginPath();
      var startedG = false;
      for (var latG = -85; latG <= 85; latG += 5) {
        var pG = projectPoint(latG, lonG, cx, cy, R);
        if (pG.visible) {
          if (!startedG) { ctx.moveTo(pG.x, pG.y); startedG = true; }
          else ctx.lineTo(pG.x, pG.y);
        } else startedG = false;
      }
      ctx.stroke();
    }

    // AOI ring + center target
    var aoi = getAoi();
    var angRad = (aoi.radiusKm / 6371) * (180 / Math.PI);
    ctx.beginPath();
    var startedA = false;
    for (var a = 0; a <= 360; a += 10) {
      var rad = (a * Math.PI) / 180;
      var pLat = aoi.lat + angRad * Math.cos(rad);
      var pLon = aoi.lon + (angRad / Math.max(0.2, Math.cos((aoi.lat * Math.PI) / 180))) * Math.sin(rad);
      var pt = projectPoint(pLat, pLon, cx, cy, R);
      if (pt.visible) {
        if (!startedA) { ctx.moveTo(pt.x, pt.y); startedA = true; }
        else ctx.lineTo(pt.x, pt.y);
      } else startedA = false;
    }
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 4]);
    ctx.stroke();
    ctx.setLineDash([]);

    var centerPt = projectPoint(aoi.lat, aoi.lon, cx, cy, R);
    if (centerPt.visible) {
      ctx.fillStyle = accent;
      ctx.beginPath();
      ctx.arc(centerPt.x, centerPt.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
    }

    // Live USGS seismic pins
    state.events.forEach(function (ev) {
      var ptE = projectPoint(ev.lat, ev.lon, cx, cy, R);
      if (!ptE.visible) return;
      var r = Math.max(3, Math.min(11, (ev.mag - 1.8) * 2.2));
      ctx.beginPath();
      ctx.arc(ptE.x, ptE.y, r, 0, Math.PI * 2);
      ctx.fillStyle = ev.inAoi ? accent : accent2;
      ctx.globalAlpha = 0.85;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 0.8;
      ctx.stroke();
    });

    ctx.fillStyle = 'rgba(232,238,245,0.8)';
    ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('3D GLOBE · AOI ' + aoi.lat.toFixed(1) + '°, ' + aoi.lon.toFixed(1) + '° (R=' + aoi.radiusKm + ' km)', 12, 20);
  }

  function updateAoiAndForecast() {
    var aoi = getAoi();
    var inAoi = 0;
    var sumJ = 0;
    var sumM3 = 0;
    state.events.forEach(function (ev) {
      var d = haversineKm(aoi.lat, aoi.lon, ev.lat, ev.lon);
      ev.distKm = Math.round(d);
      ev.inAoi = d <= aoi.radiusKm;
      if (ev.inAoi) {
        inAoi += 1;
        sumJ += ev.energyJoules;
        if (ev.mag >= 3.0) sumM3 += 1;
      }
    });

    // Experimental 7-day Poisson exceedance: P = 1 - exp(-lambda_7d)
    var rate24hM3 = Math.max(0.02, sumM3 || inAoi * 0.35);
    var lambda7dM3 = rate24hM3 * 7;
    var lambda7dM4 = lambda7dM3 * 0.1; // Gutenberg-Richter b ~ 1.0
    var lambda7dM5 = lambda7dM3 * 0.01;
    var pStr = function (lam) { return ((1 - Math.exp(-lam)) * 100).toFixed(1) + '%'; };

    if (el('qzAoiCount')) el('qzAoiCount').textContent = String(inAoi);
    if (el('qzAoiEnergy')) el('qzAoiEnergy').textContent = formatEnergy(sumJ);
    if (el('qzProbM3')) el('qzProbM3').textContent = state.events.length ? pStr(lambda7dM3) : 'Load feed';
    if (el('qzProbM4')) el('qzProbM4').textContent = state.events.length ? pStr(lambda7dM4) : 'Load feed';
    if (el('qzProbM5')) el('qzProbM5').textContent = state.events.length ? pStr(lambda7dM5) : 'Load feed';

    if (bodyEl) {
      bodyEl.textContent = '';
      state.events.forEach(function (ev) {
        var tr = document.createElement('tr');
        [
          'M ' + Number(ev.mag).toFixed(1),
          ev.place,
          ev.lat.toFixed(2) + '°, ' + ev.lon.toFixed(2) + '°',
          ev.depthKm + ' km',
          ev.energyGj + ' GJ',
          ev.distKm + ' km' + (ev.inAoi ? ' (AOI)' : ''),
          ev.timeUtc,
        ].forEach(function (val) {
          var td = document.createElement('td');
          td.textContent = String(val);
          tr.appendChild(td);
        });
        bodyEl.appendChild(tr);
      });
    }
    drawGlobe();
  }

  el('qzAoiPreset')?.addEventListener('change', function (e) {
    var p = PRESETS[e.target.value];
    if (!p) return;
    if (el('qzAoiLat')) el('qzAoiLat').value = String(p.lat);
    if (el('qzAoiLon')) el('qzAoiLon').value = String(p.lon);
    if (el('qzAoiRadius')) el('qzAoiRadius').value = String(p.r);
    state.rotLat = p.lat;
    state.rotLon = p.lon;
    updateAoiAndForecast();
  });

  ['qzAoiLat', 'qzAoiLon', 'qzAoiRadius'].forEach(function (id) {
    el(id)?.addEventListener('input', updateAoiAndForecast);
  });

  if (globe) {
    globe.addEventListener('pointerdown', function (e) {
      state.dragging = true;
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      globe.setPointerCapture(e.pointerId);
    });
    globe.addEventListener('pointermove', function (e) {
      if (!state.dragging) return;
      state.rotLon -= (e.clientX - state.lastX) * 0.4;
      state.rotLat = Math.max(-85, Math.min(85, state.rotLat + (e.clientY - state.lastY) * 0.4));
      state.lastX = e.clientX;
      state.lastY = e.clientY;
      drawGlobe();
    });
    globe.addEventListener('pointerup', function () { state.dragging = false; });
  }

  function downloadFile(name, content, mime) {
    var blob = new Blob([content], { type: mime });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  function escXml(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  kmlBtn?.addEventListener('click', function () {
    var aoi = getAoi();
    var angRad = (aoi.radiusKm / 6371) * (180 / Math.PI);
    var ringCoords = [];
    for (var a = 0; a <= 360; a += 15) {
      var rad = (a * Math.PI) / 180;
      var pLat = aoi.lat + angRad * Math.cos(rad);
      var pLon = aoi.lon + (angRad / Math.max(0.2, Math.cos((aoi.lat * Math.PI) / 180))) * Math.sin(rad);
      ringCoords.push(pLon.toFixed(4) + ',' + pLat.toFixed(4) + ',0');
    }
    var placemarks = state.events
      .map(function (ev) {
        return (
          '<Placemark><name>' +
          escXml('M' + ev.mag.toFixed(1) + ' — ' + ev.place) +
          '</name><description>' +
          escXml('Depth: ' + ev.depthKm + ' km | Energy: ' + ev.energyGj + ' GJ | UTC: ' + ev.timeUtc) +
          '</description><Point><coordinates>' +
          ev.lon + ',' + ev.lat + ',0</coordinates></Point></Placemark>'
        );
      })
      .join('');
    var kml =
      '<?xml version="1.0" encoding="UTF-8"?>' +
      '<kml xmlns="http://www.opengis.net/kml/2.2"><Document>' +
      '<name>Quetzal Geophysics AOI &amp; Seismic Telemetry</name>' +
      '<Placemark><name>AOI (' + aoi.radiusKm + ' km)</name><LineString><tessellate>1</tessellate><coordinates>' +
      ringCoords.join(' ') +
      '</coordinates></LineString></Placemark>' +
      placemarks +
      '</Document></kml>';
    downloadFile('quetzal-seismic-aoi.kml', kml, 'application/vnd.google-earth.kml+xml');
  });

  geoJsonBtn?.addEventListener('click', function () {
    var gj = {
      type: 'FeatureCollection',
      aoi: getAoi(),
      features: state.events.map(function (ev) {
        return {
          type: 'Feature',
          geometry: { type: 'Point', coordinates: [ev.lon, ev.lat, ev.depthKm] },
          properties: { mag: ev.mag, place: ev.place, energyGj: ev.energyGj, timeUtc: ev.timeUtc, inAoi: ev.inAoi },
        };
      }),
    };
    downloadFile('quetzal-seismic-aoi.geojson', JSON.stringify(gj, null, 2), 'application/geo+json');
  });

  fetchBtn?.addEventListener('click', async function () {
    if (!statusEl) return;
    statusEl.textContent = 'Querying /api/quetzal/seismic...';
    try {
      var res = await fetch('/api/quetzal/seismic');
      var data = await res.json();
      if (!res.ok || !data.ok) {
        statusEl.textContent = data.error || 'Request failed (HTTP ' + res.status + ').';
        return;
      }
      state.events = data.events || [];
      statusEl.textContent =
        data.datasource +
        ' · ' +
        data.classification +
        ' · ' +
        (data.cached ? 'KV Cache Hit' : 'Fresh Fetch') +
        ' · ' +
        state.events.length +
        ' events plotted · ' +
        data.retrievedAt;
      updateAoiAndForecast();
    } catch (_e) {
      statusEl.textContent = 'Network error querying /api/quetzal/seismic.';
    }
  });

  window.addEventListener('sena:theme-change', drawGlobe);
  updateAoiAndForecast();
})();
