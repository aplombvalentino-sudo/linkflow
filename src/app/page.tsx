// LinkFlow landing — a 5-chapter film scrubbed by scroll.
// Scenes: hero stage → why not Linktree → features in motion → creator proof
// → pricing → final CTA. Wireframe: specs/landing-wireframe.md.
import { LandingNav } from "@/components/landing/nav";
import { SceneHero } from "@/components/landing/scene-hero";
import { SceneWhyNot } from "@/components/landing/scene-why-not";
import { SceneFeatures } from "@/components/landing/scene-features";
import { SceneProof } from "@/components/landing/scene-proof";
import { ScenePricing } from "@/components/landing/scene-pricing";
import { SceneFinalCta } from "@/components/landing/scene-final-cta";

export default function LandingPage() {
  return (
    <main className="relative overflow-x-clip">
      <LandingNav />
      <SceneHero />
      <SceneWhyNot />
      <SceneFeatures />
      <SceneProof />
      <ScenePricing />
      <SceneFinalCta />
    </main>
  );
}
