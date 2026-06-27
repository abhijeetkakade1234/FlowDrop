import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  PropsWithChildren,
} from "react";
import { cn } from "./liquid.utils";

type LiquidPanelProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;
type LiquidPillProps = PropsWithChildren<HTMLAttributes<HTMLDivElement>>;
type LiquidButtonProps = PropsWithChildren<
  ButtonHTMLAttributes<HTMLButtonElement>
>;

export function LiquidPanel({
  children,
  className,
  ...props
}: LiquidPanelProps) {
  return (
    <div className={cn("liquid-panel", className)} {...props}>
      {children}
    </div>
  );
}

export function LiquidPill({ children, className, ...props }: LiquidPillProps) {
  return (
    <div className={cn("liquid-pill", className)} {...props}>
      {children}
    </div>
  );
}

export function LiquidButton({
  children,
  className,
  type = "button",
  ...props
}: LiquidButtonProps) {
  return (
    <button
      className={cn("liquid-icon-button", className)}
      type={type}
      {...props}
    >
      {children}
    </button>
  );
}
