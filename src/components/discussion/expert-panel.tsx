import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslation } from "react-i18next";
import { TrendingUp, Wrench, Scale, Leaf, Users, Settings, ChevronDown, Bot, MessageCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpertAvatar } from "./expert-avatar";
import { getExpertList, type ExpertType } from "@/types";

// Guest user type
interface ActiveGuest {
  id: string;
  name: string;
  isOnline: boolean;
}

// Generate consistent color from name
function getColorFromName(name: string): string {
  const colors = [
    "bg-gray-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] || "bg-gray-500";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

// Same affiliation badge colors as message bubbles
const affiliationBadges: Record<ExpertType, { icon: LucideIcon; bgColor: string }> = {
  ai_economist: { icon: TrendingUp, bgColor: "bg-amber-500" },
  ai_engineer: { icon: Wrench, bgColor: "bg-orange-500" },
  ai_legal: { icon: Scale, bgColor: "bg-purple-500" },
  ai_environmental: { icon: Leaf, bgColor: "bg-green-500" },
  ai_social: { icon: Users, bgColor: "bg-pink-500" },
  ai_operations: { icon: Settings, bgColor: "bg-slate-500" },
  ai_moderator: { icon: MessageCircle, bgColor: "bg-cyan-500" },
};

interface ExpertPanelProps {
  className?: string;
  activeGuests?: ActiveGuest[];
  countrySlug?: string;
}

export function ExpertPanel({ className, activeGuests = [], countrySlug }: ExpertPanelProps) {
  const { t } = useTranslation();
  const [isExpertsExpanded, setIsExpertsExpanded] = useState(true);
  const [isGuestsExpanded, setIsGuestsExpanded] = useState(true);
  const experts = getExpertList(countrySlug);

  return (
    <div className={cn("space-y-3", className)}>
      {/* Expert Panel Section */}
      <div className="space-y-2">
        <button
          onClick={() => setIsExpertsExpanded(!isExpertsExpanded)}
          className="flex items-center gap-2 w-full px-1 py-1 rounded-lg hover:bg-muted/50 transition-colors"
        >
          <span className="text-[11px] font-medium text-muted-foreground">
            {t('report.discussion.experts')}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {experts.length}
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 ms-auto text-muted-foreground/50 transition-transform duration-200",
              !isExpertsExpanded && "-rotate-90"
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {isExpertsExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5">
                {experts.map((expert, index) => {
                  const badge = affiliationBadges[expert.id];
                  const IconComponent = badge.icon;

                  return (
                    <motion.div
                      key={expert.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      className="flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-muted/40 transition-colors cursor-default"
                    >
                      <ExpertAvatar
                        participantType={expert.id}
                        name={expert.name}
                        size="sm"
                        showVerified={true}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1">
                          <span className="text-sm font-medium truncate">
                            {expert.name}
                          </span>
                          <span className={cn("h-3.5 w-3.5 rounded flex items-center justify-center shrink-0", badge.bgColor)}>
                            <IconComponent className="h-2 w-2 text-white" />
                          </span>
                          <span className="h-3.5 w-3.5 rounded flex items-center justify-center shrink-0 bg-gray-500">
                            <Bot className="h-2 w-2 text-white" />
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {expert.role}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Active Guests Section - Always render container to prevent unmount/remount flicker */}
      <div className="space-y-2 pt-1 border-t border-border/50">
        <button
          onClick={() => setIsGuestsExpanded(!isGuestsExpanded)}
          className="flex items-center gap-2 w-full px-1 py-1 rounded-lg hover:bg-muted/50 transition-colors mt-2"
        >
          <span className="text-[11px] font-medium text-muted-foreground">
            {t('report.discussion.guests')}
          </span>
          <span className="flex items-center gap-1">
            {activeGuests.length > 0 && (
              <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
            )}
            <span className={cn(
              "text-[10px]",
              activeGuests.length > 0 ? "text-green-600 dark:text-green-400" : "text-muted-foreground/60"
            )}>
              {activeGuests.length}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "h-3 w-3 ms-auto text-muted-foreground/50 transition-transform duration-200",
              !isGuestsExpanded && "-rotate-90"
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {isGuestsExpanded && activeGuests.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden"
            >
              <div className="space-y-0.5">
                {activeGuests.map((guest, index) => {
                  const avatarColor = getColorFromName(guest.name);
                  return (
                    <motion.div
                      key={guest.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.02 }}
                      layout
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-muted/40 transition-colors"
                    >
                      <div className="relative">
                        <div
                          className={cn(
                            "h-6 w-6 rounded-full flex items-center justify-center text-white text-[9px] font-medium",
                            avatarColor
                          )}
                        >
                          {getInitials(guest.name)}
                        </div>
                        {guest.isOnline && (
                          <div className="absolute -bottom-0.5 -end-0.5 h-2 w-2 rounded-full bg-green-500 border-[1.5px] border-background" />
                        )}
                      </div>
                      <span className="text-sm text-foreground/80 truncate">{guest.name}</span>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

interface ExpertChipsProps {
  className?: string;
  countrySlug?: string;
}

export function ExpertChips({ className, countrySlug }: ExpertChipsProps) {
  const experts = getExpertList(countrySlug);
  return (
    <div className={cn("flex flex-wrap gap-2", className)}>
      {experts.map((expert) => {
        const badge = affiliationBadges[expert.id];
        const IconComponent = badge.icon;

        return (
          <div
            key={expert.id}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-full text-xs font-medium",
              "border bg-transparent"
            )}
          >
            <span className={cn("h-4 w-4 rounded flex items-center justify-center", badge.bgColor)}>
              <IconComponent className="h-2.5 w-2.5 text-white" />
            </span>
            <div className="flex flex-col">
              <div className="flex items-center gap-0.5">
                <span className="font-bold leading-tight">{expert.name}</span>
                <span className="h-3 w-3 rounded flex items-center justify-center shrink-0 bg-gray-500">
                  <Bot className="h-1.5 w-1.5 text-white" />
                </span>
              </div>
              <span className="text-[10px] text-muted-foreground leading-tight">{expert.role}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
