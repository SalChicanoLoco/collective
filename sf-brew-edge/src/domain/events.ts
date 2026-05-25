import { OpsEvent, Severity, StaffAction, TaproomState } from './types';

export function createOpsEvent(input: { message: string; severity?: Severity }): OpsEvent {
  return {
    id: crypto.randomUUID(),
    message: input.message,
    severity: input.severity ?? 'info',
    createdAt: new Date().toISOString(),
  };
}

export function applyStaffAction(state: TaproomState, action: StaffAction): TaproomState {
  const severity: Severity = action === 'Manager needed' || action === 'Customer wait issue' ? 'warn' : 'info';
  const event = createOpsEvent({ message: action, severity });

  return {
    ...state,
    rushMode: action === 'Start rush mode' ? true : action === 'End rush mode' ? false : state.rushMode,
    opsLog: [event, ...state.opsLog].slice(0, 30),
  };
}
