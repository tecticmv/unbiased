import { useTranslation } from "react-i18next";
import {
  Search,
  SlidersHorizontal,
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ProjectCategory } from "@/types";
import { projectCategoryLabels } from "@/types";

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

// Categories available for filtering (excluding "other")
const filterCategories: ProjectCategory[] = [
  "government",
  "infrastructure",
  "transportation",
  "housing",
  "commercial",
  "social",
  "economic",
  "environmental",
  "healthcare",
  "education",
];

interface ReportsFiltersProps {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  selectedCategory: ProjectCategory | null;
  onCategoryChange: (category: ProjectCategory | null) => void;
}

export function ReportsFilters({
  searchQuery,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
}: ReportsFiltersProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      {/* Search Input */}
      <div className="relative flex-1 max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="text"
          placeholder={t('common.search') || 'Search reports...'}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Category Dropdown */}
      <Select
        value={selectedCategory || "all"}
        onValueChange={(value) => onCategoryChange(value === "all" ? null : value as ProjectCategory)}
      >
        <SelectTrigger className="w-full sm:w-[200px]">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
            <SelectValue placeholder={t('common.allCategories') || 'All Categories'} />
          </div>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span>{t('common.allCategories') || 'All Categories'}</span>
            </div>
          </SelectItem>
          {filterCategories.map((category) => {
            const Icon = categoryIconMap[category];
            return (
              <SelectItem key={category} value={category}>
                <div className="flex items-center gap-2">
                  <Icon className="h-4 w-4" />
                  <span>{projectCategoryLabels[category]}</span>
                </div>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
