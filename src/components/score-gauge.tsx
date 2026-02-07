import { motion } from "framer-motion";

interface ScoreGaugeProps {
  score: number;
  size?: number;
}

export function ScoreGauge({ score, size = 160 }: ScoreGaugeProps) {
  const strokeWidth = size >= 200 ? 10 : size >= 150 ? 8 : 6;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;
  const offset = circumference - progress;

  const scoreFontSize = size >= 200 ? "text-6xl" : size >= 150 ? "text-5xl" : "text-4xl";
  const labelFontSize = size >= 200 ? "text-sm" : "text-[11px]";

  // Score-based color
  const getStrokeColor = (s: number) => {
    if (s >= 70) return "text-emerald-500";
    if (s >= 50) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="-rotate-90"
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200 dark:text-gray-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className={getStrokeColor(score)}
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className={`${scoreFontSize} font-bold tabular-nums`}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          {score}
        </motion.span>
        <span className={`${labelFontSize} text-muted-foreground font-medium tracking-wide`}>/ 100</span>
      </div>
    </div>
  );
}
