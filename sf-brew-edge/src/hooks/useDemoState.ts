import { useCallback } from 'react';
import { applyStaffAction } from '../domain/events';
import { initialState } from '../domain/initialState';
import { tickDemoState } from '../domain/rules';
import { StaffAction, TaproomState } from '../domain/types';
import { useLocalStorage } from './useLocalStorage';

export function useDemoState() {
  const [state, setState] = useLocalStorage<TaproomState>('sf-brew-edge-state', initialState);

  const dispatchStaffAction = useCallback((action: StaffAction) => {
    setState((prev) => applyStaffAction(prev, action));
  }, [setState]);

  const tick = useCallback(() => {
    setState((prev) => tickDemoState(prev));
  }, [setState]);

  return { state, setState, dispatchStaffAction, tick };
}
