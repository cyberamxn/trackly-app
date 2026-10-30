"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// ===== KPI Card =====
export function KpiCard({
  label,
  value,
  delta,
  trend,
  icon,
  onClick,
  loading,
}: {
  label: string;
  value: string | number;
  delta?: string;
  trend?: "up" | "down" | "neutral";
  icon?: ReactNode;
  onClick?: () => void;
  loading?: boolean;
}) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.985 } : undefined}
      onClick={onClick}
      className={`bg-card border border-border rounded-2xl p-5 ${onClick ? "cursor-pointer hover:border-foreground/30 transition-colors" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-[12px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
          {loading ? (
            <Loader2 className="h-7 w-7 animate-spin mt-3 text-muted-foreground" />
          ) : (
            <p className="text-[28px] font-bold tracking-tight mt-2 text-display tabular-nums">{value}</p>
          )}
          {delta && !loading && (
            <p className={`text-[12px] mt-1 font-medium ${
              trend === "up" ? "text-foreground" : trend === "down" ? "text-muted-foreground" : "text-muted-foreground"
            }`}>
              {trend === "up" && "↑ "}
              {trend === "down" && "↓ "}
              {delta}
            </p>
          )}
        </div>
        {icon && (
          <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
            {icon}
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ===== Section Header =====
export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-6">
      <div>
        <h1 className="text-[28px] sm:text-[32px] font-bold tracking-tight leading-tight">{title}</h1>
        {subtitle && <p className="text-[14px] text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
    </div>
  );
}

// ===== Badge =====
export function Badge({
  children,
  variant = "default",
}: {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "danger" | "outline";
}) {
  const variants = {
    default: "bg-foreground text-background",
    success: "bg-foreground/10 text-foreground border border-foreground/20",
    warning: "bg-muted text-foreground border border-border",
    danger: "bg-foreground text-background",
    outline: "border border-border text-foreground",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium ${variants[variant]}`}>
      {children}
    </span>
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
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="h-12 w-12 rounded-2xl bg-muted flex items-center justify-center mb-4">{icon}</div>}
      <p className="text-[16px] font-semibold">{title}</p>
      {description && <p className="text-[14px] text-muted-foreground mt-1 max-w-sm">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

// ===== Loading State =====
export function LoadingState({ label = "Loading..." }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      <p className="text-[14px] text-muted-foreground mt-3">{label}</p>
    </div>
  );
}

// ===== Button (Apple-style) =====
export function AdminButton({
  children,
  onClick,
  variant = "primary",
  size = "md",
  disabled,
  loading,
  type = "button",
  className = "",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "danger" | "outline";
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  loading?: boolean;
  type?: "button" | "submit";
  className?: string;
}) {
  const variants = {
    primary: "bg-foreground text-background hover:opacity-90",
    secondary: "bg-muted text-foreground hover:bg-muted/70",
    ghost: "text-foreground hover:bg-muted",
    danger: "bg-foreground text-background hover:opacity-90",
    outline: "border border-border text-foreground hover:bg-muted",
  };
  const sizes = {
    sm: "h-8 px-3 text-[13px]",
    md: "h-10 px-4 text-[14px]",
    lg: "h-12 px-6 text-[15px]",
  };
  return (
    <motion.button
      whileTap={{ scale: disabled ? 1 : 0.97 }}
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-opacity ${variants[variant]} ${sizes[size]} disabled:opacity-40 ${className}`}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
}

// ===== Card =====
export function AdminCard({
  children,
  className = "",
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <motion.div
      whileTap={onClick ? { scale: 0.99 } : undefined}
      onClick={onClick}
      className={`bg-card border border-border rounded-2xl ${onClick ? "cursor-pointer" : ""} ${className}`}
    >
      {children}
    </motion.div>
  );
}

// ===== Input =====
export function AdminInput({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required,
  error,
  disabled,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  required?: boolean;
  error?: string;
  disabled?: boolean;
}) {
  return (
    <div>
      {label && (
        <label className="block text-[13px] font-medium mb-1.5">
          {label} {required && <span className="text-muted-foreground">*</span>}
        </label>
      )}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors disabled:opacity-50"
      />
      {error && <p className="text-[12px] text-foreground mt-1">{error}</p>}
    </div>
  );
}

// ===== Textarea =====
export function AdminTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  required,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
  required?: boolean;
}) {
  return (
    <div>
      {label && (
        <label className="block text-[13px] font-medium mb-1.5">
          {label} {required && <span className="text-muted-foreground">*</span>}
        </label>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        required={required}
        className="w-full px-3 py-2 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors resize-none"
      />
    </div>
  );
}

// ===== Select =====
export function AdminSelect({
  label,
  value,
  onChange,
  options,
  required,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
}) {
  return (
    <div>
      {label && (
        <label className="block text-[13px] font-medium mb-1.5">
          {label} {required && <span className="text-muted-foreground">*</span>}
        </label>
      )}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="w-full h-10 px-3 rounded-xl bg-background border border-border text-[14px] outline-none focus:border-foreground transition-colors"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
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

// ===== Modal =====
export function AdminModal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  size?: "sm" | "md" | "lg" | "xl";
}) {
  if (!open) return null;
  const sizes = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
  };
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`relative bg-background border border-border rounded-2xl shadow-float w-full ${sizes[size]} max-h-[85vh] flex flex-col`}
      >
        <div className="flex items-center justify-between p-5 border-b border-border">
          <h2 className="text-[18px] font-bold tracking-tight">{title}</h2>
          <button onClick={onClose} className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-[14px]">
            ✕
          </button>
        </div>
        <div className="overflow-y-auto thin-scrollbar p-5">{children}</div>
      </motion.div>
    </div>
  );
}

// ===== Confirm Dialog =====
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel = "Confirm",
  loading,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmLabel?: string;
  loading?: boolean;
}) {
  return (
    <AdminModal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-[14px] text-muted-foreground leading-relaxed">{message}</p>
      <div className="flex justify-end gap-2 mt-6">
        <AdminButton variant="outline" onClick={onClose} disabled={loading}>Cancel</AdminButton>
        <AdminButton variant="primary" onClick={onConfirm} loading={loading}>{confirmLabel}</AdminButton>
      </div>
    </AdminModal>
  );
}

// ===== Status Pill =====
export function StatusPill({ status }: { status: string }) {
  const variantMap: Record<string, "success" | "warning" | "danger" | "outline"> = {
    ACTIVE: "success",
    SENT: "success",
    RESOLVED: "success",
    COMPLETED: "success",
    SUSPENDED: "warning",
    SCHEDULED: "warning",
    IN_PROGRESS: "warning",
    PENDING: "warning",
    TRIALING: "warning",
    BANNED: "danger",
    FAILED: "danger",
    REJECTED: "danger",
    PAST_DUE: "danger",
    CLOSED: "outline",
    EXPIRED: "outline",
    CANCELED: "outline",
    DRAFT: "outline",
    OPEN: "warning",
    DELETED: "danger",
  };
  return <Badge variant={variantMap[status] ?? "outline"}>{status.replace("_", " ")}</Badge>;
}
