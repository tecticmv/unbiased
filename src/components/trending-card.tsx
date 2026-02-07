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
  TrendingUp,
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
  economic: TrendingUp,
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
    projectDescription.length > 80
      ? projectDescription.substring(0, 80) + "..."
      : projectDescription;

  const getScoreColor = (score: number): string => {
    if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-500 dark:text-red-400";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link to={`/${country}/report/${slug}`}>
        <Card className="transition-all hover:shadow-md hover:border-primary/50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              {/* Icon */}
              <div className="flex h-10 w-10 items-center justify-center rounded-lg border bg-muted/50 flex-shrink-0">
                <CategoryIcon className="h-5 w-5 text-muted-foreground" />
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold line-clamp-1">
                    {displayProjectType}
                  </p>
                  <Badge variant="outline" className="flex items-center gap-1 flex-shrink-0">
                    <Flame className="h-3 w-3 text-orange-500" />
                    <span className={`font-bold ${getScoreColor(score)}`}>
                      {score}
                    </span>
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {truncatedDescription}
                </p>

                {location && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3" />
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
