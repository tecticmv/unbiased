import { motion } from "framer-motion";
import { TrendingUp, Wrench, Scale, Leaf, Users, Settings, Bot, MessageCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpertAvatar } from "./expert-avatar";
import type { ExpertType } from "@/types";
import { expertPersonas } from "@/types";

// Affiliation badge with icon only (matching message-bubble style)
const affiliationBadges: Record<ExpertType, { icon: LucideIcon; bgColor: string }> = {
  ai_economist: { icon: TrendingUp, bgColor: "bg-amber-500" },
  ai_engineer: { icon: Wrench, bgColor: "bg-orange-500" },
  ai_legal: { icon: Scale, bgColor: "bg-purple-500" },
  ai_environmental: { icon: Leaf, bgColor: "bg-green-500" },
  ai_social: { icon: Users, bgColor: "bg-pink-500" },
  ai_operations: { icon: Settings, bgColor: "bg-slate-500" },
  ai_moderator: { icon: MessageCircle, bgColor: "bg-cyan-500" },
};

interface TypingIndicatorProps {
  participant: ExpertType;
  participantName: string;
}

export function TypingIndicator({
  participant,
  participantName,
}: TypingIndicatorProps) {
  const badge = affiliationBadges[participant];
  const IconComponent = badge.icon;
  const expert = expertPersonas[participant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 pt-1">
        <ExpertAvatar participantType={participant} name={participantName} size="md" />
      </div>

      <div className="flex flex-col">
        {/* Expert header - Name + affiliation icon badge (matching message-bubble) */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold">
            {participantName}
          </span>
          <span className={cn("h-4 w-4 rounded flex items-center justify-center", badge.bgColor)}>
            <IconComponent className="h-2.5 w-2.5 text-white" />
          </span>
          <span className="h-4 w-4 rounded flex items-center justify-center bg-gray-500">
            <Bot className="h-2.5 w-2.5 text-white" />
          </span>
        </div>
        {/* Expert role */}
        {expert && (
          <p className="text-xs text-muted-foreground mb-1.5">
            {expert.role}
          </p>
        )}

        <div className="rounded-2xl rounded-ss-sm px-4 py-3 shadow-sm bg-muted/50 dark:bg-muted/30">
          <div className="flex items-center gap-1.5">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="w-2 h-2 rounded-full bg-muted-foreground/40"
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.8,
                  repeat: Infinity,
                  delay: i * 0.15,
                  ease: "easeInOut",
                }}
              />
            ))}
            <span className="ms-2 text-xs text-muted-foreground">
              thinking...
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
