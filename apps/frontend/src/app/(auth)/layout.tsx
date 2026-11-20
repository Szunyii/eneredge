import type { ReactNode } from "react";
import { AuthFrame } from "@/components/auth-layout";

/** Sign-in, sign-up and the password pages share one frame, so moving between them does not flicker. */
export default function AuthPagesLayout({ children }: { children: ReactNode }) {
  return <AuthFrame>{children}</AuthFrame>;
}
