(function () {
  'use strict';

  var el = function (id) {
    return document.getElementById(id);
  };
  var NS = 'http://www.w3.org/2000/svg';

  var state = {
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

  var TIERS = {
    salvage: { label: 'Scrappy Salvage', rate: 1.85, desc: 'Reclaimed lumber, salvaged barrels, poly film' },
    balanced: { label: 'Balanced Low-Cost', rate: 4.25, desc: 'EMT/PVC hoops, UV poly, 55-gal barrels, earth berm' },
    upgraded: { label: 'Upgraded Kit', rate: 8.5, desc: 'Galvanized steel, twin-wall polycarbonate, geothermal loop' },
  };

  function clamp(v, min, max, fallback) {
    var n = Number(v);
    if (!Number.isFinite(n)) return fallback;
    return Math.min(max, Math.max(min, n));
  }

  function readInputs() {
    state.lengthFt = clamp(el('lengthFt').value, 12, 96, 32);
    state.widthFt = clamp(el('widthFt').value, 10, 32, 16);
    state.spacingFt = clamp(el('spacingFt').value, 2, 8, 4);
    state.aisleFt = clamp(el('aisleFt').value, 1.5, 5, 2.5);
    state.bermFt = clamp(el('bermFt').value, 0, 6, 2.5);
    state.trenchFt = clamp(el('trenchFt').value, 0, 4, 1.5);
    state.tier = el('buildTier').value || 'balanced';
    state.showBarrels = el('showBarrels').checked;
    state.showAirTube = el('showAirTube').checked;
    state.wireframe = el('wireframeMode').checked;
  }

  function derived() {
    var area = state.lengthFt * state.widthFt;
    var hoops = Math.floor(state.lengthFt / state.spacingFt) + 1;
    var bedWidth = Math.max(1.5, (state.widthFt - state.aisleFt - 2) / 2);
    var barrelCount = state.showBarrels ? Math.max(2, Math.floor((state.lengthFt - 2) / 2)) : 0;
    var waterGal = barrelCount * 55;
    var btuPerDegF = Math.round(waterGal * 8.34);
    var glazingSqFt = Math.round(state.lengthFt * (state.widthFt * 1.18));
    var foodLbYr = Math.round(area * 0.65);
    var tierInfo = TIERS[state.tier] || TIERS.balanced;
    var estCost = Math.round(area * tierInfo.rate);
    return {
      area: area,
      hoops: hoops,
      bedWidth: bedWidth,
      barrelCount: barrelCount,
      waterGal: waterGal,
      btuPerDegF: btuPerDegF,
      glazingSqFt: glazingSqFt,
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

    // CAD dark drafting background matching --surface
    ctx.fillStyle = '#17130d';
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
    ctx.fillText(L + ' ft (X) × ' + W + ' ft (Y) · Ridge ' + state.ridgeFt + ' ft · Drag to orbit', 14, h - 14);
  }

  // --- 2D CAD Blueprints (Plan + Section SVG) ---
  function makeSvg(tag, attrs) {
    var n = document.createElementNS(NS, tag);
    Object.keys(attrs).forEach(function (k) { n.setAttribute(k, String(attrs[k])); });
    return n;
  }

  function renderPlanSvg() {
    var root = el('planSvg');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    var d = derived();
    var pad = 40;
    var scale = 14;
    var w = state.lengthFt * scale;
    var h = state.widthFt * scale;
    root.setAttribute('viewBox', '0 0 ' + (w + pad * 2) + ' ' + (h + pad * 2));

    root.appendChild(makeSvg('rect', { x: pad, y: pad, width: w, height: h, fill: '#0f0c08', stroke: '#e8a825', 'stroke-width': 2 }));
    // North barrel spine
    if (state.showBarrels) {
      root.appendChild(makeSvg('rect', { x: pad + 6, y: pad + 4, width: w - 12, height: 18, fill: '#356085', stroke: '#7ab4e8', 'stroke-width': 1 }));
    }
    // Central aisle
    var aislePx = state.aisleFt * scale;
    var aisleY = pad + h / 2 - aislePx / 2;
    root.appendChild(makeSvg('rect', { x: pad + 4, y: aisleY, width: w - 8, height: aislePx, fill: '#2a2015', stroke: 'rgba(246,234,215,0.35)', 'stroke-dasharray': '4 3' }));

    // North & South grow beds
    var northBedH = Math.max(14, aisleY - (pad + 26));
    var southBedY = aisleY + aislePx + 4;
    var southBedH = Math.max(14, pad + h - 6 - southBedY);
    root.appendChild(makeSvg('rect', { x: pad + 8, y: pad + 26, width: w - 16, height: northBedH, fill: 'rgba(120,155,104,0.45)', stroke: '#9bc289' }));
    root.appendChild(makeSvg('rect', { x: pad + 8, y: southBedY, width: w - 16, height: southBedH, fill: 'rgba(120,155,104,0.45)', stroke: '#9bc289' }));

    // Hoop stations
    for (var i = 0; i < d.hoops; i++) {
      var hx = Math.min(pad + w, pad + i * state.spacingFt * scale);
      root.appendChild(makeSvg('line', { x1: hx, y1: pad - 4, x2: hx, y2: pad + h + 4, stroke: 'rgba(232,168,37,0.45)', 'stroke-width': 1 }));
    }

    var lbl = makeSvg('text', { x: pad, y: pad - 12, fill: '#f6ead7', 'font-size': 12, 'font-family': 'monospace' });
    lbl.textContent = 'PLAN: ' + state.lengthFt + ' ft (X) × ' + state.widthFt + ' ft (Y) · North Barrels at Top · Central Aisle ' + state.aisleFt + ' ft';
    root.appendChild(lbl);
  }

  function renderSectionSvg() {
    var root = el('sectionSvg');
    if (!root) return;
    while (root.firstChild) root.removeChild(root.firstChild);
    var scale = 18;
    var pad = 44;
    var w = state.widthFt * scale;
    var groundY = 210;
    var trenchPx = state.trenchFt * scale;
    var bermPx = state.bermFt * scale;
    var ridgePx = state.ridgeFt * scale;
    root.setAttribute('viewBox', '0 0 ' + (w + pad * 2) + ' 270');

    // Ground datum
    root.appendChild(makeSvg('line', { x1: 12, y1: groundY, x2: w + pad * 2 - 12, y2: groundY, stroke: 'rgba(246,234,215,0.4)', 'stroke-dasharray': '5 4' }));
    // Earth berm on North (left)
    root.appendChild(makeSvg('polygon', {
      points: (pad - 32) + ',' + groundY + ' ' + pad + ',' + (groundY - bermPx) + ' ' + pad + ',' + groundY,
      fill: 'rgba(130,90,45,0.75)', stroke: '#e8a825',
    }));
    // Sunken trench floor
    root.appendChild(makeSvg('rect', { x: pad, y: groundY, width: w, height: trenchPx, fill: '#0f0c08', stroke: '#f5efe6' }));
    // South glazing arch / slope
    root.appendChild(makeSvg('path', {
      d: 'M ' + pad + ' ' + (groundY - bermPx) + ' Q ' + (pad + w * 0.45) + ' ' + (groundY - ridgePx * 1.45) + ' ' + (pad + w) + ' ' + groundY,
      fill: 'none', stroke: '#e8a825', 'stroke-width': 2.5,
    }));
    // Geothermal air tube
    if (state.showAirTube) {
      root.appendChild(makeSvg('circle', { cx: pad + w / 2, cy: groundY + trenchPx + 18, r: 9, fill: '#356085', stroke: '#7ab4e8', 'stroke-width': 1.5 }));
    }
    var lbl = makeSvg('text', { x: pad, y: 24, fill: '#f6ead7', 'font-size': 12, 'font-family': 'monospace' });
    lbl.textContent = 'SECTION (N → S): Berm ' + state.bermFt + ' ft · Trench ' + state.trenchFt + ' ft · Ridge ' + state.ridgeFt + ' ft';
    root.appendChild(lbl);
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

  function exportStl() {
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
    downloadFile('greenhouse-' + state.lengthFt + 'x' + state.widthFt + '-scale1to50.stl', out.join('\n'), 'model/stl');
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
    var L = state.lengthFt;
    var W = state.widthFt;
    var mid = W / 2;
    var halfA = state.aisleFt / 2;
    var entities = [
      dxfRect('WALLS', 0, 0, L, W),
      dxfRect('AISLE', 0.5, mid - halfA, L - 0.5, mid + halfA),
      dxfRect('GROW_BEDS', 1, 0.8, L - 1, mid - halfA - 0.3),
      dxfRect('GROW_BEDS', 1, mid + halfA + 0.3, L - 1, W - 2.2),
    ];
    if (state.showBarrels) {
      entities.push(dxfRect('NORTH_BARRELS', 1, W - 1.8, L - 1, W - 0.2));
    }
    var dxf = ['0', 'SECTION', '2', 'ENTITIES', entities.join('\n'), '0', 'ENDSEC', '0', 'EOF'].join('\n');
    downloadFile('greenhouse-' + L + 'x' + W + '-plan.dxf', dxf, 'application/dxf');
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

  function renderMetrics() {
    var d = derived();
    el('footprintValue').textContent = Math.round(d.area) + ' sq ft';
    el('hoopsValue').textContent = d.hoops + ' hoops';
    el('thermalValue').textContent = d.waterGal + ' gal (' + d.btuPerDegF + ' BTU/°F)';
    el('costValue').textContent = '$' + d.estCost.toLocaleString() + ' (' + d.tierInfo.label + ')';

    var bom = el('bomList');
    bom.textContent = '';
    [
      'Footprint: ' + state.lengthFt + ' ft × ' + state.widthFt + ' ft (' + d.area + ' sq ft)',
      'Glazing envelope: ~' + d.glazingSqFt + ' sq ft (50° south slope)',
      'Hoops & ground anchors: ' + d.hoops + ' hoops / ' + d.hoops * 2 + ' anchors',
      'North thermal mass: ' + d.barrelCount + ' × 55-gal barrels (' + d.waterGal + ' gal)',
      'Grow beds: 2 × ' + d.bedWidth.toFixed(1) + ' ft wide, separated by ' + state.aisleFt + ' ft aisle',
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
      state.pitch = Math.max(0.08, Math.min(1.35, state.pitch + (e.clientY - lastY) * 0.01));
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

  document.querySelectorAll('#cadControls input, #cadControls select').forEach(function (ctrl) {
    ctrl.addEventListener('input', updateAll);
    ctrl.addEventListener('change', updateAll);
  });

  el('resetOrbitBtn')?.addEventListener('click', function () {
    state.yaw = -0.62;
    state.pitch = 0.42;
    state.zoom = 1.0;
    render3D();
  });
  el('exportStlBtn')?.addEventListener('click', exportStl);
  el('exportDxfBtn')?.addEventListener('click', exportDxf);
  window.addEventListener('resize', render3D);

  updateAll();
})();
