'use strict';

(function(){
  const el=id=>document.getElementById(id);

  const state={
    lengthFt:32,widthFt:16,spacingFt:4,aisleFt:2.5,
    bermFt:2.5,trenchFt:1.5,cells:2,
    layoutMode:'row',climateBias:'thermal',communityUse:'mixed'
  };

  function read(){
    state.lengthFt=Number(el('lengthFt').value);
    state.widthFt=Number(el('widthFt').value);
    state.spacingFt=Number(el('spacingFt').value);
    state.aisleFt=Number(el('aisleFt').value);
    state.bermFt=Number(el('bermFt').value);
    state.trenchFt=Number(el('trenchFt').value);
    state.cells=Number(el('cells').value);
    state.layoutMode=el('layoutMode').value;
    state.climateBias=el('climateBias').value;
    state.communityUse=el('communityUse').value;
  }

  function render(){
    read();

    const d = CGSGeometry.compute(state);

    el('footprintValue').textContent=Math.round(d.totalArea)+' sq ft';
    el('cellsValue').textContent=state.cells;
    el('thermalValue').textContent=d.thermalFactor.toFixed(2);
    el('yieldValue').textContent=Math.round(d.annualYield)+' lb/yr';
    el('peopleValue').textContent=d.people;
    el('windValue').textContent=d.windScore;

    const svg = el('planLayer');
    CGSRenderer.drawSystem(svg,state);
  }

  document.querySelectorAll('input,select').forEach(n=>{
    n.addEventListener('input',render,{passive:true});
  });

  render();
})();