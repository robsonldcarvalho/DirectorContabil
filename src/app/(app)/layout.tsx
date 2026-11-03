import type { ReactNode } from "react";
import AuthGate from "@/components/AuthGate";
import Shell from "@/components/Shell";

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGate>
      <Shell>{children}</Shell>
    </AuthGate>
  );
}
