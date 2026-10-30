"use client";

import { ReactNode, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MoreHorizontal, X } from "lucide-react";

export function ScreenHeader({
  title,
  subtitle,
  onBack,
  onMore,
  right,
  large,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  onMore?: () => void;
  right?: ReactNode;
  large?: boolean;
}) {
  return (
    <div className="px-5 pt-2 pb-3">
      <div className="flex items-center justify-between min-h-[28px]">
        <div className="flex items-center gap-1 -ml-1.5">
          {onBack && (
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={onBack}
              className="flex items-center text-foreground -ml-1"
            >
              <ChevronLeft size={28} strokeWidth={2.2} />
            </motion.button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {right}
          {onMore && (
            <motion.button whileTap={{ scale: 0.9 }} onClick={onMore} className="p-1">
              <MoreHorizontal size={22} />
            </motion.button>
          )}
        </div>
      </div>
      <div className="mt-1">
        <h1 className={`${large ? "text-[34px]" : "text-[28px]"} font-bold tracking-tight leading-tight`}>
          {title}
        </h1>
        {subtitle && <p className="text-muted-foreground text-[15px] mt-1">{subtitle}</p>}
      </div>
    </div>
  );
}

export function ScreenWrapper({
  children,
  className = "",
  scrollable = true,
}: {
  children: ReactNode;
  className?: string;
  scrollable?: boolean;
}) {
  return (
    <div
      className={`absolute inset-0 ${scrollable ? "overflow-y-auto no-scrollbar ios-scroll" : "overflow-hidden"} ${className}`}
    >
      {children}
    </div>
  );
}

export function Card({
  children,
  className = "",
  onClick,
  dataTour,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
  dataTour?: string;
}) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onClick={onClick}
      data-tour={dataTour}
      className={`bg-card rounded-3xl p-4 ${onClick ? "cursor-pointer active:bg-muted/50" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  className = "",
}: {
  options: { label: string; value: T }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`inline-flex p-1 bg-muted rounded-xl ${className}`}>
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`relative px-3 py-1.5 text-[13px] font-semibold rounded-lg transition-colors ${
            value === o.value ? "text-background" : "text-muted-foreground"
          }`}
        >
          {value === o.value && (
            <motion.div
              layoutId={`seg-${options.map((o) => o.value).join("")}`}
              className="absolute inset-0 bg-foreground rounded-lg"
              transition={{ type: "spring", stiffness: 400, damping: 35 }}
            />
          )}
          <span className="relative z-10">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

export function Chip({
  label,
  active,
  onClick,
}: {
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-[13px] font-medium border transition-colors ${
        active
          ? "bg-foreground text-background border-foreground"
          : "bg-transparent text-foreground border-border"
      }`}
    >
      {label}
    </motion.button>
  );
}

export function ProgressBar({ value, className = "" }: { value: number; className?: string }) {
  return (
    <div className={`h-2 rounded-full bg-muted overflow-hidden ${className}`}>
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ type: "spring", stiffness: 120, damping: 20 }}
        className="h-full bg-foreground rounded-full"
      />
    </div>
  );
}

export function RingProgress({
  value,
  size = 64,
  stroke = 6,
  children,
}: {
  value: number; // 0-100
  size?: number;
  stroke?: number;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, value)) / 100) * c;
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="currentColor" strokeWidth={stroke} className="text-muted" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: offset }}
          transition={{ type: "spring", stiffness: 60, damping: 15 }}
          className="text-foreground"
        />
      </svg>
      {children && <div className="absolute inset-0 flex items-center justify-center">{children}</div>}
    </div>
  );
}

export function ListRow({
  icon,
  label,
  description,
  value,
  onClick,
  right,
  last,
  showChevron,
}: {
  icon?: ReactNode;
  label: string;
  description?: string;
  value?: ReactNode;
  onClick?: () => void;
  right?: ReactNode;
  last?: boolean;
  showChevron?: boolean;
}) {
  // If `right` is provided (e.g. a Toggle), the row is not clickable — the toggle handles it
  const clickable = onClick && !right;
  const content = (
    <>
      {icon && <div className="shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className="text-[15px] font-medium text-foreground truncate">{label}</div>
        {description && <div className="text-[12px] text-muted-foreground truncate mt-0.5">{description}</div>}
      </div>
      {value && <div className="text-[15px] text-muted-foreground tabular-nums">{value}</div>}
      {right}
      {showChevron && !right && <ChevronLeft size={16} className="text-muted-foreground rotate-180" />}
    </>
  );

  if (clickable) {
    return (
      <motion.button
        whileTap={{ scale: 0.99 }}
        onClick={onClick}
        className={`w-full flex items-center gap-3 py-3 px-4 ${last ? "" : "border-b border-border"} active:bg-muted/50 text-left`}
      >
        {content}
      </motion.button>
    );
  }

  return (
    <div className={`w-full flex items-center gap-3 py-3 px-4 ${last ? "" : "border-b border-border"}`}>
      {content}
    </div>
  );
}

// ===== Empty State =====
export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      {icon && <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-3">{icon}</div>}
      <p className="text-[15px] font-semibold">{title}</p>
      {description && <p className="text-[13px] text-muted-foreground mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// ===== Toggle Switch =====
export function Toggle({
  checked,
  onChange,
  label,
  description,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
  description?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      {(label || description) && (
        <div className="flex-1 min-w-0">
          {label && <p className="text-[14px] font-medium">{label}</p>}
          {description && <p className="text-[12px] text-muted-foreground mt-0.5">{description}</p>}
        </div>
      )}
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-7 w-12 rounded-full transition-colors shrink-0 ${checked ? "bg-foreground" : "bg-muted-foreground/30"}`}
      >
        <motion.div
          layout
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={`absolute top-0.5 h-6 w-6 rounded-full bg-background shadow-sm ${checked ? "left-[22px]" : "left-0.5"}`}
        />
      </button>
    </div>
  );
}

// ===== Bottom Sheet Modal =====
export function SheetModal({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
            className="fixed sheet-bottom left-0 right-0 z-[60] rounded-t-[32px] bg-background pb-24 max-h-[85vh] overflow-y-auto no-scrollbar ios-scroll"
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="h-1 w-10 rounded-full bg-muted-foreground/30" />
            </div>
            <div className="px-5 pt-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-[20px] font-bold">{title}</h2>
                <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <X size={16} />
                </button>
              </div>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

