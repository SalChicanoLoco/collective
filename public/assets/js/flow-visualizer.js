(function () {
  'use strict';

  var canvas = document.getElementById('flow-canvas');
  var oscDiffEl = document.getElementById('osc-diff');
  var oscSumEl = document.getElementById('osc-sum');
  if (!canvas || !oscDiffEl || !oscSumEl) return;

  var ctx = canvas.getContext('2d');
  var oscDiff = oscDiffEl.getContext('2d');
  var oscSum = oscSumEl.getContext('2d');

  var currentMode = 'vk';
  var U_inf = 25.0;
  var gamma_val = 1.8;
  var gridNx = 24;
  var gridNy = 14;
  var time = 0;

  var sliderU = document.getElementById('slider-u');
  var sliderGamma = document.getElementById('slider-gamma');
  var sliderGrid = document.getElementById('slider-grid');
  var valU = document.getElementById('val-u');
  var valGamma = document.getElementById('val-gamma');
  var valGrid = document.getElementById('val-grid');
  var modeBadge = document.getElementById('mode-badge');

  function updateTelemetry() {
    var fs = ((0.21 * U_inf) / 0.0014).toFixed(0);
    var fsEl = document.getElementById('telemetry-fs');
    var vortEl = document.getElementById('telemetry-vort');
    var vdiffEl = document.getElementById('telemetry-vdiff');
    var vsumEl = document.getElementById('telemetry-vsum');
    if (fsEl) fsEl.textContent = fs + ' Hz';
    if (vortEl) vortEl.textContent = (U_inf * 2.74).toFixed(1) + ' rad/s';
    if (vdiffEl) vdiffEl.textContent = (U_inf * 0.93).toFixed(1) + ' µV';
    if (vsumEl) vsumEl.textContent = (U_inf * 0.24).toFixed(1) + ' µV';
  }

  sliderU?.addEventListener('input', function (e) {
    U_inf = parseFloat(e.target.value);
    if (valU) valU.textContent = U_inf.toFixed(1) + ' m/s';
    updateTelemetry();
  });

  sliderGamma?.addEventListener('input', function (e) {
    gamma_val = parseFloat(e.target.value);
    if (valGamma) valGamma.textContent = gamma_val.toFixed(1) + ' m²/s';
  });

  sliderGrid?.addEventListener('input', function (e) {
    gridNx = parseInt(e.target.value, 10);
    gridNy = Math.round(gridNx * 0.58);
    if (valGrid) valGrid.textContent = gridNx + ' × ' + gridNy;
  });

  function setMode(mode, btnId, label) {
    currentMode = mode;
    if (modeBadge) modeBadge.textContent = label;
    ['btn-vk', 'btn-wake', 'btn-igw'].forEach(function (id) {
      var btn = document.getElementById(id);
      if (!btn) return;
      btn.classList.toggle('button--primary', id === btnId);
    });
    updateTelemetry();
  }

  document.getElementById('btn-vk')?.addEventListener('click', function () {
    setMode('vk', 'btn-vk', 'Von Kármán Street');
  });
  document.getElementById('btn-wake')?.addEventListener('click', function () {
    setMode('wake', 'btn-wake', 'Wing Wake');
  });
  document.getElementById('btn-igw')?.addEventListener('click', function () {
    setMode('igw', 'btn-igw', 'Internal Gravity Wave');
  });

  function getVelocityAt(x, y, t) {
    var W = canvas.width;
    var H = canvas.height;
    var nx = (x - W * 0.15) / (W * 0.85);
    var ny = (y - H * 0.5) / (H * 0.5);

    if (currentMode === 'vk') {
      var speed = U_inf * 0.04;
      var phase = t * speed;
      var u = U_inf * 0.8;
      var v = 0;
      for (var i = 0; i < 6; i++) {
        var vx_pos = ((i * 0.35 + phase) % 1.4) - 0.2;
        var vy_pos = i % 2 === 0 ? 0.25 : -0.25;
        var sign = i % 2 === 0 ? 1.0 : -1.0;
        var dx = nx - vx_pos;
        var dy = ny - vy_pos;
        var r2 = dx * dx + dy * dy + 0.008;
        var factor = ((gamma_val * 6.0) / (r2 * 100.0 + 1.0)) * sign;
        u += -factor * dy * 12.0;
        v += factor * dx * 12.0;
      }
      return { u: u, v: v, vort: v - u * 0.1 };
    }
    if (currentMode === 'wake') {
      var wake_deficit = U_inf * 0.35 * Math.exp(-(ny * ny) / 0.12);
      var uW = U_inf - wake_deficit;
      var d_top = Math.sqrt(Math.pow(ny - 0.55, 2) + 0.02);
      var d_bot = Math.sqrt(Math.pow(ny + 0.55, 2) + 0.02);
      var vW = -gamma_val * 4.0 * (1.0 / d_top - 1.0 / d_bot) * Math.sin(t * 2.0 + nx * 4.0);
      return { u: uW, v: vW, vort: ny * 15.0 };
    }
    var k_horiz = 6.0;
    var m_vert = 4.0;
    var omega = 1.5;
    var wave_phase = k_horiz * nx + m_vert * ny - omega * t;
    return {
      u: U_inf * 0.7 + Math.cos(wave_phase) * 6.0,
      v: -Math.sin(wave_phase) * 6.0 * (k_horiz / m_vert),
      vort: Math.sin(wave_phase) * 20.0,
    };
  }

  function drawArrow(x, y, u, v, len, color) {
    var angle = Math.atan2(v, u);
    var headlen = 4;
    var tox = x + Math.cos(angle) * len;
    var toy = y + Math.sin(angle) * len;
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x - Math.cos(angle) * (len * 0.3), y - Math.sin(angle) * (len * 0.3));
    ctx.lineTo(tox, toy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tox, toy);
    ctx.lineTo(tox - headlen * Math.cos(angle - Math.PI / 6), toy - headlen * Math.sin(angle - Math.PI / 6));
    ctx.lineTo(tox - headlen * Math.cos(angle + Math.PI / 6), toy - headlen * Math.sin(angle + Math.PI / 6));
    ctx.closePath();
    ctx.fill();
  }

  function drawOscilloscopes(t) {
    var fs = (0.21 * U_inf) / 0.0014;
    var w = 380;
    var h = 60;
    oscDiff.fillStyle = '#070a0f';
    oscDiff.fillRect(0, 0, w, h);
    oscDiff.strokeStyle = '#4cc9f0';
    oscDiff.lineWidth = 1.8;
    oscDiff.beginPath();
    for (var x = 0; x < w; x++) {
      var y = h / 2 + Math.sin(t * 8.0 + (x / 20.0) * (fs / 500.0)) * 22.0;
      if (x === 0) oscDiff.moveTo(x, y);
      else oscDiff.lineTo(x, y);
    }
    oscDiff.stroke();

    oscSum.fillStyle = '#070a0f';
    oscSum.fillRect(0, 0, w, h);
    oscSum.strokeStyle = '#f4a261';
    oscSum.lineWidth = 1.8;
    oscSum.beginPath();
    for (var x2 = 0; x2 < w; x2++) {
      var y2 = h / 2 - 12.0 + Math.sin(t * 0.5 + x2 / 80.0) * 4.0;
      if (x2 === 0) oscSum.moveTo(x2, y2);
      else oscSum.lineTo(x2, y2);
    }
    oscSum.stroke();
  }

  function render() {
    time += 0.04;
    var cs = getComputedStyle(document.documentElement);
    ctx.fillStyle = cs.getPropertyValue('--bg').trim() || '#070a0f';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    var dx = canvas.width / (gridNx + 1);
    var dy = canvas.height / (gridNy + 1);

    if (currentMode === 'vk') {
      var wireX = canvas.width * 0.12;
      var wireY = canvas.height * 0.5;
      ctx.fillStyle = '#f4a261';
      ctx.beginPath();
      ctx.arc(wireX, wireY, 9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4cc9f0';
      ctx.fillRect(wireX - 6, wireY - 28, 12, 10);
      ctx.fillRect(wireX - 6, wireY + 18, 12, 10);
    }

    for (var ix = 1; ix <= gridNx; ix++) {
      for (var iy = 1; iy <= gridNy; iy++) {
        var px = ix * dx;
        var py = iy * dy;
        var res = getVelocityAt(px, py, time);
        var mag = Math.sqrt(res.u * res.u + res.v * res.v);
        var hue = (190 + Math.sin(res.vort * 0.1) * 60 + (mag / 40.0) * 80) % 360;
        var arrowLength = Math.min(14, Math.max(6, (mag / 30.0) * 12));
        drawArrow(ctx, px, py, res.u, res.v, arrowLength, 'hsl(' + hue + ', 88%, 60%)');
      }
    }

    drawOscilloscopes(time);
    requestAnimationFrame(render);
  }

  updateTelemetry();
  render();
})();
