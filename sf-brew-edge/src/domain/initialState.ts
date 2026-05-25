import { compileBreweryProfile } from './intakeCompiler';
import { TaproomState } from './types';
export const initialState:TaproomState={role:'Manager',rushMode:false,opsLog:[],taps:[{id:'1',beer:{id:'b1',name:'Desert IPA',style:'IPA'},fillPct:72,low:false},{id:'2',beer:{id:'b2',name:'Noir Stout',style:'Stout'},fillPct:16,low:true}],intake:compileBreweryProfile({venue:'Brian Demo Mode',painPoints:['Rush line friction','Keg/tap changes','Manager visibility','PCI/payment risk']})};
