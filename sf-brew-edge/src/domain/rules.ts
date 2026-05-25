import { StaffLoad, Tap, TaproomPulse, TaproomState } from './types';
export const estimateKegRisk=(taps:Tap[])=>taps.filter(t=>t.fillPct<20||t.low).length;
export const calculateTaproomPulse=(s:TaproomState):TaproomPulse=> s.rushMode?'rush': estimateKegRisk(s.taps)>2?'critical':'steady';
export const calculateStaffLoad=(s:TaproomState):StaffLoad=>{const score=(s.rushMode?70:35)+Math.min(30,s.opsLog.length); return {score,level:score>75?'high':score>50?'medium':'low'};};
export const simulateRush=(s:TaproomState)=>({...s,rushMode:true});
export const tickDemoState=(s:TaproomState)=>({...s,taps:s.taps.map(t=>({...t,fillPct:Math.max(0,t.fillPct-1),low:t.fillPct<18}))});
