'use strict';

(function(global){
  const SVG_NS = 'http://www.w3.org/2000/svg';

  function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }

  function drawRect(svg,x,y,w,h,fill,stroke){
    const r=document.createElementNS(SVG_NS,'rect');
    r.setAttribute('x',x);r.setAttribute('y',y);
    r.setAttribute('width',w);r.setAttribute('height',h);
    r.setAttribute('fill',fill||'none');
    r.setAttribute('stroke',stroke||'#333');
    svg.appendChild(r);
  }

  function drawHoop(svg,cx,baseY,widthFt,heightFt){
    const w = CGSGeometry.toPx(widthFt);
    const h = CGSGeometry.toPx(heightFt);

    const path = document.createElementNS(SVG_NS,'path');
    const d = `M ${cx-w/2} ${baseY} Q ${cx} ${baseY-h} ${cx+w/2} ${baseY}`;
    path.setAttribute('d',d);
    path.setAttribute('stroke','#215732');
    path.setAttribute('stroke-width','3');
    path.setAttribute('fill','none');
    svg.appendChild(path);
  }

  function drawSystem(svg,state){
    clear(svg);

    const spacing = CGSGeometry.toPx(state.lengthFt+4);

    for(let i=0;i<state.cells;i++){
      drawHoop(svg,200 + i*spacing,500,state.widthFt,state.widthFt/2);
    }
  }

  global.CGSRenderer = { drawSystem };

})(window);