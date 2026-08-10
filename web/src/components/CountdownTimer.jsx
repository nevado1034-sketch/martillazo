import { useCountdown } from '../hooks/useCountdown.js';

const pad = (n) => String(n).padStart(2, '0');

/**
 * Reloj de cuenta regresiva. Parpadea en rojo cuando faltan menos de 10 min.
 */
export default function CountdownTimer({ endsAt, className = '' }) {
  const { days, hours, minutes, seconds, isHot, isEnded } =
    useCountdown(endsAt);

  if (isEnded) {
    return (
      <span className={`text-sm font-medium text-slate-400 ${className}`}>
        Finalizada
      </span>
    );
  }

  const label =
    days > 0
      ? `${days}d ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return (
    <span
      title="Tiempo restante"
      className={[
        'font-mono text-sm font-bold tabular-nums',
        isHot
          ? 'animate-[countdown-blink_1s_step-end_infinite] text-red-600'
          : 'text-slate-700',
        className,
      ].join(' ')}
    >
      {label}
    </span>
  );
}
