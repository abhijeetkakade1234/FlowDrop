import type { ReactNode } from "react";

type UiSize = "sm" | "md" | "lg";

function joinClasses(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

type UiCircleButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
  size?: UiSize;
  title?: string;
  type?: "button" | "submit";
  variant?: "soft" | "plain" | "primary";
};

export function UiCircleButton({
  ariaLabel,
  children,
  className,
  disabled,
  onClick,
  size = "md",
  title,
  type = "button",
  variant = "soft",
}: UiCircleButtonProps) {
  return (
    <button
      aria-label={ariaLabel}
      className={joinClasses(
        "ui-circle-button",
        `ui-circle-button--${size}`,
        `ui-circle-button--${variant}`,
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      title={title}
      type={type}
    >
      {children}
    </button>
  );
}

type UiPillButtonProps = {
  children: ReactNode;
  className?: string;
  disabled?: boolean;
  fullWidth?: boolean;
  onClick?: () => void;
  size?: UiSize;
  type?: "button" | "submit";
  variant?: "primary" | "ghost";
};

export function UiPillButton({
  children,
  className,
  disabled,
  fullWidth,
  onClick,
  size = "md",
  type = "button",
  variant = "ghost",
}: UiPillButtonProps) {
  return (
    <button
      className={joinClasses(
        "ui-pill-button",
        `ui-pill-button--${size}`,
        `ui-pill-button--${variant}`,
        fullWidth && "ui-pill-button--full",
        className,
      )}
      disabled={disabled}
      onClick={onClick}
      type={type}
    >
      {children}
    </button>
  );
}

type UiModalProps = {
  actions: ReactNode;
  children: ReactNode;
  onClose: () => void;
  title: string;
};

export function UiModal({ actions, children, onClose, title }: UiModalProps) {
  return (
    <div className="app-modal-backdrop" onClick={onClose} role="presentation">
      <div
        aria-modal="true"
        className="app-modal glass-window"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <h2>{title}</h2>
        <p>{children}</p>
        <div className="ui-modal__actions">{actions}</div>
      </div>
    </div>
  );
}
