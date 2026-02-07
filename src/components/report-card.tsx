import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  MapPin,
  Languages,
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
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { FeasibilityReport } from "@/types";
import { detectProjectCategory, type ProjectCategory } from "@/types";

// Map project categories to their icons
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

interface ReportCardProps {
  slug: string;
  country: string;
  projectDescription: string;
  location?: string | null;
  projectType?: string | null;
  estimatedCost?: number | null;
  report: FeasibilityReport;
  createdAt: string;
  index: number;
  hasTranslation?: boolean;
  needsTranslation?: boolean;
  translatedProjectType?: string;
  translatedSummary?: string;
}

function formatCost(amount: number, currency: string): string {
  if (amount >= 1_000_000_000) {
    return `${currency} ${(amount / 1_000_000_000).toFixed(1)}B`;
  }
  if (amount >= 1_000_000) {
    return `${currency} ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `${currency} ${(amount / 1_000).toFixed(1)}K`;
  }
  return `${currency} ${amount.toLocaleString()}`;
}

export function ReportCard({
  slug,
  country,
  projectDescription,
  location,
  projectType,
  report,
  createdAt,
  index,
  hasTranslation,
  needsTranslation,
  translatedProjectType,
  translatedSummary,
}: ReportCardProps) {
  const { t, i18n } = useTranslation();
  const score = report.overallScore;

  // Use translated content if available, otherwise fall back to original
  const displayProjectType = translatedProjectType || projectType || report.detectedProjectType;
  const displayDescription = translatedSummary || projectDescription;

  // Get the appropriate icon for this project type
  const projectCategory = detectProjectCategory(projectType || report.detectedProjectType);
  const CategoryIcon = categoryIconMap[projectCategory];
  const truncatedDescription =
    displayDescription.length > 120
      ? displayDescription.substring(0, 120) + "..."
      : displayDescription;

  const getScoreLabel = (score: number): string => {
    if (score >= 80) return t('score.highlyFeasible');
    if (score >= 60) return t('score.moderatelyFeasible');
    if (score >= 40) return t('score.challenging');
    if (score >= 20) return t('score.difficult');
    return t('score.notRecommended');
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString(i18n.language, {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <motion.div
      className="h-full"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.03 }}
    >
      <Link to={`/${country}/report/${slug}`}>
        <Card className="h-full transition-colors hover:bg-muted/50">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3 sm:gap-4">
              <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                <div className="flex h-8 w-8 sm:h-9 sm:w-9 items-center justify-center rounded-md border bg-transparent flex-shrink-0">
                  <CategoryIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm sm:text-base font-medium line-clamp-1">
                    {displayProjectType}
                  </p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap overflow-hidden text-ellipsis">
                    {formatDate(createdAt)}
                  </p>
                </div>
              </div>
              <div className="text-right flex-shrink-0">
                <p className="text-xl sm:text-2xl font-semibold">{score}</p>
                <p className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap">
                  {getScoreLabel(score)}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-2 sm:space-y-3">
            <p className="text-xs sm:text-sm text-muted-foreground line-clamp-2">
              {truncatedDescription}
            </p>

            <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs">
              {(location || report.location?.specified) && (
                <span className="inline-flex items-center gap-1 text-muted-foreground">
                  <MapPin className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                  {location || report.location?.specified}
                </span>
              )}
              {report.estimatedCost && (
                <span className="text-muted-foreground">
                  {formatCost(report.estimatedCost.low, report.estimatedCost.currency)} - {formatCost(report.estimatedCost.high, report.estimatedCost.currency)}
                </span>
              )}
            </div>

            {needsTranslation && !hasTranslation && (
              <div className="pt-2 border-t">
                <Badge variant="outline" className="text-[10px] sm:text-xs font-normal gap-1">
                  <Languages className="h-2.5 w-2.5" />
                  {t('common.english') || 'EN'}
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
