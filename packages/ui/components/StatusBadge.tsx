"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "bg-primary/10 text-primary",
        secondary: "bg-secondary text-secondary-foreground",
        destructive: "bg-destructive/10 text-destructive",
        success: "bg-green-100 text-green-800",
        warning: "bg-yellow-100 text-yellow-800",
        info: "bg-blue-100 text-blue-800",
      },
      status: {
        ACTIVE: "bg-green-100 text-green-800",
        INACTIVE: "bg-gray-100 text-gray-800",
        TRANSFERRED_OUT: "bg-blue-100 text-blue-800",
        EXPIRED: "bg-red-100 text-red-800",
        LOST_TO_FOLLOW_UP: "bg-yellow-100 text-yellow-800",
        OPEN: "bg-blue-100 text-blue-800",
        DONE: "bg-green-100 text-green-800",
        DISMISSED: "bg-gray-100 text-gray-800",
        POSITIVE: "bg-red-100 text-red-800",
        NEGATIVE: "bg-green-100 text-green-800",
        INDETERMINATE: "bg-yellow-100 text-yellow-800",
        PENDING: "bg-blue-100 text-blue-800",
        NOT_DONE: "bg-gray-100 text-gray-800",
        UNDETECTABLE: "bg-green-100 text-green-800",
        SUPPRESSED: "bg-green-100 text-green-800",
        DETECTABLE: "bg-yellow-100 text-yellow-800",
        HIGH_NOT_SUPPRESSED: "bg-red-100 text-red-800",
      }
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

type StatusValue = "ACTIVE" | "INACTIVE" | "TRANSFERRED_OUT" | "EXPIRED" | "LOST_TO_FOLLOW_UP" | "OPEN" | "DONE" | "DISMISSED" | "POSITIVE" | "NEGATIVE" | "INDETERMINATE" | "PENDING" | "NOT_DONE" | "UNDETECTABLE" | "SUPPRESSED" | "DETECTABLE" | "HIGH_NOT_SUPPRESSED";

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    Omit<VariantProps<typeof statusBadgeVariants>, 'status'> {
  status?: StatusValue;
  children?: React.ReactNode;
}

function StatusBadge({ className, variant, status, children, ...props }: StatusBadgeProps) {
  const displayText = children || (status ? status.replace(/_/g, " ") : "");
  
  return (
    <div
      className={cn(
        statusBadgeVariants({ 
          variant: status ? undefined : variant,
          status: status,
        }), 
        className
      )}
      {...props}
    >
      {displayText}
    </div>
  );
}

export { StatusBadge, statusBadgeVariants };
