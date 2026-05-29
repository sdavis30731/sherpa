import * as React from "react";
import { cn } from "@/lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "block w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-sherpa-500 focus:outline-none focus:ring-1 focus:ring-sherpa-500 disabled:bg-slate-50 disabled:text-slate-500",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
