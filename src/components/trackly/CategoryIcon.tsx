"use client";

import {
  Utensils, Fuel, Home, CreditCard, ShoppingBag, ShoppingCart, Receipt, Plane, Film, HeartPulse,
  GraduationCap, MoreHorizontal, Dumbbell, Droplet, BookOpen, Brain, Code, Footprints,
  Moon, Sunrise, Sun, Sunset, type LucideIcon,
} from "lucide-react";

export const iconMap: Record<string, LucideIcon> = {
  utensils: Utensils,
  fuel: Fuel,
  home: Home,
  "credit-card": CreditCard,
  "shopping-bag": ShoppingBag,
  "shopping-cart": ShoppingCart,
  receipt: Receipt,
  plane: Plane,
  film: Film,
  "heart-pulse": HeartPulse,
  "graduation-cap": GraduationCap,
  "more-horizontal": MoreHorizontal,
  dumbbell: Dumbbell,
  droplet: Droplet,
  "book-open": BookOpen,
  brain: Brain,
  code: Code,
  footprints: Footprints,
  moon: Moon,
  sunrise: Sunrise,
  sun: Sun,
  sunset: Sunset,
};

export function CategoryIcon({
  name,
  className,
  size = 18,
}: {
  name: string;
  className?: string;
  size?: number;
}) {
  const Icon = iconMap[name] ?? MoreHorizontal;
  return <Icon className={className} size={size} strokeWidth={2} />;
}
