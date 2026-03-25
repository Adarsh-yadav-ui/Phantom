"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AnimatedGroup } from "@/components/ui/animated-group";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Mic2,
  Globe2,
  Zap,
  ShieldCheck,
  Layers,
  AudioWaveform,
  Languages,
  Cpu,
  Users,
  ArrowRight,
} from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import { SignInButton, SignUpButton } from "@clerk/nextjs";

const transitionVariants = {
  item: {
    hidden: { opacity: 0, filter: "blur(12px)", y: 12 },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: { type: "spring", bounce: 0.3, duration: 1.5 },
    },
  },
};

const features = [
  {
    icon: Mic2,
    title: "Voice Cloning",
    description:
      "Clone any voice in seconds with just a few seconds of audio. Achieve studio-quality results with our proprietary deep learning models.",
    badge: "Popular",
  },
  {
    icon: Globe2,
    title: "29 Languages",
    description:
      "Generate lifelike speech in 29 languages with native-level fluency, accents, and natural prosody — no post-processing needed.",
    badge: null,
  },
  {
    icon: Zap,
    title: "Ultra-Low Latency",
    description:
      "Stream audio in real time with under 300ms latency. Perfect for live agents, interactive apps, and conversational AI.",
    badge: "New",
  },
  {
    icon: Layers,
    title: "Voice Library",
    description:
      "Browse thousands of curated AI voices across ages, accents, and personas — or design your own from scratch.",
    badge: null,
  },
  {
    icon: ShieldCheck,
    title: "Responsible AI",
    description:
      "Built-in content moderation, voice consent protocols, and watermarking to ensure ethical and safe voice generation.",
    badge: null,
  },
  {
    icon: Cpu,
    title: "Powerful API",
    description:
      "A developer-first REST API with SDKs for Python, Node, and more. Go from prototype to production in minutes.",
    badge: null,
  },
];

const useCases = [
  {
    icon: AudioWaveform,
    title: "Audiobooks & Narration",
    description:
      "Turn manuscripts into full-length audiobooks with a single voice, consistent across every chapter.",
  },
  {
    icon: Languages,
    title: "Content Localization",
    description:
      "Dub videos and podcasts into dozens of languages while preserving the original speaker's tone.",
  },
  {
    icon: Users,
    title: "AI Agents & Assistants",
    description:
      "Give your AI product a voice it can own — expressive, responsive, and always on-brand.",
  },
];

const stats = [
  { value: "1M+", label: "Creators & developers" },
  { value: "29", label: "Languages supported" },
  { value: "300ms", label: "Streaming latency" },
  { value: "99.9%", label: "Uptime SLA" },
];

