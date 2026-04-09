"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Footer } from "@/components/Footer";
import { HeroSection } from "@/components/heroSection";
import { Navbar } from "@/components/Navbar";

export default function Home() {
  const { isSignedIn, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-main"></div>
      </div>
    );
  }

  if (isSignedIn) {
    return null;
  }

  return (
    <div>
      <Navbar />
      <HeroSection />
      <Footer />
    </div>
  );
}
