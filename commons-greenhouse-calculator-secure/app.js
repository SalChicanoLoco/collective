'use strict';

(function(){
  const el = id => document.getElementById(id);

  const clamp = (v,min,max,def)=>{
    const n = Number(v);
    if(!Number.isFinite(n)) return def;
    return Math.min(max,Math.max(min,n));
  };

  const state = {
    lengthFt:32,widthFt:16,spacingFt:4,aisleFt:2.5,bermFt:2.5,trenchFt:1.5
  };

  const inputs = ['lengthFt','widthFt','spacingFt','aisleFt','bermFt','trenchFt'];

  function read(){
    state.lengthFt = clamp(el('lengthFt').value,12,120,32);
    state.widthFt = clamp(el('widthFt').value,10,40,16);
    state.spacingFt = clamp(el('spacingFt').value,2,8,4);
    state.aisleFt = clamp(el('aisleFt').value,1.5,4,2.5);
    state.bermFt = clamp(el('bermFt').value,0,6,2.5);
    state.trenchFt = clamp(el('trenchFt').value,0,4,1.5);
  }

  function renderStats(){
    const footprint = Math.round(state.lengthFt*state.widthFt);
    const hoops = Math.floor(state.lengthFt/state.spacingFt)+1;
    const bed = (state.widthFt-state.aisleFt)/2;

    el('footprintValue').textContent = footprint+' sq ft';
    el('hoopsValue').textContent = String(hoops);
    el('bedsValue').textContent = bed.toFixed(1)+' ft';
    el('biasValue').textContent = 'Passive';
  }

  function clear(node){ while(node.firstChild) node.removeChild(node.firstChild); }

  function renderBOM(){
    const mount = el('bomContainer');
    clear(mount);
    const ul = document.createElement('ul');
    ['Frame','Anchors','Skin','Beds','Thermal','Air tube'].forEach(t=>{
      const li = document.createElement('li');
      li.textContent = t;
      ul.appendChild(li);
    });
    mount.appendChild(ul);
  }

  function render(){
    read();
    renderStats();
    renderBOM();
  }

  inputs.forEach(id=>{
    el(id).addEventListener('input',render,{passive:true});
  });

  el('downloadJsonBtn').addEventListener('click',()=>{
    const blob = new Blob([JSON.stringify(state)],{type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href=url; a.download='cgs.json'; a.click();
    URL.revokeObjectURL(url);
  });

  el('printBtn').addEventListener('click',()=>window.print());

  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js');
  }

  render();
})();