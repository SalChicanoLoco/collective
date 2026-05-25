import { CopilotRecommendation, TaproomState } from './types';
import { calculateStaffLoad } from './rules';
export const generateManagerRecommendations=(s:TaproomState):CopilotRecommendation[]=>[{title:'AI-ready rules engine — local simulation mode.',observation:`Staff load ${calculateStaffLoad(s).level}.`,reasoning:'Deterministic rules favor manager-approved service changes.',recommendedAction:'Approve soft happy hour only when rush mode is off.',riskDownside:'Over-promotion can overwhelm bar flow.',staffImpact:'Reduces context-switching during peak.',confidenceLabel:'high'}];
