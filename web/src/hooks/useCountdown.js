import { useEffect, useState } from 'react';

/**
 * Cuenta regresiva en tiempo real hacia un instante ISO.
 * Marca `isHot` cuando faltan menos de `hotThresholdMs` (reloj que parpadea).
 */
export function useCountdown(
  targetISO,
  { hotThresholdMs = 10 * 60 * 1000, refreshMs = 1000 } = {},
) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), refreshMs);
    return () => clearInterval(id);
  }, [refreshMs]);

  const target = targetISO ? new Date(targetISO).getTime() : 0;
  const diff = Math.max(0, target - now);
  const totalSeconds = Math.floor(diff / 1000);

  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    isHot: diff > 0 && diff <= hotThresholdMs,
    isEnded: diff === 0,
    target: targetISO,
  };
}
