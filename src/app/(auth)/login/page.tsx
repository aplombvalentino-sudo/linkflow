// Login — demo mode until Supabase credentials are configured.
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Log in — LinkFlow",
};

export default function LoginPage() {
  return (
    <AuthCard
      mode="login"
      title="Back on stage"
      subtitle="Log in to manage your profiles and analytics."
    />
  );
}
