import type { PropsWithChildren } from "react";

type AppShellProps = PropsWithChildren;

export function AppShell({ children }: AppShellProps) {
  return (
    <main className="app-shell">
      <div className="app-shell__shader" />
      <div className="app-shell__content">{children}</div>
    </main>
  );
}
