"use client";

import Link from "next/link";
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type Ref,
  type ReactNode,
} from "react";
import { t } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "secondary";
export type ButtonSize = "sm" | "md" | "lg";

type SharedButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: ReactNode;
  children: ReactNode;
  className?: string;
};

type LinkButtonProps = SharedButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children" | "onClick"> & {
    href: string;
    onClick?: () => void;
    type?: never;
  };

type NativeButtonProps = SharedButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "onClick" | "disabled"> & {
    href?: undefined;
    onClick?: () => void;
    type?: "button" | "submit";
  };

export type ButtonProps = LinkButtonProps | NativeButtonProps;

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-white shadow-sm hover:bg-primary-light active:bg-[#24543f] disabled:hover:bg-primary",
  outline:
    "border border-primary/35 bg-white text-primary shadow-sm hover:border-primary hover:bg-primary/10 active:bg-primary/15",
  ghost: "bg-transparent text-neutral-700 hover:bg-neutral-100 active:bg-neutral-100/80",
  danger: "bg-danger text-white shadow-sm hover:bg-danger/90 active:bg-danger/80",
  secondary:
    "border border-primary-pale bg-primary-pale text-primary hover:bg-primary-pale/80 active:bg-primary-pale/70",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "min-h-[44px] rounded-md px-3 py-2 text-sm",
  md: "min-h-[44px] rounded-md px-4 py-2 text-base",
  lg: "min-h-[52px] rounded-lg px-6 py-3 text-lg",
};

function Spinner() {
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4 animate-spin"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
        fill="currentColor"
      />
    </svg>
  );
}

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      disabled = false,
      icon,
      children,
      className,
      ...props
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;
    const classes = cn(
      "inline-flex min-w-[44px] items-center justify-center gap-2 font-semibold transition-all duration-150 ease-in-out",
      "active:scale-[0.98]",
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2",
      "disabled:cursor-not-allowed disabled:opacity-60",
      loading && "cursor-not-allowed opacity-75",
      variantClasses[variant],
      sizeClasses[size],
      className,
    );
    const content = loading ? (
      <>
        <Spinner />
        <span>{t.common.loading}</span>
      </>
    ) : (
      <>
        {icon}
        {children}
      </>
    );

    if ("href" in props && props.href) {
      const { href, onClick, ...anchorProps } = props as LinkButtonProps;

      return (
        <Link
          aria-disabled={isDisabled}
          className={classes}
          href={isDisabled ? "#" : href}
          onClick={(event) => {
            if (isDisabled) {
              event.preventDefault();
              return;
            }
            onClick?.();
          }}
          ref={ref as Ref<HTMLAnchorElement>}
          tabIndex={isDisabled ? -1 : anchorProps.tabIndex}
          {...anchorProps}
        >
          {content}
        </Link>
      );
    }

    const { onClick, type = "button", ...buttonProps } = props as NativeButtonProps;

    return (
      <button
        className={classes}
        disabled={isDisabled}
        onClick={() => onClick?.()}
        ref={ref as Ref<HTMLButtonElement>}
        type={type}
        {...buttonProps}
      >
        {content}
      </button>
    );
  },
);

Button.displayName = "Button";
