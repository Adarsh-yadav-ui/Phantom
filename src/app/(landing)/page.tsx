"use client";

import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/heroSection";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  return (
    <div>
      <Navbar />
      <HeroSection />
      <Footer />
    </div>
  );
}
