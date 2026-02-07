import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import {
  MessageCircle,
  MapPin,
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
  Users,
  type LucideIcon,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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

interface DiscussionPreviewCardProps {
  reportSlug: string;
  country: string;
  projectDescription: string;
  projectType?: string | null;
  location?: string | null;
  messageCount: number;
  index: number;
}

export function DiscussionPreviewCard({
  reportSlug,
  country,
  projectDescription,
  projectType,
  location,
  messageCount,
  index,
}: DiscussionPreviewCardProps) {
  const { t } = useTranslation();

  const projectCategory = detectProjectCategory(projectType);
  const CategoryIcon = categoryIconMap[projectCategory];

  const truncatedDescription =
    projectDescription.length > 100
      ? projectDescription.substring(0, 100) + "..."
      : projectDescription;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link to={`/${country}/report/${reportSlug}/discussion`}>
        <Card className="group relative overflow-hidden transition-all hover:shadow-lg hover:shadow-emerald-500/10 hover:border-emerald-500/30 hover:-translate-y-1">
          {/* Animated pulse indicator */}
          <div className="absolute top-4 right-4 z-10">
            <div className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 shadow-lg shadow-emerald-500/50"></span>
            </div>
          </div>

          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/0 to-emerald-500/0 group-hover:from-emerald-500/5 group-hover:via-transparent group-hover:to-emerald-500/5 transition-all duration-500" />

          <CardContent className="p-5 relative">
            <div className="flex items-start gap-4">
              {/* Icon with gradient background */}
              <div className="relative flex-shrink-0">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl blur-sm" />
                <div className="relative flex h-12 w-12 items-center justify-center rounded-xl border bg-gradient-to-br from-background to-muted shadow-sm">
                  <CategoryIcon className="h-6 w-6 text-muted-foreground group-hover:text-foreground transition-colors" />
                </div>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0 pr-6">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800 text-xs font-semibold shadow-sm">
                    <span className="flex items-center gap-1">
                      <Users className="h-3 w-3" />
                      {t("home.hotTopics.active")}
                    </span>
                  </Badge>
                </div>

                <p className="text-sm font-medium line-clamp-2 mb-3 group-hover:text-primary transition-colors leading-relaxed">
                  {truncatedDescription}
                </p>

                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  {location && (
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/50">
                    <MessageCircle className="h-3.5 w-3.5 flex-shrink-0" />
                    <span className="font-medium">
                      {t("home.hotTopics.messages", { count: messageCount })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
