import { OpsEvent, TaproomState } from './types';
const uid=()=>Math.random().toString(36).slice(2,8);
export const createOpsEvent=(message:string,severity:OpsEvent['severity']='info'):OpsEvent=>({id:uid(),message,severity,createdAt:new Date().toISOString()});
export const applyStaffAction=(state:TaproomState,action:string)=>({...state,rushMode:action==='Start rush mode'?true:action==='End rush mode'?false:state.rushMode,opsLog:[createOpsEvent(action,action.includes('Manager')?'warn':'info'),...state.opsLog].slice(0,24)});
