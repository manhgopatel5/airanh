"use client";

import {
  Sparkles,
  Bike,
  Heart,
  Gem,
  Moon,
  Hand,
  Baby,
  Plane,
  Tv,
  Dumbbell,
  Coffee,
  Wine,
  Dices,
  Palette,
  UtensilsCrossed,
  Leaf,
  Headphones,
  Sparkle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { StrangerCategoryIcon } from "@/lib/strangerCategories";

const ICON_MAP: Record<StrangerCategoryIcon, LucideIcon> = {
  sparkles: Sparkles,
  bike: Bike,
  heart: Heart,
  gem: Gem,
  moon: Moon,
  hand: Hand,
  baby: Baby,
  plane: Plane,
  tv: Tv,
  dumbbell: Dumbbell,
  coffee: Coffee,
  wine: Wine,
  dices: Dices,
  palette: Palette,
  utensils: UtensilsCrossed,
  leaf: Leaf,
  headphones: Headphones,
  sparkle: Sparkle,
};

type Props = {
  icon: StrangerCategoryIcon;
  gradient: string;
  ring?: string;
  selected?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZE = {
  sm: { box: "w-10 h-10", icon: 18 },
  md: { box: "w-14 h-14", icon: 26 },
  lg: { box: "w-16 h-16", icon: 30 },
};

export default function CategoryIcon({
  icon,
  gradient,
  ring,
  selected = false,
  size = "md",
  className,
}: Props) {
  const Icon = ICON_MAP[icon];
  const dim = SIZE[size];

  return (
    <div
      className={cn(
        "rounded-2xl flex items-center justify-center shadow-lg transition-all",
        dim.box,
        selected
          ? "bg-white/20 ring-2 ring-white/50"
          : cn("bg-gradient-to-br text-white", gradient, ring && `ring-2 ${ring}`),
        className
      )}
    >
      <Icon
        size={dim.icon}
        strokeWidth={2}
        className={selected ? "text-white" : "text-white drop-shadow-sm"}
      />
    </div>
  );
}
