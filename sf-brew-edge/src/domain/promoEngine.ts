import { PromoSuggestion, TaproomState } from './types';
export function generatePromoSuggestions(state:TaproomState):PromoSuggestion[]{
const out:PromoSuggestion[]=[]; if(state.rushMode) out.push({title:'Event surge mode',requiresManagerApproval:true,reason:'Switch service pattern during rush.'});
if(state.taps.some(t=>t.fillPct<18)) out.push({title:'Keg protection',requiresManagerApproval:true,reason:'Suppress promotions on low-fill taps.'});
out.push({title:'Soft happy hour',requiresManagerApproval:true,reason:'Drive steady traffic without pricing automation.'});
out.push({title:'Flight push',requiresManagerApproval:true,reason:'Promote curated flights with manager sign-off.'}); return out; }
