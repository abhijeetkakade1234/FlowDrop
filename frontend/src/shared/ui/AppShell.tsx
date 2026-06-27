import type { PropsWithChildren } from "react";

type AppShellProps = PropsWithChildren<{
  onInstall?: () => void;
  showInstall?: boolean;
}>;

export function AppShell({ children, onInstall, showInstall }: AppShellProps) {
  return (
    <main className="app-shell">
      <div className="app-shell__shader" />
      <div className="app-shell__content">
        {showInstall && onInstall ? (
          <button
            className="app-install-chip"
            onClick={onInstall}
            type="button"
          >
            Install app
          </button>
        ) : null}
        {children}
      </div>
    </main>
  );
}
