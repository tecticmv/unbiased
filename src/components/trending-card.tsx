import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  Flame,
  Landmark,
  HardHat,
  Train,
  Home,
  Store,
  Heart,
  TrendingUp as TrendingUpIcon,
  Leaf,
  Stethoscope,
  GraduationCap,
  FileText,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FeasibilityReport } from "@/types";
import { detectProjectCategory, type ProjectCategory } from "@/types";

const categoryIconMap: Record<ProjectCategory, LucideIcon> = {
  government: Landmark,
  infrastructure: HardHat,
  transportation: Train,
  housing: Home,
  commercial: Store,
  social: Heart,
  economic: TrendingUpIcon,
  environmental: Leaf,
  healthcare: Stethoscope,
  education: GraduationCap,
  other: FileText,
};

interface TrendingCardProps {
  slug: string;
  country: string;
  projectDescription: string;
  location?: string | null;
  projectType?: string | null;
  report: FeasibilityReport | string;
  index: number;
}

export function TrendingCard({
  slug,
  country,
  projectDescription,
  location,
  projectType,
  report,
  index,
}: TrendingCardProps) {
  const { t } = useTranslation();

  // Parse report if it's a string
  const reportData: FeasibilityReport =
    typeof report === "string" ? JSON.parse(report) : report;

  const score = reportData.overallScore;
  const displayProjectType =
    projectType || reportData.detectedProjectType || t("common.project");

  const projectCategory = detectProjectCategory(
    projectType || reportData.detectedProjectType
  );
  const CategoryIcon = categoryIconMap[projectCategory];

  const truncatedDescription =
    projectDescription.length > 100
      ? projectDescription.substring(0, 100) + "..."
      : projectDescription;

  const getScoreColor = (score: number): string => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30";
    if (score >= 50) return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30";
    return "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30";
  };

  const getScoreBorderColor = (score: number): string => {
    if (score >= 70) return "border-emerald-200 dark:border-emerald-800";
    if (score >= 50) return "border-amber-200 dark:border-amber-800";
    return "border-red-200 dark:border-red-800";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link to={`/${country}/report/${slug}`}>
        <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-orange-500/10 hover:border-orange-500/30 hover:-translate-y-1">
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-orange-500/0 via-orange-500/0 to-orange-500/0 group-hover:from-orange-500/5 group-hover:via-transparent group-hover:to-orange-500/5 transition-all duration-500" />

          <CardContent className="p-5 relative">
            <div className="flex items-start gap-4">
              {/* Icon with gradient background */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-red-500/20 rounded-xl blur-sm" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border bg-gradient-to-br from-background to-muted shadow-sm">
                  <CategoryIcon className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Flame className="h-3.5 w-3.5 text-orange-500 flex-shrink-0" />
                      <p className="text-sm font-semibold line-clamp-1 group-hover:text-primary transition-colors">
                        {displayProjectType}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center justify-center px-3 py-1 rounded-lg border ${getScoreBorderColor(score)} ${getScoreColor(score)} flex-shrink-0 shadow-sm`}>
                    <span className="text-sm font-bold tabular-nums">
                      {score}
                    </span>
                  </div>
                </div>

                <p className="text-sm text-muted-foreground line-clamp-2 mb-3 leading-relaxed">
                  {truncatedDescription}
                </p>

                {location && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="truncate">{location}</span>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
