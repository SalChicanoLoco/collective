export type Role = 'Staff' | 'Manager' | 'Owner';
export type Severity = 'info' | 'warn' | 'critical';

export interface OpsEvent {
  id: string;
  message: string;
  severity: Severity;
  createdAt: string;
}

export type TaproomPulse = 'calm' | 'steady' | 'rush' | 'critical';

export interface StaffLoad {
  level: 'low' | 'medium' | 'high';
  score: number;
}

export interface Beer {
  id: string;
  name: string;
  style: string;
  abv: string;
}

export interface Tap {
  id: string;
  name: string;
  beer: Beer;
  fillPct: number;
  low: boolean;
  poursPerHour: number;
}

export interface IntakeProfile {
  venueName: string;
  painPoints: string[];
}

export interface CompiledBreweryProfile {
  recommendedView: 'Dashboard' | 'Intake' | 'Staff' | 'TapBoard' | 'Triggers';
  dashboardEmphasis: string[];
  riskRulesEnabled: string[];
  staffActionPriority: string[];
  promoSafetySettings: string[];
  nextIntakeSessions: string[];
  managerTalkingPoints: string[];
  showPciBoundaryWarning: boolean;
}

export interface PromoSuggestion {
  title: string;
  reason: string;
  requiresManagerApproval: true;
}

export interface CopilotRecommendation {
  title: string;
  observation: string;
  reasoning: string;
  recommendedAction: string;
  riskDownside: string;
  staffImpact: string;
  confidenceLabel: 'Low' | 'Medium' | 'High';
}

export interface PaymentReferenceSafe {
  external_transaction_id: string;
  processor_name: string;
  payment_status: string;
  amount_authorized: number;
  amount_captured: number;
  tip_amount: number;
  last4?: string;
  card_brand?: string;
  created_at: string;
}

export interface TaproomState {
  role: Role;
  activeView: 'Dashboard' | 'Intake' | 'Staff' | 'TapBoard' | 'Triggers';
  intakeProfile: IntakeProfile;
  compiledProfile: CompiledBreweryProfile;
  taps: Tap[];
  opsLog: OpsEvent[];
  rushMode: boolean;
  managerApprovedPromos: string[];
}

export type StaffAction =
  | 'New tab note'
  | 'Flag keg low'
  | '86 item'
  | 'Customer wait issue'
  | 'Restock needed'
  | 'Manager needed'
  | 'Start rush mode'
  | 'End rush mode';
