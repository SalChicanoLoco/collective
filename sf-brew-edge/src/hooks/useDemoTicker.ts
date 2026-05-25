import { useEffect } from 'react';

export function useDemoTicker(onTick: () => void): void {
  useEffect(() => {
    const timer = window.setInterval(onTick, 12000);
    return () => window.clearInterval(timer);
  }, [onTick]);
}
