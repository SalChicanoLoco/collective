export type Role = 'Staff'|'Manager'|'Owner'; export type Severity='info'|'warn'|'critical';
export type Beer={id:string;name:string;style:string}; export type Tap={id:string;beer:Beer;fillPct:number;low:boolean};
export type OpsEvent={id:string;message:string;severity:Severity;createdAt:string}; export type TaproomPulse='calm'|'steady'|'rush'|'critical';
export type StaffLoad={level:'low'|'medium'|'high';score:number}; export type IntakeProfile={painPoints:string[];venue:string};
export type CompiledBreweryProfile={recommendedView:string;dashboardEmphasis:string[];riskRules:string[];staffPriorities:string[];promoSafety:string[];nextSessions:string[];managerTalkingPoints:string[];pciBoundaryWarning:boolean};
export type PromoSuggestion={title:string;requiresManagerApproval:true;reason:string};
export type CopilotRecommendation={title:string;observation:string;reasoning:string;recommendedAction:string;riskDownside:string;staffImpact:string;confidenceLabel:'low'|'medium'|'high'};
export type PaymentReferenceSafe={external_transaction_id:string;processor_name:string;payment_status:string;amount_authorized:number;amount_captured:number;tip_amount:number;last4?:string;card_brand?:string;created_at:string};
export type TaproomState={role:Role;taps:Tap[];opsLog:OpsEvent[];rushMode:boolean;intake:CompiledBreweryProfile};
