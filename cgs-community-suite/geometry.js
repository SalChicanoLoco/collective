'use strict';

(function(global){
  const SCALE = 18;

  function toPx(ft){ return ft * SCALE; }

  function compute(state){
    const baseArea = state.lengthFt * state.widthFt;
    const totalArea = baseArea * state.cells;

    const hoops = Math.floor(state.lengthFt/state.spacingFt)+1;

    const thermalFactor = state.climateBias === 'thermal' ? 1.25 : (state.climateBias === 'light' ? 0.9 : 1);

    const yieldPerFt = state.communityUse === 'greens' ? 0.8 : (state.communityUse === 'nursery' ? 0.4 : 0.6);

    const annualYield = totalArea * yieldPerFt * thermalFactor;
    const people = Math.max(1, Math.floor(annualYield / 350));

    const windScore = state.bermFt >= 2 ? 'Hardened' : 'Moderate';

    return {
      baseArea,
      totalArea,
      hoops,
      annualYield,
      people,
      windScore,
      thermalFactor
    };
  }

  global.CGSGeometry = { toPx, compute };

})(window);