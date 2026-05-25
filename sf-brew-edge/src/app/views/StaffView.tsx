import { StaffAction } from '../../domain/types';
import { StaffActionGrid } from '../../components/StaffActionGrid';

export function StaffView({ onAction }: { onAction: (action: StaffAction) => void }) {
  return <StaffActionGrid onAction={onAction} />;
}
