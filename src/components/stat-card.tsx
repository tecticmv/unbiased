import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

function useCountUp(target: number, duration = 1200, inView: boolean) {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let start = 0;
    const startTime = performance.now();

    function tick(now: number) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(eased * target);

      if (current !== start) {
        start = current;
        setValue(current);
      }

      if (progress < 1) {
        requestAnimationFrame(tick);
      }
    }

    requestAnimationFrame(tick);
  }, [target, duration, inView]);

  return value;
}

interface StatCardProps {
  title: string;
  value: string | number;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  padZero?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBgColor?: string;
}

export function StatCard({
  title,
  value,
  numericValue,
  prefix = "",
  suffix = "",
  padZero = false,
  subtitle,
  icon: Icon,
  iconColor = "text-primary",
}: StatCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const isInView = useInView(ref, { once: true, margin: "-50px" });
  const animatedValue = useCountUp(numericValue ?? 0, 1200, isInView);

  const formatValue = (n: number) => {
    if (padZero && n < 10) return `0${n}`;
    return n.toLocaleString();
  };

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="text-center"
    >
      <div className={cn("inline-flex items-center justify-center h-10 w-10 rounded-full bg-muted mb-3")}>
        <Icon className={cn("h-5 w-5", iconColor)} />
      </div>
      <div className="text-4xl font-bold tabular-nums tracking-tight">
        {numericValue != null ? (
          <>{prefix}{formatValue(animatedValue)}{suffix}</>
        ) : (
          value
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{title}</p>
      {subtitle && (
        <p className="text-xs text-muted-foreground/60 mt-0.5">{subtitle}</p>
      )}
    </motion.div>
  );
}
