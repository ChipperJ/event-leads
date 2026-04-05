import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";

const baseClass =
  "inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg px-4 py-3 text-sm font-medium transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-50";

const variantClass = {
  primary:
    "bg-foreground text-background hover:opacity-90 focus-visible:outline-foreground",
  secondary:
    "border border-foreground/20 bg-background hover:bg-foreground/5 focus-visible:outline-foreground",
  ghost: "text-foreground hover:bg-foreground/5 focus-visible:outline-foreground",
} as const;

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: keyof typeof variantClass;
};

export function Button({
  className = "",
  variant = "primary",
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      className={`${baseClass} ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}

type ButtonLinkProps = ComponentProps<typeof Link> & {
  variant?: keyof typeof variantClass;
};

export function ButtonLink({
  className = "",
  variant = "primary",
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      className={`${baseClass} ${variantClass[variant]} ${className}`}
      {...props}
    />
  );
}