export function HeroSection() {
  return (
    <main className="overflow-hidden">
      {/* ── Hero ── */}
      <section>
        <div className="relative pt-24">
          <div className="absolute inset-0 -z-10 size-full [background:radial-gradient(125%_125%_at_50%_100%,transparent_0%,var(--background)_75%)]" />
          <div className="mx-auto max-w-5xl px-6">
            <div className="sm:mx-auto lg:mr-auto">
              <AnimatedGroup
                //@ts-ignore
                variants={{
                  container: {
                    visible: {
                      transition: {
                        staggerChildren: 0.05,
                        delayChildren: 0.75,
                      },
                    },
                  },
                  ...transitionVariants,
                }}
              >
                <h1 className="mt-8 max-w-2xl text-balance text-5xl font-medium md:text-6xl lg:mt-16">
                  The most realistic AI voice platform
                </h1>
                <p className="mt-8 max-w-2xl text-pretty text-lg">
                  Resonance brings your words to life with hyper-realistic AI
                  voices. Create, clone, and deploy lifelike speech for any app,
                  content, or experience.
                </p>
                <div className="mt-12 flex items-center gap-2">
                  <Unauthenticated>
                    <div className="bg-foreground/10 rounded-[14px] border p-0.5">
                      <SignInButton>
                        <Button size="lg" className="rounded-xl px-5 text-base">
                          <span className="text-nowrap">Start for Free</span>
                        </Button>
                      </SignInButton>
                    </div>
                    <SignUpButton>
                      <Button
                        size="lg"
                        variant="ghost"
                        className="h-10.5 rounded-xl px-5 text-base"
                      >
                        <span className="text-nowrap">Hear a demo</span>
                      </Button>
                    </SignUpButton>
                  </Unauthenticated>
                  <Authenticated>
                    <Link href="/dashboard">
                      <Button>
                        Navigate to Dashboard
                        <div className="hover:ml-2 hover:scale-110 transition-all duration-300">
                          <ArrowRight />
                        </div>
                      </Button>
                    </Link>
                  </Authenticated>
                </div>
              </AnimatedGroup>
            </div>
          </div>

          <AnimatedGroup
            //@ts-ignore
            variants={{
              container: {
                visible: {
                  transition: { staggerChildren: 0.05, delayChildren: 0.75 },
                },
              },
              ...transitionVariants,
            }}
          >
            <div className="relative -mr-56 mt-8 overflow-hidden px-2 sm:mr-0 sm:mt-12 md:mt-20">
              <div className="inset-shadow-2xs ring-background dark:inset-shadow-white/20 bg-background relative mx-auto max-w-5xl overflow-hidden rounded-2xl p-4 shadow-zinc-950/15 ring-1 border-2 border-border shadow-shadow">
                <img
                  className="bg-background aspect-15/8 relative hidden rounded-2xl dark:block"
                  src="https://tailark.com/_next/image?url=%2Fmail2.png&w=3840&q=75"
                  alt="app screen"
                  width="2700"
                  height="1440"
                />
                <img
                  className="z-2 border-border/25 aspect-15/8 relative rounded-2xl border dark:hidden"
                  src="https://tailark.com/_next/image?url=%2Fmail2-light.png&w=3840&q=75"
                  alt="app screen"
                  width="2700"
                  height="1440"
                />
              </div>
            </div>
          </AnimatedGroup>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="mx-auto max-w-5xl px-6 py-20">
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <p className="text-4xl font-semibold tracking-tight">{s.value}</p>
              <p className="text-muted-foreground mt-1 text-sm">{s.label}</p>
            </div>
          ))}
        </div>
      </section>

      <Separator className="mx-auto max-w-5xl px-6" />

      {/* ── Features ── */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-12">
          <Badge className="mb-4">Features</Badge>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Everything you need to build with voice
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl text-base">
            From instant voice cloning to real-time streaming, Resonance gives
            you the full stack to ship voice-powered products fast.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <Card
              key={f.title}
              className="group relative overflow-hidden transition-shadow hover:shadow-md"
            >
              <CardHeader className="pb-3">
                <div className="mb-3 flex items-center justify-between">
                  <div className="bg-muted flex size-10 items-center justify-center rounded-lg">
                    <f.icon className="text-foreground size-5" />
                  </div>
                  {f.badge && <Badge className="text-xs">{f.badge}</Badge>}
                </div>
                <CardTitle className="text-base">{f.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <CardDescription className="text-sm leading-relaxed">
                  {f.description}
                </CardDescription>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="mx-auto max-w-5xl px-6" />

      {/* ── Use Cases ── */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <div className="mb-12">
          <Badge className="mb-4">Use Cases</Badge>
          <h2 className="text-3xl font-medium tracking-tight sm:text-4xl">
            Built for every kind of creator
          </h2>
          <p className="text-muted-foreground mt-4 max-w-xl text-base">
            Whether you're an indie developer, a media company, or an enterprise
            — Resonance scales with your ambitions.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-3">
          {useCases.map((u) => (
            <Card
              key={u.title}
              className="border-border/60 bg-muted/30 flex flex-col gap-4 p-6"
            >
              <div className="bg-background flex size-10 items-center justify-center rounded-lg border shadow-sm">
                <u.icon className="size-5" />
              </div>
              <div>
                <h3 className="font-medium">{u.title}</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                  {u.description}
                </p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <Card className="from-foreground to-foreground/90 text-background overflow-hidden bg-linear-to-br p-10">
          <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
            <div>
              <h2 className="text-2xl font-semibold">
                Ready to hear the difference?
              </h2>
              <p className="text-background/70 mt-2 max-w-md text-sm">
                Join over a million creators already using Resonance to power
                their next generation of voice experiences.
              </p>
            </div>
            <Unauthenticated>
              <SignUpButton>
                <Button
                  size="lg"
                  variant="neutral"
                  className="shrink-0 rounded-xl px-6"
                >
                  Get started free
                  <ArrowRight className="size-4" />
                </Button>
              </SignUpButton>
            </Unauthenticated>
            <Authenticated>
              <Link href="/dashboard">
                <Button variant="noShadow">
                  Navigate to Dashboard
                  <div className="hover:ml-2 hover:scale-110 transition-all duration-300">
                    <ArrowRight />
                  </div>
                </Button>
              </Link>
            </Authenticated>
          </div>
        </Card>
      </section>
    </main>
  );
}
