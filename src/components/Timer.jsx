// src/components/Timer.jsx
import { useState, useEffect } from "react";
import { Timer as TimerIcon } from "lucide-react";

const Timer = ({ initialSeconds, onTimeUp, warningAt = 120 }) => {
  const [timeLeft, setTimeLeft] = useState(initialSeconds);

  useEffect(() => {
    if (timeLeft <= 0) {
      onTimeUp();
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => prev - 1);
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, onTimeUp]);

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isWarning = timeLeft < warningAt;
  const isCritical = timeLeft < 60;

  return (
    <div className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all ${
      isWarning 
      ? 'bg-danger/10 border-danger text-danger ' + (isCritical ? 'animate-pulse-red' : '') 
      : 'bg-white/5 border-white/10 text-ash-900'
    }`}>
      <TimerIcon size={18} />
      <span className="font-mono font-bold text-lg">{formatTime(timeLeft)}</span>
    </div>
  );
};

export default Timer;

