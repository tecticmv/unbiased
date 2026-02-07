import { User, BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ParticipantType, ExpertType } from "@/types";
import { expertPersonas } from "@/types";

interface ExpertAvatarProps {
  participantType: ParticipantType;
  /** Override the expert name for initials (useful for region-specific names) */
  name?: string;
  size?: "sm" | "md" | "lg";
  showVerified?: boolean;
  className?: string;
}

const sizeClasses = {
  sm: "h-7 w-7",
  md: "h-9 w-9",
  lg: "h-12 w-12",
};

const iconSizes = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const initialSizes = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
};

const verifiedSizes = {
  sm: "h-3 w-3 -bottom-0.5 -right-0.5",
  md: "h-4 w-4 -bottom-0.5 -right-0.5",
  lg: "h-5 w-5 -bottom-1 -right-1",
};

// High-contrast avatar background colors for each expert
const avatarBgColors: Record<ExpertType, string> = {
  ai_economist: "bg-gray-600",
  ai_engineer: "bg-orange-500",
  ai_legal: "bg-purple-600",
  ai_environmental: "bg-emerald-600",
  ai_social: "bg-pink-500",
  ai_operations: "bg-slate-600",
  ai_moderator: "bg-gray-600",
};

// Get initials from expert name (e.g., "Dr. Economist" -> "DE", "Chief Engineer" -> "CE")
function getInitials(name: string): string {
  const words = name.split(" ").filter((word) => word.length > 0);
  if (words.length >= 2) {
    const first = words[0]?.[0] ?? "";
    const second = words[1]?.[0] ?? "";
    return (first + second).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

export function ExpertAvatar({
  participantType,
  name,
  size = "md",
  showVerified = true,
  className,
}: ExpertAvatarProps) {
  if (participantType === "user") {
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-full",
          "bg-gradient-to-br from-primary/20 to-primary/5",
          sizeClasses[size],
          className
        )}
      >
        <User className={cn("text-primary", iconSizes[size])} />
      </div>
    );
  }

  const expert = expertPersonas[participantType];
  // Use provided name or fall back to default expert name
  const displayName = name || expert.name;
  const initials = getInitials(displayName);

  return (
    <div className={cn("relative", className)}>
      {/* Square avatar with rounded corners and initials */}
      <div
        className={cn(
          "flex items-center justify-center rounded-lg transition-transform hover:scale-105",
          avatarBgColors[participantType],
          sizeClasses[size]
        )}
      >
        <span className={cn("font-semibold text-white", initialSizes[size])}>
          {initials}
        </span>
      </div>

      {/* Verified badge - bottom right */}
      {showVerified && (
        <div className={cn("absolute", verifiedSizes[size])}>
          <BadgeCheck className="h-full w-full text-gray-500 fill-white" />
        </div>
      )}
    </div>
  );
}
