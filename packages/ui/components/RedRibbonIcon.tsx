"use client";

import * as React from "react";
import { cn } from "../lib/utils";

export interface RedRibbonIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number;
}

const RedRibbonIcon = React.forwardRef<SVGSVGElement, RedRibbonIconProps>(
  ({ className, size = 24, ...props }, ref) => {
    return (
      <svg
        ref={ref}
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={cn("text-red-600", className)}
        {...props}
      >
        <path
          d="M12 2L8 6L4 2V16C4 17.1 4.9 18 6 18H9L12 21L15 18H18C19.1 18 20 17.1 20 16V2L16 6L12 2Z"
          fill="currentColor"
          stroke="currentColor"
          strokeWidth="1"
          strokeLinejoin="round"
        />
        <path
          d="M12 8C13.1 8 14 8.9 14 10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10C10 8.9 10.9 8 12 8Z"
          fill="white"
        />
      </svg>
    );
  }
);
RedRibbonIcon.displayName = "RedRibbonIcon";

export { RedRibbonIcon };