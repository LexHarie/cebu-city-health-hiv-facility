"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  icon?: React.ReactNode;
  className?: string;
}

const KPICard = React.forwardRef<HTMLDivElement, KPICardProps>(
  ({ title, value, subtitle, trend, icon, className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "rounded-lg border bg-card text-card-foreground shadow-sm p-6",
          className
        )}
        {...props}
      >
        <div className="flex items-center justify-between space-y-0 pb-2">
          <h3 className="tracking-tight text-sm font-medium text-muted-foreground">
            {title}
          </h3>
          {icon && (
            <div className="h-4 w-4 text-muted-foreground">{icon}</div>
          )}
        </div>
        <div className="space-y-1">
          <div className="text-2xl font-bold">{value}</div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center text-xs">
              <span
                className={cn(
                  "inline-flex items-center gap-1",
                  trend.isPositive ? "text-green-600" : "text-red-600"
                )}
              >
                {trend.isPositive ? "↗" : "↘"} {Math.abs(trend.value)}%
              </span>
              <span className="text-muted-foreground ml-1">from last month</span>
            </div>
          )}
        </div>
      </div>
    );
  }
);
KPICard.displayName = "KPICard";

export { KPICard };