"use client";

import {
  Users, Sparkles, Star, Shield, Briefcase, Flame, ShieldCheck, Mail, Camera, Crown,
  Clock, Globe, Gem, Heart, TrendingUp, ThumbsUp, BookOpen, MapPin, Coffee, Music,
  Sun, Gamepad2, Utensils, Dumbbell, Film, Plane, Moon, Gift, Calendar, ShoppingBag,
  Mic, Bike, Palette, Beer, Map, PartyPopper,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { AchievementIconName } from "@/lib/achievements";

const ICONS: Record<AchievementIconName, LucideIcon> = {
  Users, Sparkles, Star, Shield, Briefcase, Flame, ShieldCheck, Mail, Camera, Crown,
  Clock, Globe, Gem, Heart, TrendingUp, ThumbsUp, BookOpen, MapPin, Coffee, Music,
  Sun, Gamepad2, Utensils, Dumbbell, Film, Plane, Moon, Gift, Calendar, ShoppingBag,
  Mic, Bike, Palette, Beer, Map, PartyPopper,
};

type Props = {
  name: AchievementIconName;
  className?: string;
  strokeWidth?: number;
};

export function AchievementIcon({ name, className = "w-5 h-5", strokeWidth = 2 }: Props) {
  const Icon = ICONS[name] || Star;
  return <Icon className={className} strokeWidth={strokeWidth} />;
}
