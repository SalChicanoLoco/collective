'use strict';

(function(global){

  function render(svgRoot, state, derived) {
    const planLayer = document.getElementById('planLayer');
    const sectionLayer = document.getElementById('sectionLayer');
    const articleLayer = document.getElementById('articleCalloutLayer');

    if (!planLayer || !sectionLayer || !articleLayer) return;

    // clear layers only
    planLayer.innerHTML = '';
    sectionLayer.innerHTML = '';
    articleLayer.innerHTML = '';

    const SVG_NS = 'http://www.w3.org/2000/svg';
    const scale = 18;

    const w = state.lengthFt * scale;
    const h = state.widthFt * scale;

    let offsetX = 80;
    const baseY = 180;

    // ===== PLAN VIEW =====
    for (let i = 0; i < state.cells; i++) {

      // outer footprint
      const outer = document.createElementNS(SVG_NS, 'rect');
      outer.setAttribute('x', offsetX);
      outer.setAttribute('y', baseY);
      outer.setAttribute('width', w);
      outer.setAttribute('height', h);
      outer.setAttribute('fill', '#ffffff');
      outer.setAttribute('stroke', '#374151');
      outer.setAttribute('stroke-width', '2');
      planLayer.appendChild(outer);

      const aisle = state.aisleFt * scale;
      const bed = (w - aisle) / 2;

      // left bed
      const left = document.createElementNS(SVG_NS, 'rect');
      left.setAttribute('x', offsetX);
      left.setAttribute('y', baseY);
      left.setAttribute('width', bed);
      left.setAttribute('height', h);
      left.setAttribute('fill', '#e6dcc5');
      planLayer.appendChild(left);

      // aisle
      const aisleRect = document.createElementNS(SVG_NS, 'rect');
      aisleRect.setAttribute('x', offsetX + bed);
      aisleRect.setAttribute('y', baseY);
      aisleRect.setAttribute('width', aisle);
      aisleRect.setAttribute('height', h);
      aisleRect.setAttribute('fill', '#e5e7eb');
      planLayer.appendChild(aisleRect);

      // right bed
      const right = document.createElementNS(SVG_NS, 'rect');
      right.setAttribute('x', offsetX + bed + aisle);
      right.setAttribute('y', baseY);
      right.setAttribute('width', bed);
      right.setAttribute('height', h);
      right.setAttribute('fill', '#e6dcc5');
      planLayer.appendChild(right);

      // hoop spacing lines
      const hoops = Math.max(2, Math.floor(state.lengthFt / state.spacingFt) + 1);

      for (let j = 0; j < hoops; j++) {
        const x = offsetX + (j * w) / (hoops - 1);

        const line = document.createElementNS(SVG_NS, 'line');
        line.setAttribute('x1', x);
        line.setAttribute('y1', baseY);
        line.setAttribute('x2', x);
        line.setAttribute('y2', baseY + h);
        line.setAttribute('stroke', '#9ca3af');
        line.setAttribute('stroke-dasharray', '4 4');
        planLayer.appendChild(line);
      }

      offsetX += w + 40;
    }

    // ===== SECTION VIEW =====
    const secY = 620;
    const centerX = 300;

    const span = state.widthFt * 25;
    const leftX = centerX - span / 2;
    const rightX = centerX + span / 2;
    const peak = secY - span / 3;

    const hoop = document.createElementNS(SVG_NS, 'path');
    hoop.setAttribute('d', `M ${leftX} ${secY} Q ${centerX} ${peak} ${rightX} ${secY}`);
    hoop.setAttribute('stroke', '#215732');
    hoop.setAttribute('stroke-width', '4');
    hoop.setAttribute('fill', 'none');
    sectionLayer.appendChild(hoop);

    const ground = document.createElementNS(SVG_NS, 'line');
    ground.setAttribute('x1', leftX - 50);
    ground.setAttribute('y1', secY);
    ground.setAttribute('x2', rightX + 50);
    ground.setAttribute('y2', secY);
    ground.setAttribute('stroke', '#444');
    sectionLayer.appendChild(ground);

    // ===== CALLOUT =====
    const text = document.createElementNS(SVG_NS, 'text');
    text.setAttribute('x', 900);
    text.setAttribute('y', 200);
    text.setAttribute('font-size', '18');
    text.textContent = `Feeds ~${derived.people} people`;
    articleLayer.appendChild(text);
  }

  global.CGSRenderer = { render };

})(window);