// Signup — demo mode until Supabase credentials are configured.
import type { Metadata } from "next";
import { AuthCard } from "@/components/auth/auth-card";

export const metadata: Metadata = {
  title: "Claim your handle — LinkFlow",
};

export default function SignupPage() {
  return (
    <AuthCard
      mode="signup"
      title="Claim your handle"
      subtitle="Free forever. Your stage is live in 60 seconds."
    />
  );
}
