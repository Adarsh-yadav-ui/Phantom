"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useState } from "react";
import { z } from "zod";
import { CircleAlert } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChannelType = "text" | "voice" | "announcement";
type ChannelVisibility = "public" | "private";

// ─── Steps config ─────────────────────────────────────────────────────────────
const STEPS = [
  { id: "name", description: "Give your channel a clear, memorable name." },
  {
    id: "details",
    description: "Describe what this channel is for and set its type.",
  },
  { id: "access", description: "Control who can find and join this channel." },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateJoinCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

const getFirstError = (err: z.ZodError): string =>
  err?.issues?.[0]?.message ?? "Invalid value.";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const channelNameSchema = z
  .string()
  .min(2, "Channel name must be at least 2 characters.")
  .max(64, "Channel name must be 64 characters or fewer.");

const channelDescSchema = z
  .string()
  .min(3, "Description must be at least 3 characters.")
  .max(180, "Description must be 180 characters or fewer.");

// ─── Component ────────────────────────────────────────────────────────────────
export function ChannelCreationForm({ cultId }: { cultId: Id<"cult"> }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [channelName, setChannelName] = useState("");
  const [channelDesc, setChannelDesc] = useState("");
  const [joinCode, setJoinCode] = useState(() => generateJoinCode());
  const [type, setType] = useState<ChannelType>("text");
  const [visibility, setVisibility] = useState<ChannelVisibility>("public");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createChannel = useMutation(api.channel.createChannel);

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep(0);
    setChannelName("");
    setChannelDesc("");
    setJoinCode(generateJoinCode());
    setType("text");
    setVisibility("public");
    setError(null);
  };

  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) reset();
  };

  // ── Navigation ─────────────────────────────────────────────────────────────
  const handleNext = () => {
    setError(null);

    if (step === 0) {
      const result = channelNameSchema.safeParse(channelName);
      if (!result.success) {
        setError(getFirstError(result.error));
        return;
      }
    }

    if (step === 1) {
      const result = channelDescSchema.safeParse(channelDesc);
      if (!result.success) {
        setError(getFirstError(result.error));
        return;
      }
    }

    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!cultId) return;

    const nameResult = channelNameSchema.safeParse(channelName);
    if (!nameResult.success) {
      setStep(0);
      setError(getFirstError(nameResult.error));
      return;
    }

    const descResult = channelDescSchema.safeParse(channelDesc);
    if (!descResult.success) {
      setStep(1);
      setError(getFirstError(descResult.error));
      return;
    }

    setIsSubmitting(true);
    try {
      await createChannel({
        cultId,
        channelName: channelName.trim(),
        channelDesc: channelDesc.trim(),
        joinCode,
        type,
        visibility,
      });
      handleOpenChange(false);
    } catch (err: any) {
      setError(err?.message ?? "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-md border text-sm font-medium capitalize transition-colors cursor-pointer ${
      active
        ? "bg-primary text-primary-foreground border-primary"
        : "bg-background border-input hover:bg-muted"
    }`;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="bg-[#5294ff] hover:bg-[#4a86e6] transition-all duration-200">
          Create a channel
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-[#5294ff]">
        <DialogHeader className="flex items-center">
          <DialogTitle className="text-2xl mb-2">Create a Channel</DialogTitle>
          <DialogDescription className="text-center">
            {STEPS[step].description}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex justify-center gap-2 my-2">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-primary"
                  : i < step
                    ? "w-2 bg-primary/50"
                    : "w-2 bg-muted"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="grid gap-4 py-2">
          {/* Step 0 — Name */}
          {step === 0 && (
            <div className="grid gap-3">
              <Label htmlFor="channelName">Channel name</Label>
              <Input
                id="channelName"
                placeholder="e.g. general-chat"
                value={channelName}
                onChange={(e) => {
                  setChannelName(e.target.value);
                  setError(null);
                }}
                autoFocus
              />
            </div>
          )}

          {/* Step 1 — Description + Type */}
          {step === 1 && (
            <div className="grid gap-4">
              <div className="grid gap-3">
                <Label htmlFor="channelDesc">
                  Description
                  <span className="ml-auto text-xs text-muted-foreground float-right">
                    {channelDesc.length}/180
                  </span>
                </Label>
                <Input
                  id="channelDesc"
                  placeholder="What's this channel about?"
                  value={channelDesc}
                  onChange={(e) => {
                    setChannelDesc(e.target.value);
                    setError(null);
                  }}
                  maxLength={180}
                  autoFocus
                />
              </div>
              <div className="grid gap-2">
                <Label>Channel type</Label>
                <div className="flex gap-2 flex-wrap">
                  {(["text", "voice", "announcement"] as ChannelType[]).map(
                    (t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setType(t)}
                        className={pillClass(type === t)}
                      >
                        {t}
                      </button>
                    ),
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2 — Visibility + Join code */}
          {step === 2 && (
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Visibility</Label>
                <div className="flex gap-2">
                  {(["public", "private"] as ChannelVisibility[]).map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setVisibility(v)}
                      className={pillClass(visibility === v)}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="joinCode">Join code</Label>
                <div className="flex gap-2">
                  <Input
                    id="joinCode"
                    value={joinCode}
                    onChange={(e) =>
                      setJoinCode(e.target.value.toUpperCase().slice(0, 8))
                    }
                    className="font-mono tracking-widest"
                    readOnly
                  />
                  <Button
                    type="button"
                    variant="neutral"
                    onClick={() => setJoinCode(generateJoinCode())}
                  >
                    Regenerate
                  </Button>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <CircleAlert className="w-4 h-4 shrink-0 text-red-500" />
              <p className="font-medium leading-snug mt-1">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <div>
            {step === 0 ? (
              <DialogClose asChild>
                <Button variant="neutral">Cancel</Button>
              </DialogClose>
            ) : (
              <Button variant="neutral" onClick={handleBack}>
                Back
              </Button>
            )}
          </div>
          <div>
            {isLastStep ? (
              <Button onClick={handleSubmit} disabled={isSubmitting || !cultId}>
                {isSubmitting ? "Creating…" : "Create Channel"}
              </Button>
            ) : (
              <Button onClick={handleNext}>Next</Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
