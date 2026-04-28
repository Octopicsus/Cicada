import { Slot } from "@radix-ui/react-slot";
import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@cicada/shared";

import styles from "./Button.module.css";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Visual treatment. Defaults to `primary`. */
  variant?: ButtonVariant;
  /** Control height + padding. Defaults to `md`. */
  size?: ButtonSize;
  /**
   * If true, the component renders as its child via Radix Slot — useful for
   * wrapping `next/link`'s `<Link>` or any other element while keeping the
   * Button styling.
   */
  asChild?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", asChild = false, className, type, ...rest },
  ref,
) {
  const Component = asChild ? Slot : "button";
  return (
    <Component
      ref={ref}
      className={cn(styles.root, className)}
      data-variant={variant}
      data-size={size}
      type={asChild ? undefined : (type ?? "button")}
      {...rest}
    />
  );
});
