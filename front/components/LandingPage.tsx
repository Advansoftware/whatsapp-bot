"use client";

import { useMemo } from "react";
import { Box } from "@mui/material";
import {
  Navbar,
  HeroSection,
  PainPointsSection,
  IntegrationsSection,
  HowItWorksSection,
  FeaturesSection,
  UseCasesSection,
  GastometriaSection,
  PricingSection,
  CTASection,
  Footer,
  createPainPoints,
  createFeatures,
  useCases,
  pricingPlans,
  howItWorksSteps,
} from "./landing";

interface LandingPageProps {
  onLoginClick: () => void;
}

const LandingPage = ({ onLoginClick }: LandingPageProps) => {
  // Memoize data that uses React.createElement
  const painPoints = useMemo(() => createPainPoints(), []);
  const features = useMemo(() => createFeatures(), []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <Box sx={{ bgcolor: "background.default", color: "text.primary", minHeight: "100vh" }}>
      <Navbar onLoginClick={onLoginClick} scrollToSection={scrollToSection} />

      <HeroSection onLoginClick={onLoginClick} scrollToSection={scrollToSection} />

      <PainPointsSection painPoints={painPoints} />

      <IntegrationsSection />

      <HowItWorksSection steps={howItWorksSteps} />

      <FeaturesSection features={features} />

      <UseCasesSection useCases={useCases} />

      <GastometriaSection onLoginClick={onLoginClick} />

      <PricingSection plans={pricingPlans} onLoginClick={onLoginClick} />

      <CTASection onLoginClick={onLoginClick} />

      <Footer />

      {/* CSS Animations */}
      <style jsx global>{`
        @keyframes pulse {
          0%,
          100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
        @keyframes bounce {
          0%,
          100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </Box>
  );
};

export default LandingPage;
