'use strict';

(function(){
  const el=id=>document.getElementById(id);

  const clamp=(v,min,max,d)=>{
    const n=Number(v);
    if(!Number.isFinite(n)) return d;
    return Math.min(max,Math.max(min,n));
  };

  const state={
    lengthFt:32,widthFt:16,spacingFt:4,aisleFt:2.5,
    bermFt:2.5,trenchFt:1.5,
    cells:1,
    aquaponics:false
  };

  const inputs=['lengthFt','widthFt','spacingFt','aisleFt','bermFt','trenchFt'];

  function read(){
    state.lengthFt=clamp(el('lengthFt').value,12,120,32);
    state.widthFt=clamp(el('widthFt').value,10,40,16);
    state.spacingFt=clamp(el('spacingFt').value,2,8,4);
    state.aisleFt=clamp(el('aisleFt').value,1.5,4,2.5);
    state.bermFt=clamp(el('bermFt').value,0,6,2.5);
    state.trenchFt=clamp(el('trenchFt').value,0,4,1.5);
  }

  function derived(){
    const baseArea=state.lengthFt*state.widthFt;
    const totalArea=baseArea*state.cells;

    const hoops=Math.floor(state.lengthFt/state.spacingFt)+1;

    // conservative production model
    const foodLbYr=totalArea*0.6;
    const people=Math.max(1,Math.floor(foodLbYr/400));

    return {baseArea,totalArea,hoops,foodLbYr,people};
  }

  function renderStats(){
    const d=derived();
    el('footprintValue').textContent=Math.round(d.totalArea)+' sq ft';
    el('hoopsValue').textContent=d.hoops+' × '+state.cells;
    el('bedsValue').textContent=((state.widthFt-state.aisleFt)/2).toFixed(1)+' ft';
    el('biasValue').textContent=d.people+' people fed';
  }

  function clear(n){while(n.firstChild)n.removeChild(n.firstChild);}

  function renderBOM(){
    const d=derived();
    const mount=el('bomContainer');
    clear(mount);

    const ul=document.createElement('ul');

    const items=[
      'Frame × '+state.cells,
      'Anchors '+(d.hoops*2*state.cells),
      'Cover ~'+Math.round(d.totalArea*1.6)+' sq ft',
      'Beds / grow zones',
      state.aquaponics?'Fish tank + gravity return':'Soil mode (no fish)',
      'Thermal barrels (north wall)'
    ];

    items.forEach(t=>{
      const li=document.createElement('li');
      li.textContent=t;
      ul.appendChild(li);
    });

    mount.appendChild(ul);
  }

  function renderCost(){
    const d=derived();
    const mount=el('costContainer');
    clear(mount);

    const low=d.totalArea*2;
    const high=d.totalArea*8;

    [
      'Low $'+Math.round(low),
      'High $'+Math.round(high),
      'Yield '+Math.round(d.foodLbYr)+' lb/yr'
    ].forEach(t=>{
      const div=document.createElement('div');
      div.textContent=t;
      mount.appendChild(div);
    });
  }

  function render(){
    read();
    renderStats();
    renderBOM();
    renderCost();
  }

  inputs.forEach(id=>el(id).addEventListener('input',render,{passive:true}));

  render();
})();
