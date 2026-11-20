(function () {
  'use strict';

  var el = function (id) {
    return document.getElementById(id);
  };
  var NS = 'http://www.w3.org/2000/svg';

  var FT_TO_M = 0.3048;
  var SQFT_TO_SQM = 0.09290304;
  var GAL_TO_L = 3.78541;
  var BTUF_TO_KJK = 1.8991005;

  var state = {
    units: 'imperial',
    lengthFt: 32,
    widthFt: 16,
    spacingFt: 4,
    aisleFt: 2.5,
    bermFt: 2.5,
    trenchFt: 1.5,
    ridgeFt: 9.5,
    tier: 'balanced',
    showBarrels: true,
    showAirTube: true,
    wireframe: false,
    yaw: -0.62,
    pitch: 0.42,
    zoom: 1.0,
  };

  var FIELD_SPECS = [
    { id: 'lengthFt', minFt: 12, maxFt: 96, stepFt: 2, stepM: 0.5, fallbackFt: 32, labelId: 'lengthLabel', name: 'Length X', nameEs: 'Largo X' },
    { id: 'widthFt', minFt: 10, maxFt: 32, stepFt: 2, stepM: 0.5, fallbackFt: 16, labelId: 'widthLabel', name: 'Width Y', nameEs: 'Ancho Y' },
    { id: 'spacingFt', minFt: 2, maxFt: 8, stepFt: 0.5, stepM: 0.1, fallbackFt: 4, labelId: 'spacingLabel', name: 'Hoop Spacing', nameEs: 'Separación de arcos' },
    { id: 'aisleFt', minFt: 1.5, maxFt: 5, stepFt: 0.5, stepM: 0.1, fallbackFt: 2.5, labelId: 'aisleLabel', name: 'Central Aisle', nameEs: 'Pasillo central' },
    { id: 'bermFt', minFt: 0, maxFt: 6, stepFt: 0.5, stepM: 0.1, fallbackFt: 2.5, labelId: 'bermLabel', name: 'North Earth Berm', nameEs: 'Berma de tierra norte' },
    { id: 'trenchFt', minFt: 0, maxFt: 4, stepFt: 0.5, stepM: 0.1, fallbackFt: 1.5, labelId: 'trenchLabel', name: 'Sunken Trench Depth', nameEs: 'Profundidad de trinchera' },
  ];

  function isSI() {
    return state.units === 'si';
  }

  function fmtLen(ft, decimals) {
    if (isSI()) return (ft * FT_TO_M).toFixed(decimals == null ? 2 : decimals) + ' m';
    return (decimals == null ? Number(ft.toFixed(1)) : ft.toFixed(decimals)) + ' ft';
  }

  function fmtLenShort(ft) {
    if (isSI()) return (ft * FT_TO_M).toFixed(2) + ' m';
    return Number(ft.toFixed(1)) + "'";
  }

  // Bilingual labels for the strings this script rewrites (unit toggle).
  // Written ES, Salvador's voice — no machine translation. The static
  // markup carries paired .en/.es spans; these JS-managed labels pick
  // their language from the body class instead.
  function isES() {
    return document.body && document.body.classList.contains('lang-es');
  }

  var TIERS = {
    salvage: { label: 'Scrappy Salvage', labelEs: 'Recuperación austera', rate: 1.85, desc: 'Reclaimed lumber, salvaged barrels, poly film' },
    balanced: { label: 'Balanced Low-Cost', labelEs: 'Equilibrado económico', rate: 4.25, desc: 'EMT/PVC hoops, UV poly, 55-gal barrels, earth berm' },
    upgraded: { label: 'Upgraded Kit', labelEs: 'Kit mejorado', rate: 8.5, desc: 'Galvanized steel, twin-wall polycarbonate, geothermal loop' },
  };

  function clamp(v, min, max, fallback) {
    var n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function syncUnitLabels() {
    var si = isSI();
    var es = isES();
    if (el('dimKicker')) el('dimKicker').textContent = si
      ? (es ? 'Dimensiones (m)' : 'Dimensions (m)')
      : (es ? 'Dimensiones (ft)' : 'Dimensions (ft)');
    if (el('earthKicker')) el('earthKicker').textContent = si
      ? (es ? 'Movimiento de tierra y pasillo (m)' : 'Earthworks & Aisle (m)')
      : (es ? 'Movimiento de tierra y pasillo (ft)' : 'Earthworks & Aisle (ft)');
    FIELD_SPECS.forEach(function (f) {
      var input = el(f.id);
      var lbl = el(f.labelId);
      if (input) {
        input.min = si ? (f.minFt * FT_TO_M).toFixed(2) : String(f.minFt);
        input.max = si ? (f.maxFt * FT_TO_M).toFixed(2) : String(f.maxFt);
        input.step = si ? String(f.stepM) : String(f.stepFt);
      }
      if (lbl) {
        var name = es ? (f.nameEs || f.name) : f.name;
        lbl.textContent = si
          ? name + ' (' + (f.minFt * FT_TO_M).toFixed(1) + '–' + (f.maxFt * FT_TO_M).toFixed(1) + ' m)'
          : name + ' (' + f.minFt + '–' + f.maxFt + ' ft)';
      }
    });
    var tierSel = el('buildTier');
    if (tierSel) {
      Array.prototype.forEach.call(tierSel.options, function (opt) {
        var t = TIERS[opt.value];
        if (!t) return;
        var label = es ? (t.labelEs || t.label) : t.label;
        opt.textContent = si
          ? label + ' ($' + (t.rate / SQFT_TO_SQM).toFixed(2) + '/m²)'
          : label + ' ($' + t.rate.toFixed(2) + '/sq ft)';
      });
    }
  }

  // Re-sync labels when the visitor switches language mid-session.
  window.addEventListener('sena:lang-change', function () { syncUnitLabels(); updateAll(); });

  function applyUnitSystem(nextUnits, convertInputs) {
    var prevSi = isSI();
    state.units = nextUnits === 'si' ? 'si' : 'imperial';
    var nextSi = isSI();
    if (el('unitSystem') && el('unitSystem').value !== state.units) {
      el('unitSystem').value = state.units;
    }
    if (convertInputs && prevSi !== nextSi) {
      FIELD_SPECS.forEach(function (f) {
        var input = el(f.id);
        if (!input) return;
        var ftVal = state[f.id];
        input.value = nextSi ? (ftVal * FT_TO_M).toFixed(2) : String(Number(ftVal.toFixed(1)));
      });
    }
    try {
      localStorage.setItem('sena_cad_units', state.units);
    } catch (_e) {}
    syncUnitLabels();
  }

  function readInputs() {
    var si = isSI();
    var toFt = si ? function (v) { return v / FT_TO_M; } : function (v) { return v; };
    state.lengthFt = clamp(toFt(Number(el('lengthFt').value)), 12, 96, 32);
    state.widthFt = clamp(toFt(Number(el('widthFt').value)), 10, 32, 16);
    state.spacingFt = clamp(toFt(Number(el('spacingFt').value)), 2, 8, 4);
    state.aisleFt = clamp(toFt(Number(el('aisleFt').value)), 1.5, 5, 2.5);
    state.bermFt = clamp(toFt(Number(el('bermFt').value)), 0, 6, 2.5);
    state.trenchFt = clamp(toFt(Number(el('trenchFt').value)), 0, 4, 1.5);
    state.tier = el('buildTier').value || 'balanced';
    state.showBarrels = el('showBarrels').checked;
    state.showAirTube = el('showAirTube').checked;
    state.wireframe = el('wireframeMode').checked;
  }

  function derived() {
    var area = state.lengthFt * state.widthFt;
    var hoops = Math.floor(state.lengthFt / state.spacingFt) + 1;
    var wallOffsetFt = 0.5;
    var endClearanceFt = 1.0;
    var southClearanceFt = 0.8;
    var barrelClearanceFt = state.showBarrels ? 2.1 : wallOffsetFt;
    var bedLenFt = Math.max(4, state.lengthFt - endClearanceFt * 2);
    var bedDepthFt = 1.4;
    var northBedWidthFt = Math.max(1.5, (state.widthFt - state.aisleFt) / 2 - barrelClearanceFt);
    var southBedWidthFt = Math.max(1.5, (state.widthFt - state.aisleFt) / 2 - southClearanceFt);
    var bedWidth = Number(((northBedWidthFt + southBedWidthFt) / 2).toFixed(2));
    var northBedArea = bedLenFt * northBedWidthFt;
    var southBedArea = bedLenFt * southBedWidthFt;
    var aisleArea = Math.max(4, state.lengthFt - wallOffsetFt * 2) * state.aisleFt;
    var northSoilCuFt = northBedArea * bedDepthFt;
    var southSoilCuFt = southBedArea * bedDepthFt;
    var totalSoilCuFt = northSoilCuFt + southSoilCuFt;
    var trenchCutCuFt = area * state.trenchFt;
    var bermFillCuFt = state.lengthFt * state.bermFt * 3.0;
    var barrelCount = state.showBarrels ? Math.max(2, Math.floor((state.lengthFt - 2) / 2)) : 0;
    var waterGal = barrelCount * 55;
    var btuPerDegF = Math.round(waterGal * 8.34);
    var glazingSqFt = Math.round(state.lengthFt * (state.widthFt * 1.18));
    var glazingCutSqFt = Math.round(glazingSqFt * 1.1); // +10% batten/sill overlap
    var hoopArcFt = Number((Math.PI * (state.widthFt / 2) + 2.0).toFixed(1));
    var purlinRunsFt = Number((state.lengthFt * 3).toFixed(1));
    var bedCurbLinFt = Number(((bedLenFt * 2 + northBedWidthFt * 2) + (bedLenFt * 2 + southBedWidthFt * 2)).toFixed(1));
    var foodLbYr = Math.round(area * 0.65);
    var tierInfo = TIERS[state.tier] || TIERS.balanced;
    var estCost = Math.round(area * tierInfo.rate);
    return {
      area: area,
      hoops: hoops,
      wallOffsetFt: wallOffsetFt,
      endClearanceFt: endClearanceFt,
      southClearanceFt: southClearanceFt,
      barrelClearanceFt: barrelClearanceFt,
      bedLenFt: bedLenFt,
      bedDepthFt: bedDepthFt,
      bedWidth: bedWidth,
      northBedWidthFt: northBedWidthFt,
      southBedWidthFt: southBedWidthFt,
      northBedArea: northBedArea,
      southBedArea: southBedArea,
      aisleArea: aisleArea,
      northSoilCuFt: northSoilCuFt,
      southSoilCuFt: southSoilCuFt,
      totalSoilCuFt: totalSoilCuFt,
      trenchCutCuFt: trenchCutCuFt,
      bermFillCuFt: bermFillCuFt,
      barrelCount: barrelCount,
      waterGal: waterGal,
      btuPerDegF: btuPerDegF,
      glazingSqFt: glazingSqFt,
      glazingCutSqFt: glazingCutSqFt,
      hoopArcFt: hoopArcFt,
      purlinRunsFt: purlinRunsFt,
      bedCurbLinFt: bedCurbLinFt,
      foodLbYr: foodLbYr,
      tierInfo: tierInfo,
      estCost: estCost,
    };
  }

  // --- 3D CAD Canvas Projection ---
  function project3D(x, y, z, cx, cy, scale) {
    var cosY = Math.cos(state.yaw);
    var sinY = Math.sin(state.yaw);
    var cosP = Math.cos(state.pitch);
    var sinP = Math.sin(state.pitch);

    var x1 = x * cosY - z * sinY;
    var z1 = x * sinY + z * cosY;
    var y2 = y * cosP - z1 * sinP;
    var z2 = y * sinP + z1 * cosP;

    var persp = 1 / (1 + z2 * 0.012);
    return {
      x: cx + x1 * scale * persp,
      y: cy - y2 * scale * persp,
      z: z2,
    };
  }

  function buildBoxFaces(x0, y0, z0, x1, y1, z1, color, stroke) {
    var v = [
      [x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0],
      [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1],
    ];
    var idx = [
      [0, 1, 2, 3], [4, 5, 6, 7],
      [0, 1, 5, 4], [2, 3, 7, 6],
      [0, 3, 7, 4], [1, 2, 6, 5],
    ];
    return idx.map(function (f) {
      return { pts: f.map(function (i) { return v[i]; }), fill: color, stroke: stroke };
    });
  }

  function render3D() {
    var canvas = el('cadCanvas');
    if (!canvas) return;
    var ctx = canvas.getContext('2d');
    var dpr = window.devicePixelRatio || 1;
    var rect = canvas.getBoundingClientRect();
    var w = Math.max(320, Math.round(rect.width));
    var h = Math.max(320, Math.round(rect.height));
    if (canvas.width !== w * dpr || canvas.height !== h * dpr) {
      canvas.width = w * dpr;
      canvas.height = h * dpr;
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // CAD drafting background synced to active theme
    var cs = getComputedStyle(document.documentElement);
    var bgHex = cs.getPropertyValue('--surface').trim() || '#0d131c';
    var accentHex = cs.getPropertyValue('--accent').trim() || '#4cc9f0';
    var accent2Hex = cs.getPropertyValue('--accent-2').trim() || '#f4a261';
    var textHex = cs.getPropertyValue('--text').trim() || '#e8eef5';
    ctx.fillStyle = bgHex;
    ctx.fillRect(0, 0, w, h);

    var L = state.lengthFt;
    var W = state.widthFt;
    var hx = L / 2;
    var hz = W / 2;
    var cx = w / 2;
    var cy = h * 0.56;
    var scale = (Math.min(w, h) / Math.max(L, W, 24)) * 0.62 * state.zoom;

    // Ground CAD grid
    ctx.strokeStyle = 'rgba(246, 234, 215, 0.08)';
    ctx.lineWidth = 1;
    for (var gx = -Math.ceil(hx) - 4; gx <= Math.ceil(hx) + 4; gx += 4) {
      var g0 = project3D(gx, 0, -hz - 4, cx, cy, scale);
      var g1 = project3D(gx, 0, hz + 4, cx, cy, scale);
      ctx.beginPath();
      ctx.moveTo(g0.x, g0.y);
      ctx.lineTo(g1.x, g1.y);
      ctx.stroke();
    }
    for (var gz = -Math.ceil(hz) - 4; gz <= Math.ceil(hz) + 4; gz += 4) {
      var r0 = project3D(-hx - 4, 0, gz, cx, cy, scale);
      var r1 = project3D(hx + 4, 0, gz, cx, cy, scale);
      ctx.beginPath();
      ctx.moveTo(r0.x, r0.y);
      ctx.lineTo(r1.x, r1.y);
      ctx.stroke();
    }

    var faces = [];
    // Sunken floor slab
    faces = faces.concat(buildBoxFaces(-hx, -state.trenchFt, -hz, hx, 0, hz, 'rgba(31,22,12,0.85)', 'rgba(246,234,215,0.28)'));
    // North insulated berm wall (at z = -hz)
    faces = faces.concat(buildBoxFaces(-hx, 0, -hz - 1.2, hx, Math.max(2, state.bermFt + 3), -hz, 'rgba(130,90,45,0.75)', '#e8a825'));

    // Grow beds (North & South of central aisle)
    var aisleHalf = state.aisleFt / 2;
    faces = faces.concat(buildBoxFaces(-hx + 1, 0, -hz + 2.2, hx - 1, 1.4, -aisleHalf, 'rgba(120,155,104,0.65)', '#9bc289'));
    faces = faces.concat(buildBoxFaces(-hx + 1, 0, aisleHalf, hx - 1, 1.4, hz - 0.8, 'rgba(120,155,104,0.65)', '#9bc289'));

    // North thermal water barrels
    if (state.showBarrels) {
      var nBarrels = Math.max(2, Math.floor((L - 2) / 2));
      for (var b = 0; b < nBarrels; b++) {
        var bx0 = -hx + 1.2 + b * 2;
        faces = faces.concat(buildBoxFaces(bx0, 0, -hz + 0.1, bx0 + 1.6, 3.0, -hz + 1.8, 'rgba(42,95,140,0.75)', '#7ab4e8'));
      }
    }

    // Painter's sort back-to-front
    var projectedFaces = faces.map(function (f) {
      var p = f.pts.map(function (pt) { return project3D(pt[0], pt[1], pt[2], cx, cy, scale); });
      var avgZ = p.reduce(function (s, pt) { return s + pt.z; }, 0) / p.length;
      return { pts: p, avgZ: avgZ, fill: f.fill, stroke: f.stroke };
    });
    projectedFaces.sort(function (a, b) { return b.avgZ - a.avgZ; });

    projectedFaces.forEach(function (f) {
      ctx.beginPath();
      ctx.moveTo(f.pts[0].x, f.pts[0].y);
      for (var i = 1; i < f.pts.length; i++) ctx.lineTo(f.pts[i].x, f.pts[i].y);
      ctx.closePath();
      if (!state.wireframe) {
        ctx.fillStyle = f.fill;
        ctx.fill();
      }
      ctx.strokeStyle = f.stroke;
      ctx.lineWidth = 1.2;
      ctx.stroke();
    });

    // Arch / Glazing Hoops
    var d = derived();
    ctx.strokeStyle = '#e8a825';
    ctx.lineWidth = 1.6;
    for (var hi = 0; hi < d.hoops; hi++) {
      var xPos = Math.min(hx, -hx + hi * state.spacingFt);
      ctx.beginPath();
      for (var step = 0; step <= 16; step++) {
        var t = step / 16;
        var zPos = -hz + t * W;
        var archY = Math.sin(t * Math.PI) * state.ridgeFt;
        var p = project3D(xPos, archY, zPos, cx, cy, scale);
        if (step === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      }
      ctx.stroke();
    }

    // Sub-soil geothermal air tube
    if (state.showAirTube) {
      ctx.strokeStyle = '#5c8db4';
      ctx.lineWidth = 2.2;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      var t0 = project3D(-hx + 2, -state.trenchFt - 1.5, 0, cx, cy, scale);
      var t1 = project3D(hx - 2, -state.trenchFt - 1.5, 0, cx, cy, scale);
      ctx.moveTo(t0.x, t0.y);
      ctx.lineTo(t1.x, t1.y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // HUD Axis Labels
    ctx.fillStyle = 'rgba(246,234,215,0.85)';
    ctx.font = '12px ui-monospace, SFMono-Regular, Menlo, monospace';
    ctx.fillText('NORTH (Thermal Berm + Barrels)', 14, 22);
    ctx.fillStyle = '#e8a825';
    ctx.fillText(fmtLen(L) + ' (X) × ' + fmtLen(W) + ' (Y) · Ridge ' + fmtLen(state.ridgeFt) + ' · Drag to orbit', 14, h - 14);
  }

  // --- 2D CAD Blueprints (Plan + Section SVG) ---
  function makeSvg(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    return n;
  }

  function themeTokens() {
    var cs = getComputedStyle(document.documentElement);
    return {
      bg: cs.getPropertyValue('--bg').trim() || '#070a0f',
      surface: cs.getPropertyValue('--surface').trim() || '#0d131c',
      text: cs.getPropertyValue('--text').trim() || '#e8eef5',
      muted: cs.getPropertyValue('--muted').trim() || '#9eb0c4',
      accent: cs.getPropertyValue('--accent').trim() || '#4cc9f0',
      accent2: cs.getPropertyValue('--accent-2').trim() || '#f4a261',
      border: cs.getPropertyValue('--border').trim() || 'rgba(76,201,240,0.2)',
    };
  }

  function svgText(x, y, text, color, size, anchor) {
    var t = makeSvg('text', {
      x: x, y: y, fill: color, 'font-size': size || 10,
      'font-family': 'ui-monospace, SFMono-Regular, Menlo, monospace',
      'text-anchor': anchor || 'start',
    });
    t.textContent = text;
    return t;
  }

  function renderPlanSvg() {
    var root = el('planSvg');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    var d = derived();
    var T = themeTokens();
    var padL = 56, padT = 52, padR = 64, padB = 62;
    var scale = 15;
    var L = state.lengthFt, W = state.widthFt;
    var w = L * scale, h = W * scale;
    var vw = w + padL + padR, vh = h + padT + padB;
    root.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);

    // Sheet background
    root.appendChild(makeSvg('rect', { x: 0, y: 0, width: vw, height: vh, fill: T.bg, rx: 4 }));

    // Minor (1 ft) & Major (4 ft) CAD grid
    for (var gx = 0; gx <= L; gx++) {
      var x = padL + gx * scale;
      var majorX = gx % 4 === 0;
      root.appendChild(makeSvg('line', {
        x1: x, y1: padT, x2: x, y2: padT + h,
        stroke: T.accent, 'stroke-opacity': majorX ? 0.22 : 0.07, 'stroke-width': majorX ? 0.8 : 0.4,
      }));
      if (majorX) root.appendChild(svgText(x, padT + h + 14, isSI() ? (gx * FT_TO_M).toFixed(1) + 'm' : gx + "'", T.muted, 9, 'middle'));
    }
    for (var gy = 0; gy <= W; gy++) {
      var y = padT + gy * scale;
      var majorY = gy % 4 === 0;
      root.appendChild(makeSvg('line', {
        x1: padL, y1: y, x2: padL + w, y2: y,
        stroke: T.accent, 'stroke-opacity': majorY ? 0.22 : 0.07, 'stroke-width': majorY ? 0.8 : 0.4,
      }));
      if (majorY) root.appendChild(svgText(padL - 8, y + 3, isSI() ? (gy * FT_TO_M).toFixed(1) + 'm' : gy + "'", T.muted, 9, 'end'));
    }

    // North Earth Berm apron (top)
    if (state.bermFt > 0) {
      root.appendChild(makeSvg('rect', {
        x: padL, y: padT - 14, width: w, height: 14,
        fill: T.accent2, 'fill-opacity': 0.14, stroke: T.accent2, 'stroke-width': 0.8, 'stroke-dasharray': '3 2',
      }));
      root.appendChild(svgText(padL + 6, padT - 4, 'NORTH EARTH BERM (' + fmtLenShort(state.bermFt) + ')', T.accent2, 8.5));
    }

    // Double-line perimeter wall (0.5 ft wall thickness)
    var wt = 0.5 * scale;
    root.appendChild(makeSvg('rect', { x: padL, y: padT, width: w, height: h, fill: 'none', stroke: T.text, 'stroke-width': 1.8 }));
    root.appendChild(makeSvg('rect', { x: padL + wt, y: padT + wt, width: w - wt * 2, height: h - wt * 2, fill: 'none', stroke: T.muted, 'stroke-width': 0.8 }));

    // Central Longitudinal Aisle
    var aislePx = state.aisleFt * scale;
    var aisleY = padT + h / 2 - aislePx / 2;
    root.appendChild(makeSvg('rect', {
      x: padL + wt, y: aisleY, width: w - wt * 2, height: aislePx,
      fill: T.surface, stroke: T.accent, 'stroke-width': 0.8, 'stroke-dasharray': '5 3',
    }));
    root.appendChild(svgText(padL + w / 2, aisleY + aislePx / 2 + 3, 'ACCESS AISLE (' + fmtLenShort(state.aisleFt) + ' WIDE)', T.accent, 9, 'middle'));

    // North & South Growing Beds
    var barrelClearance = state.showBarrels ? 2.1 * scale : wt + 4;
    var nBedY = padT + barrelClearance;
    var nBedH = Math.max(10, aisleY - nBedY - 4);
    var sBedY = aisleY + aislePx + 4;
    var sBedH = Math.max(10, padT + h - wt - 4 - sBedY);
    root.appendChild(makeSvg('rect', { x: padL + wt + 4, y: nBedY, width: w - wt * 2 - 8, height: nBedH, fill: T.accent, 'fill-opacity': 0.08, stroke: T.accent, 'stroke-width': 1 }));
    root.appendChild(svgText(padL + w / 2, nBedY + nBedH / 2 + 3, 'NORTH GROW BED (' + fmtLenShort(d.northBedWidthFt) + ')', T.text, 9, 'middle'));
    root.appendChild(makeSvg('rect', { x: padL + wt + 4, y: sBedY, width: w - wt * 2 - 8, height: sBedH, fill: T.accent, 'fill-opacity': 0.08, stroke: T.accent, 'stroke-width': 1 }));
    root.appendChild(svgText(padL + w / 2, sBedY + sBedH / 2 + 3, 'SOUTH GROW BED (' + fmtLenShort(d.southBedWidthFt) + ')', T.text, 9, 'middle'));

    // Individual 55-gal circular barrel CAD symbols along North Wall
    if (state.showBarrels) {
      var nB = d.barrelCount;
      var bR = 0.85 * scale;
      var bStep = (w - wt * 2 - 16) / Math.max(1, nB);
      for (var bi = 0; bi < nB; bi++) {
        var bx = padL + wt + 8 + bStep * (bi + 0.5);
        var by = padT + wt + bR + 2;
        root.appendChild(makeSvg('circle', { cx: bx, cy: by, r: Math.min(bR, bStep * 0.42), fill: T.surface, stroke: T.accent2, 'stroke-width': 1.2 }));
        root.appendChild(makeSvg('circle', { cx: bx, cy: by, r: 2, fill: T.accent2 }));
      }
    }

    // Hoop station centerlines + callouts (H1..Hn)
    for (var i = 0; i < d.hoops; i++) {
      var hx = Math.min(padL + w, padL + i * state.spacingFt * scale);
      root.appendChild(makeSvg('line', { x1: hx, y1: padT - 6, x2: hx, y2: padT + h + 6, stroke: T.accent2, 'stroke-opacity': 0.55, 'stroke-width': 0.9, 'stroke-dasharray': '4 3' }));
      root.appendChild(svgText(hx, padT - 19, 'H' + (i + 1), T.muted, 8, 'middle'));
    }

    // Overall Dimension Chains (Top X, Right Y)
    var dimY = 18;
    root.appendChild(makeSvg('line', { x1: padL, y1: dimY, x2: padL + w, y2: dimY, stroke: T.text, 'stroke-width': 1 }));
    root.appendChild(makeSvg('line', { x1: padL, y1: dimY - 5, x2: padL, y2: padT - 4, stroke: T.muted, 'stroke-width': 0.7 }));
    root.appendChild(makeSvg('line', { x1: padL + w, y1: dimY - 5, x2: padL + w, y2: padT - 4, stroke: T.muted, 'stroke-width': 0.7 }));
    root.appendChild(svgText(padL + w / 2, dimY - 4, (isSI() ? fmtLen(L) : L + "'-0\"") + ' OVERALL LENGTH (X)', T.text, 9.5, 'middle'));

    var dimX = padL + w + 26;
    root.appendChild(makeSvg('line', { x1: dimX, y1: padT, x2: dimX, y2: padT + h, stroke: T.text, 'stroke-width': 1 }));
    root.appendChild(makeSvg('line', { x1: padL + w + 4, y1: padT, x2: dimX + 5, y2: padT, stroke: T.muted, 'stroke-width': 0.7 }));
    root.appendChild(makeSvg('line', { x1: padL + w + 4, y1: padT + h, x2: dimX + 5, y2: padT + h, stroke: T.muted, 'stroke-width': 0.7 }));
    var wLbl = svgText(dimX + 12, padT + h / 2, (isSI() ? fmtLen(W) : W + "'-0\"") + ' (Y)', T.text, 9.5, 'middle');
    wLbl.setAttribute('transform', 'rotate(-90 ' + (dimX + 12) + ' ' + (padT + h / 2) + ')');
    root.appendChild(wLbl);

    // North Arrow & Title Block
    root.appendChild(svgText(18, 22, '▲ N', T.accent, 11, 'start'));
    root.appendChild(makeSvg('rect', { x: vw - 250, y: vh - 28, width: 242, height: 22, fill: T.surface, stroke: T.border }));
    root.appendChild(svgText(vw - 242, vh - 13, isSI() ? 'SENA COLECTIVO · PLAN VIEW · 1:50 METRIC' : 'SENA COLECTIVO · PLAN VIEW · 1/4"=1\'-0"', T.muted, 9));
  }

  function renderSectionSvg() {
    var root = el('sectionSvg');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    var T = themeTokens();
    var scale = 18;
    var pad = 58;
    var w = state.widthFt * scale;
    var groundY = 205;
    var trenchPx = state.trenchFt * scale;
    var bermPx = state.bermFt * scale;
    var ridgePx = state.ridgeFt * scale;
    var vw = Math.max(460, w + pad * 2);
    var vh = Math.max(335, groundY + trenchPx + 82);
    root.setAttribute('viewBox', '0 0 ' + vw + ' ' + vh);

    root.appendChild(makeSvg('rect', { x: 0, y: 0, width: vw, height: vh, fill: T.bg, rx: 4 }));

    // Grade datum
    root.appendChild(makeSvg('line', { x1: 14, y1: groundY, x2: vw - 14, y2: groundY, stroke: T.muted, 'stroke-dasharray': '6 4', 'stroke-width': 1 }));
    root.appendChild(svgText(vw - 16, groundY - 6, isSI() ? 'GRADE ±0.00 m' : "GRADE ±0.0'", T.muted, 8.5, 'end'));

    // North earth berm
    root.appendChild(makeSvg('polygon', {
      points: (pad - 36) + ',' + groundY + ' ' + pad + ',' + (groundY - bermPx) + ' ' + pad + ',' + groundY,
      fill: T.accent2, 'fill-opacity': 0.22, stroke: T.accent2, 'stroke-width': 1.2,
    }));

    // Excavated sunken trench
    root.appendChild(makeSvg('rect', { x: pad, y: groundY, width: w, height: trenchPx, fill: T.surface, stroke: T.text, 'stroke-width': 1.2 }));
    if (state.trenchFt > 0) {
      root.appendChild(svgText(pad + w / 2, groundY + trenchPx / 2 + 3, 'SUNKEN TRENCH (-' + fmtLenShort(state.trenchFt) + ')', T.muted, 8.5, 'middle'));
    }

    // North thermal barrel silhouette
    if (state.showBarrels) {
      root.appendChild(makeSvg('rect', { x: pad + 6, y: groundY - 3 * scale, width: 1.8 * scale, height: 3 * scale, fill: T.surface, stroke: T.accent2, 'stroke-width': 1.2 }));
    }

    // Glazing arch envelope
    root.appendChild(makeSvg('path', {
      d: 'M ' + pad + ' ' + (groundY - bermPx) + ' Q ' + (pad + w * 0.45) + ' ' + (groundY - ridgePx * 1.45) + ' ' + (pad + w) + ' ' + groundY,
      fill: 'none', stroke: T.accent, 'stroke-width': 2.2,
    }));
    root.appendChild(svgText(pad + w * 0.48, groundY - ridgePx - 6, 'RIDGE ' + fmtLenShort(state.ridgeFt) + ' · 50° SOUTH GLAZING', T.accent, 9, 'middle'));

    // Sub-soil geothermal air tube
    if (state.showAirTube) {
      var tubeY = groundY + trenchPx + 18;
      root.appendChild(makeSvg('circle', { cx: pad + w / 2, cy: tubeY, r: 9, fill: T.surface, stroke: T.accent, 'stroke-width': 1.5 }));
      root.appendChild(svgText(pad + w / 2 + 14, tubeY + 3, 'GEOTHERMAL AIR TUBE', T.accent, 8.5));
    }

    root.appendChild(makeSvg('rect', { x: vw - 246, y: vh - 28, width: 238, height: 22, fill: T.surface, stroke: T.border }));
    root.appendChild(svgText(vw - 238, vh - 13, 'SECTION (N → S) · BERM ' + fmtLenShort(state.bermFt) + ' · TRENCH ' + fmtLenShort(state.trenchFt), T.muted, 9));
  }

  // --- Real 3D-Printable .STL Generator (1:50 Scale in mm) ---
  function addTri(out, ax, ay, az, bx, by, bz, cx, cy, cz) {
    var ux = bx - ax, uy = by - ay, uz = bz - az;
    var vx = cx - ax, vy = cy - ay, vz = cz - az;
    var nx = uy * vz - uz * vy;
    var ny = uz * vx - ux * vz;
    var nz = ux * vy - uy * vx;
    var len = Math.hypot(nx, ny, nz) || 1;
    out.push(
      '  facet normal ' + (nx / len).toFixed(5) + ' ' + (ny / len).toFixed(5) + ' ' + (nz / len).toFixed(5),
      '    outer loop',
      '      vertex ' + ax.toFixed(3) + ' ' + ay.toFixed(3) + ' ' + az.toFixed(3),
      '      vertex ' + bx.toFixed(3) + ' ' + by.toFixed(3) + ' ' + bz.toFixed(3),
      '      vertex ' + cx.toFixed(3) + ' ' + cy.toFixed(3) + ' ' + cz.toFixed(3),
      '    endloop',
      '  endfacet'
    );
  }

  function addBoxStl(out, x0, y0, z0, x1, y1, z1) {
    // Bottom & Top
    addTri(out, x0, y0, z0, x1, y1, z0, x1, y0, z0);
    addTri(out, x0, y0, z0, x0, y1, z0, x1, y1, z0);
    addTri(out, x0, y0, z1, x1, y0, z1, x1, y1, z1);
    addTri(out, x0, y0, z1, x1, y1, z1, x0, y1, z1);
    // Sides
    addTri(out, x0, y0, z0, x1, y0, z0, x1, y0, z1);
    addTri(out, x0, y0, z0, x1, y0, z1, x0, y0, z1);
    addTri(out, x0, y1, z0, x1, y1, z1, x1, y1, z0);
    addTri(out, x0, y1, z0, x0, y1, z1, x1, y1, z1);
    addTri(out, x0, y0, z0, x0, y0, z1, x0, y1, z1);
    addTri(out, x0, y0, z0, x0, y1, z1, x0, y1, z0);
    addTri(out, x1, y0, z0, x1, y1, z1, x1, y0, z1);
    addTri(out, x1, y0, z0, x1, y1, z0, x1, y1, z1);
  }

  function buildStlText() {
    var scaleMm = 304.8 / 50; // 1:50 architectural scale in mm (1 ft -> 6.096 mm)
    var L = state.lengthFt * scaleMm;
    var W = state.widthFt * scaleMm;
    var out = ['solid sena_commons_greenhouse_1_50'];

    // Base slab (3 mm thick for clean 3D print bed adhesion)
    addBoxStl(out, 0, 0, 0, L, W, 3);
    // North insulated berm wall
    var wallH = Math.max(2, state.bermFt + 3) * scaleMm;
    addBoxStl(out, 0, W - 4, 3, L, W, 3 + wallH);
    // Grow beds
    var aisleMm = state.aisleFt * scaleMm;
    var midY = W / 2;
    addBoxStl(out, 4, 4, 3, L - 4, midY - aisleMm / 2, 3 + 1.4 * scaleMm);
    addBoxStl(out, 4, midY + aisleMm / 2, 3, L - 4, W - 10, 3 + 1.4 * scaleMm);

    // Structural ribs for 3D printability
    var d = derived();
    for (var i = 0; i < d.hoops; i++) {
      var rx = Math.min(L - 2, i * state.spacingFt * scaleMm);
      addBoxStl(out, rx, 0, 3, rx + 2.0, 2.0, 3 + 3.5 * scaleMm);
    }

    out.push('endsolid sena_commons_greenhouse_1_50');
    return out.join('\n');
  }

  function validateStlText(stlText) {
    var lines = stlText.split('\n');
    var verts = [];
    var minX = Infinity, minY = Infinity, minZ = Infinity;
    var maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
    var degenerate = 0;
    var edges = new Map();

    function vKey(v) {
      return v[0].toFixed(3) + ',' + v[1].toFixed(3) + ',' + v[2].toFixed(3);
    }
    function addEdge(a, b) {
      var ka = vKey(a);
      var kb = vKey(b);
      var key = ka < kb ? ka + '|' + kb : kb + '|' + ka;
      edges.set(key, (edges.get(key) || 0) + 1);
    }

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (line.indexOf('vertex ') === 0) {
        var parts = line.split(/\s+/);
        var x = Number(parts[1]), y = Number(parts[2]), z = Number(parts[3]);
        if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
          return { valid: false, reason: 'Non-finite vertex coordinate' };
        }
        minX = Math.min(minX, x); maxX = Math.max(maxX, x);
        minY = Math.min(minY, y); maxY = Math.max(maxY, y);
        minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
        verts.push([x, y, z]);
        if (verts.length === 3) {
          var a = verts[0], b = verts[1], c = verts[2];
          var ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
          var vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
          var area2 = Math.hypot(uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx);
          if (area2 < 1e-6) degenerate++;
          addEdge(a, b);
          addEdge(b, c);
          addEdge(c, a);
          verts = [];
        }
      }
    }

    var openEdges = 0;
    var nonManifold = 0;
    edges.forEach(function (count) {
      if (count === 1) openEdges++;
      else if (count !== 2) nonManifold++;
    });

    var triCount = Math.round((edges.size * 2) / 3);
    var sizeX = +(maxX - minX).toFixed(1);
    var sizeY = +(maxY - minY).toFixed(1);
    var sizeZ = +(maxZ - minZ).toFixed(1);
    var fits220 = sizeX <= 220 && sizeY <= 220 && sizeZ <= 250;
    var valid = triCount > 0 && degenerate === 0 && openEdges === 0 && nonManifold === 0;

    return {
      valid: valid,
      triangles: triCount,
      degenerate: degenerate,
      openEdges: openEdges,
      nonManifold: nonManifold,
      bboxMm: [sizeX, sizeY, sizeZ],
      fits220: fits220,
    };
  }

  function exportStl() {
    var stl = buildStlText();
    downloadFile('greenhouse-' + state.lengthFt + 'x' + state.widthFt + '-scale1to50.stl', stl, 'model/stl');
  }

  function runStlValidation() {
    var statusEl = el('stlValidationStatus');
    if (!statusEl) return;
    var res = validateStlText(buildStlText());
    statusEl.textContent =
      (res.valid ? 'PASS (Watertight 2-manifold)' : 'FAIL') +
      ' · ' + res.triangles + ' triangles' +
      ' · ' + res.openEdges + ' open edges' +
      ' · ' + res.degenerate + ' degenerate' +
      ' · BBox: ' + res.bboxMm.join(' × ') + ' mm' +
      (res.fits220 ? ' (Fits 220×220×250 mm bed)' : ' (Exceeds 220 mm bed — scale down)');
  }

  // --- Real 2D CAD .DXF Generator (Feet) ---
  function dxfRect(layer, x0, y0, x1, y1) {
    return [
      '0', 'LWPOLYLINE', '8', layer, '90', '4', '70', '1',
      '10', x0.toFixed(3), '20', y0.toFixed(3),
      '10', x1.toFixed(3), '20', y0.toFixed(3),
      '10', x1.toFixed(3), '20', y1.toFixed(3),
      '10', x0.toFixed(3), '20', y1.toFixed(3),
    ].join('\n');
  }

  function exportDxf() {
    var k = isSI() ? FT_TO_M : 1;
    var L = state.lengthFt * k;
    var W = state.widthFt * k;
    var mid = W / 2;
    var halfA = (state.aisleFt * k) / 2;
    var entities = [
      dxfRect('WALLS', 0, 0, L, W),
      dxfRect('AISLE', 0.5 * k, mid - halfA, L - 0.5 * k, mid + halfA),
      dxfRect('GROW_BEDS', 1 * k, 0.8 * k, L - 1 * k, mid - halfA - 0.3 * k),
      dxfRect('GROW_BEDS', 1 * k, mid + halfA + 0.3 * k, L - 1 * k, W - 2.2 * k),
    ];
    if (state.showBarrels) {
      entities.push(dxfRect('NORTH_BARRELS', 1 * k, W - 1.8 * k, L - 1 * k, W - 0.2 * k));
    }
    var dxf = ['0', 'SECTION', '2', 'ENTITIES', entities.join('\n'), '0', 'ENDSEC', '0', 'EOF'].join('\n');
    var fname = isSI()
      ? 'greenhouse-' + L.toFixed(1) + 'x' + W.toFixed(1) + 'm-plan.dxf'
      : 'greenhouse-' + state.lengthFt + 'x' + state.widthFt + '-plan.dxf';
    downloadFile(fname, dxf, 'application/dxf');
  }

  // --- Real Plotter .PLT (HPGL, 1016 units/inch, 1:48 scale: 1/4" = 1'-0") ---
  function hpglRect(x0, y0, x1, y1) {
    var u = function (ft) { return Math.round(ft * 0.25 * 1016); };
    return [
      'PU' + u(x0) + ',' + u(y0) + ';',
      'PD' + u(x1) + ',' + u(y0) + ',' + u(x1) + ',' + u(y1) + ',' + u(x0) + ',' + u(y1) + ',' + u(x0) + ',' + u(y0) + ';',
      'PU;',
    ].join('');
  }

  function exportPlt() {
    var L = state.lengthFt;
    var W = state.widthFt;
    var mid = W / 2;
    var halfA = state.aisleFt / 2;
    var cmds = [
      'IN;SP1;',
      hpglRect(0, 0, L, W),
      hpglRect(0.5, mid - halfA, L - 0.5, mid + halfA),
      'SP2;',
      hpglRect(1, 0.8, L - 1, mid - halfA - 0.3),
      hpglRect(1, mid + halfA + 0.3, L - 1, W - 2.2),
    ];
    if (state.showBarrels) {
      cmds.push('SP3;', hpglRect(1, W - 1.8, L - 1, W - 0.2));
    }
    cmds.push('PU0,0;SP0;');
    downloadFile('greenhouse-' + L + 'x' + W + '-1to48.plt', cmds.join('\n'), 'application/vnd.hp-hpgl');
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

  function buildPartsRows(d) {
    var si = isSI();
    var es = isES();
    var fmtArea = function (sqft) {
      return si ? (sqft * SQFT_TO_SQM).toFixed(1) + ' m\u00b2' : Math.round(sqft) + ' sq ft';
    };
    var fmtVol = function (cuft) {
      return si ? (cuft * 0.0283168).toFixed(2) + ' m\u00b3' : (cuft / 27).toFixed(2) + ' cu yd';
    };
    var hoopMat =
      state.tier === 'upgraded'
        ? '1.315" galvanized steel'
        : state.tier === 'balanced'
          ? '1" EMT / Schedule 40 PVC'
          : 'Salvaged conduit / wood ribs';
    var hoopMatEs =
      state.tier === 'upgraded'
        ? 'acero galvanizado de 1.315"'
        : state.tier === 'balanced'
          ? 'EMT de 1" / PVC c\u00e9dula 40'
          : 'Conducto recuperado / costillas de madera';
    var glazeMat =
      state.tier === 'upgraded'
        ? '8 mm twin-wall polycarbonate'
        : state.tier === 'balanced'
          ? '6-mil UV greenhouse poly'
          : 'Reclaimed glazing / poly film';
    var glazeMatEs =
      state.tier === 'upgraded'
        ? 'policarbonato alveolar de 8 mm'
        : state.tier === 'balanced'
          ? 'polietileno de invernadero UV de 6 mil'
          : 'vidriado recuperado / pel\u00edcula de polietileno';

    // Written ES, Salvador's voice — no machine translation. Each row
    // carries its Spanish twin; the active language is picked at render
    // time from body.lang-es (see isES), matching the paired .en/.es
    // spans in the CAD page markup.
    var rows = [
      {
        item: 'Structural Hoops',
        itemEs: 'Arcos estructurales',
        qty: d.hoops + ' pcs',
        qtyEs: d.hoops + ' uds.',
        spec: fmtLen(d.hoopArcFt) + ' arc \u00b7 ' + hoopMat,
        specEs: fmtLen(d.hoopArcFt) + ' de arco \u00b7 ' + hoopMatEs,
        note: 'Spaced ' + fmtLen(state.spacingFt) + ' O.C. (+1 end frame)',
        noteEs: 'Con separaci\u00f3n de ' + fmtLen(state.spacingFt) + ' entre ejes (+1 marco extremo)',
      },
      {
        item: 'Ground Anchors / Sleeves',
        itemEs: 'Anclajes de tierra / fundas',
        qty: d.hoops * 2 + ' pcs',
        qtyEs: d.hoops * 2 + ' uds.',
        spec: fmtLen(3.0) + ' rebar or pipe sleeve',
        specEs: fmtLen(3.0) + ' de varilla o funda de tubo',
        note: '2 per hoop driven along perimeter wall',
        noteEs: '2 por arco clavados a lo largo del muro perimetral',
      },
      {
        item: 'Ridge & Side Purlins',
        itemEs: 'Correas de cumbrera y laterales',
        qty: '3 runs',
        qtyEs: '3 tramos',
        spec: fmtLen(state.lengthFt) + ' each (' + fmtLen(d.purlinRunsFt) + ' total)',
        specEs: fmtLen(state.lengthFt) + ' c/u (' + fmtLen(d.purlinRunsFt) + ' total)',
        note: 'Includes ridge spine + 2 lateral wind braces',
        noteEs: 'Incluye espina de cumbrera + 2 refuerzos laterales contra viento',
      },
      {
        item: 'South Glazing Envelope',
        itemEs: 'Envolvente vidriada sur',
        qty: fmtArea(d.glazingCutSqFt),
        qtyEs: fmtArea(d.glazingCutSqFt),
        spec: glazeMat,
        specEs: glazeMatEs,
        note: 'Net ' + fmtArea(d.glazingSqFt) + ' + 10% sill/batten wrap offset',
        noteEs: 'Neto ' + fmtArea(d.glazingSqFt) + ' + 10% de solape de alféizar/listón',
      },
      {
        item: 'Raised Bed Framing',
        itemEs: 'Estructura de camas elevadas',
        qty: fmtLen(d.bedCurbLinFt),
        qtyEs: fmtLen(d.bedCurbLinFt),
        spec: 'Untreated cedar / adobe / salvaged curb (' + fmtLen(d.bedDepthFt) + ' high)',
        specEs: 'Cedro sin tratar / adobe / bordillo recuperado (' + fmtLen(d.bedDepthFt) + ' de alto)',
        note: fmtLen(d.endClearanceFt) + ' end-wall & ' + fmtLen(d.southClearanceFt) + ' south clearance',
        noteEs: fmtLen(d.endClearanceFt) + ' de muro extremo y ' + fmtLen(d.southClearanceFt) + ' de despeje sur',
      },
      {
        item: 'Growing Bed Soil / Compost',
        itemEs: 'Tierra / composta para camas',
        qty: fmtVol(d.totalSoilCuFt),
        qtyEs: fmtVol(d.totalSoilCuFt),
        spec: 'Loam + compost blend (' + fmtLen(d.bedDepthFt) + ' bed depth)',
        specEs: 'Mezcla de tierra franca + composta (' + fmtLen(d.bedDepthFt) + ' de profundidad de cama)',
        note: 'North: ' + fmtVol(d.northSoilCuFt) + ' \u00b7 South: ' + fmtVol(d.southSoilCuFt),
        noteEs: 'Norte: ' + fmtVol(d.northSoilCuFt) + ' \u00b7 Sur: ' + fmtVol(d.southSoilCuFt),
      },
    ];
    if (state.showBarrels) {
      rows.push({
        item: 'North Thermal Water Barrels',
        itemEs: 'Barriles térmicos de agua al norte',
        qty: d.barrelCount + ' drums',
        qtyEs: d.barrelCount + ' tambores',
        spec: si ? '208-L black HDPE drums' : '55-gal black HDPE drums',
        specEs: si ? 'Tambores negros HDPE de 208 L' : 'Tambores negros HDPE de 55 gal',
        note: fmtLen(d.barrelClearanceFt) + ' north wall offset (' + (si ? Math.round(d.waterGal * GAL_TO_L).toLocaleString() + ' L' : d.waterGal + ' gal') + ')',
        noteEs: fmtLen(d.barrelClearanceFt) + ' de desplazamiento del muro norte (' + (si ? Math.round(d.waterGal * GAL_TO_L).toLocaleString() + ' L' : d.waterGal + ' gal') + ')',
      });
    }
    if (state.showAirTube) {
      rows.push({
        item: 'Geothermal Earth-Tube Duct',
        itemEs: 'Conducto geotérmico de tubo enterrado',
        qty: fmtLen(Math.max(4, state.lengthFt - 4)),
        qtyEs: fmtLen(Math.max(4, state.lengthFt - 4)),
        spec: '4\u20136" corrugated pipe + 2 risers',
        specEs: 'Tubo corrugado de 4\u20136" + 2 elevadores',
        note: 'Buried ' + fmtLen(state.trenchFt + 1.5) + ' below grade datum',
        noteEs: 'Enterrado a ' + fmtLen(state.trenchFt + 1.5) + ' bajo el nivel de referencia',
      });
    }
    rows.push({
      item: 'Hardware, Battens & Anchors',
      itemEs: 'Herrajes, listones y anclajes',
      qty: '1 kit',
      qtyEs: '1 kit',
      spec: 'Wiggle wire / batten tape, purlin clamps, vent latches',
      specEs: 'Alambre ondulado / cinta de listón, abrazaderas de correa, pestillos de ventilación',
      note: 'Sized for ' + d.hoops + ' hoop stations',
      noteEs: 'Dimensionado para ' + d.hoops + ' estaciones de arco',
    });
    if (!es) return rows;
    return rows.map(function (r) {
      return { item: r.itemEs || r.item, qty: r.qtyEs || r.qty, spec: r.specEs || r.spec, note: r.noteEs || r.note };
    });
  }

  function exportPartsCsv() {
    var d = derived();
    var rows = buildPartsRows(d);
    var esc = function (s) {
      return '"' + String(s).replace(/"/g, '""') + '"';
    };
    var lines = [isES() ? 'Artículo,Cant.,Corte_o_Espec,Desplazamiento_y_Notas' : 'Item,Qty,Cut_or_Spec,Offset_and_Notes'];
    rows.forEach(function (r) {
      lines.push([esc(r.item), esc(r.qty), esc(r.spec), esc(r.note)].join(','));
    });
    downloadFile('greenhouse-parts-list-' + (isSI() ? 'si' : 'imperial') + '.csv', lines.join('\n'), 'text/csv');
  }

  function renderMetrics() {
    var d = derived();
    var si = isSI();
    var areaM2 = d.area * SQFT_TO_SQM;
    var glazingM2 = d.glazingSqFt * SQFT_TO_SQM;
    var waterL = Math.round(d.waterGal * GAL_TO_L);
    var kjk = Math.round(d.btuPerDegF * BTUF_TO_KJK);
    var fmtArea = function (sqft) {
      return si ? (sqft * SQFT_TO_SQM).toFixed(1) + ' m²' : Math.round(sqft) + ' sq ft';
    };
    var fmtVol = function (cuft) {
      return si ? (cuft * 0.0283168).toFixed(2) + ' m³' : (cuft / 27).toFixed(2) + ' cu yd';
    };

    el('footprintValue').textContent = si ? areaM2.toFixed(1) + ' m²' : Math.round(d.area) + ' sq ft';
    el('hoopsValue').textContent = d.hoops + (isES() ? ' arcos' : ' hoops');
    el('thermalValue').textContent = si
      ? waterL.toLocaleString() + ' L (' + kjk.toLocaleString() + ' kJ/K)'
      : d.waterGal + ' gal (' + d.btuPerDegF + ' BTU/°F)';
    el('costValue').textContent = '$' + d.estCost.toLocaleString() + ' (' + (isES() ? (d.tierInfo.labelEs || d.tierInfo.label) : d.tierInfo.label) + ')';

    var bedBody = el('bedDetailsBody');
    if (bedBody) {
      bedBody.textContent = '';
      [
        ['North Grow Bed', fmtLen(d.bedLenFt) + ' × ' + fmtLen(d.northBedWidthFt) + ' × ' + fmtLen(d.bedDepthFt), fmtArea(d.northBedArea), fmtVol(d.northSoilCuFt)],
        ['South Grow Bed', fmtLen(d.bedLenFt) + ' × ' + fmtLen(d.southBedWidthFt) + ' × ' + fmtLen(d.bedDepthFt), fmtArea(d.southBedArea), fmtVol(d.southSoilCuFt)],
        ['Central Aisle', fmtLen(state.lengthFt - d.wallOffsetFt * 2) + ' × ' + fmtLen(state.aisleFt) + ' × —', fmtArea(d.aisleArea), '—'],
      ].forEach(function (cols) {
        var tr = document.createElement('tr');
        cols.forEach(function (val) {
          var td = document.createElement('td');
          td.style.padding = '6px';
          td.style.borderBottom = '1px solid var(--border)';
          td.textContent = val;
          tr.appendChild(td);
        });
        bedBody.appendChild(tr);
      });
    }

    var offsetList = el('offsetDetailsList');
    if (offsetList) {
      offsetList.textContent = '';
      [
        'Perimeter wall thickness offset: ' + fmtLen(d.wallOffsetFt) + ' on all 4 sides',
        'East/West bed end-wall clearance: ' + fmtLen(d.endClearanceFt) + ' each end (door & vent swing)',
        'North barrel zone offset: ' + fmtLen(d.barrelClearanceFt) + (state.showBarrels ? ' (55-gal/208-L drum row)' : ' (barrels disabled)'),
        'South glazing sill clearance: ' + fmtLen(d.southClearanceFt),
        'Glazing overlap & waste factor: +10% over net ' + fmtArea(d.glazingSqFt) + ' → ' + fmtArea(d.glazingCutSqFt) + ' cut sheet',
        'Earthworks volume: ' + fmtVol(d.trenchCutCuFt) + ' trench cut · ' + fmtVol(d.bermFillCuFt) + ' north berm fill',
      ].forEach(function (line) {
        var li = document.createElement('li');
        li.textContent = line;
        offsetList.appendChild(li);
      });
    }

    var partsBody = el('partsTableBody');
    if (partsBody) {
      partsBody.textContent = '';
      buildPartsRows(d).forEach(function (r) {
        var tr = document.createElement('tr');
        [r.item, r.qty, r.spec, r.note].forEach(function (val) {
          var td = document.createElement('td');
          td.style.padding = '6px';
          td.style.borderBottom = '1px solid var(--border)';
          td.textContent = val;
          tr.appendChild(td);
        });
        partsBody.appendChild(tr);
      });
    }

    var bom = el('bomList');
    bom.textContent = '';
    [
      'Footprint: ' + fmtLen(state.lengthFt) + ' × ' + fmtLen(state.widthFt) + ' (' + (si ? areaM2.toFixed(1) + ' m²' : Math.round(d.area) + ' sq ft') + ')',
      'Glazing envelope: ~' + (si ? glazingM2.toFixed(1) + ' m²' : d.glazingSqFt + ' sq ft') + ' net / ' + fmtArea(d.glazingCutSqFt) + ' cut sheet (50° south slope)',
      'Hoops & ground anchors: ' + d.hoops + ' hoops / ' + d.hoops * 2 + ' anchors',
      si
        ? 'North thermal mass: ' + d.barrelCount + ' × 208-L barrels (' + waterL.toLocaleString() + ' L)'
        : 'North thermal mass: ' + d.barrelCount + ' × 55-gal barrels (' + d.waterGal + ' gal)',
      'Grow beds: North ' + fmtLen(d.northBedWidthFt) + ' · South ' + fmtLen(d.southBedWidthFt) + ' × ' + fmtLen(d.bedLenFt) + ' long, ' + fmtLen(state.aisleFt) + ' aisle',
      'Climate loop: ' + (state.showAirTube ? 'Sub-soil geothermal air tube' : 'Passive roll-up ventilation'),
      'Build profile: ' + d.tierInfo.label + ' — ' + d.tierInfo.desc,
    ].forEach(function (line) {
      var li = document.createElement('li');
      li.textContent = line;
      bom.appendChild(li);
    });
  }

  function updateAll() {
    readInputs();
    renderMetrics();
    render3D();
    renderPlanSvg();
    renderSectionSvg();
  }

  // Orbit drag + zoom on 3D CAD canvas
  var canvas = el('cadCanvas');
  if (canvas) {
    var dragging = false;
    var lastX = 0;
    var lastY = 0;
    canvas.addEventListener('pointerdown', function (e) {
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
    });
    canvas.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      state.yaw += (e.clientX - lastX) * 0.01;
      state.pitch = Math.max(-1.55, Math.min(1.57, state.pitch + (e.clientY - lastY) * 0.01));
      lastX = e.clientX;
      lastY = e.clientY;
      render3D();
    });
    canvas.addEventListener('pointerup', function () { dragging = false; });
    canvas.addEventListener('wheel', function (e) {
      e.preventDefault();
      state.zoom = Math.max(0.5, Math.min(2.2, state.zoom - e.deltaY * 0.001));
      render3D();
    }, { passive: false });
  }

  el('unitSystem')?.addEventListener('change', function (e) {
    applyUnitSystem(e.target.value, true);
    updateAll();
  });

  document.querySelectorAll('#cadControls input, #cadControls select:not(#unitSystem)').forEach(function (ctrl) {
    ctrl.addEventListener('input', updateAll);
    ctrl.addEventListener('change', updateAll);
  });

  function setView(yaw, pitch) {
    state.yaw = yaw;
    state.pitch = pitch;
    state.zoom = 1.0;
    render3D();
  }

  el('resetOrbitBtn')?.addEventListener('click', function () { setView(-0.62, 0.42); });
  el('viewIsoBtn')?.addEventListener('click', function () { setView(-0.62, 0.42); });
  el('viewTopBtn')?.addEventListener('click', function () { setView(0, 1.57); });
  el('viewFrontBtn')?.addEventListener('click', function () { setView(0, 0.04); });
  el('viewSideBtn')?.addEventListener('click', function () { setView(Math.PI / 2, 0.04); });
  el('exportStlBtn')?.addEventListener('click', exportStl);
  el('validateStlBtn')?.addEventListener('click', runStlValidation);
  el('exportDxfBtn')?.addEventListener('click', exportDxf);
  el('exportPltBtn')?.addEventListener('click', exportPlt);
  el('exportPartsCsvBtn')?.addEventListener('click', exportPartsCsv);
  el('printPlotBtn')?.addEventListener('click', function () { window.print(); });
  window.addEventListener('resize', render3D);
  window.addEventListener('sena:theme-change', function () {
    render3D();
    renderPlanSvg();
    renderSectionSvg();
  });

  (function initUnits() {
    var q = new URLSearchParams(window.location.search).get('units');
    var saved = null;
    try { saved = localStorage.getItem('sena_cad_units'); } catch (_e) {}
    var initial = (q === 'si' || q === 'imperial') ? q : (saved === 'si' ? 'si' : 'imperial');
    applyUnitSystem(initial, initial === 'si');
  })();

  updateAll();
})();
