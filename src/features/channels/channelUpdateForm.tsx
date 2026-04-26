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
import { useState, useEffect } from "react";
import { z } from "zod";
import { CircleAlert } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type ChannelVisibility = "public" | "private";

// ─── Steps ────────────────────────────────────────────────────────────────────
const STEPS = [
  { id: "name", description: "Update your channel name." },
  { id: "details", description: "Update the description and channel type." },
  { id: "access", description: "Update visibility and join code." },
];

// ─── Schemas ──────────────────────────────────────────────────────────────────
const channelNameSchema = z
  .string()
  .min(2, "Channel name must be at least 2 characters.")
  .max(64, "Channel name must be 64 characters or fewer.");

const channelDescSchema = z
  .string()
  .min(3, "Description must be at least 3 characters.")
  .max(180, "Description must be 180 characters or fewer.");

// ─── Helpers ──────────────────────────────────────────────────────────────────
const getFirstError = (err: z.ZodError): string =>
  err?.issues?.[0]?.message ?? "Invalid value.";

// ─── Props ────────────────────────────────────────────────────────────────────
type Props = {
  channelId: Id<"channel">;
  initialName: string;
  initialDesc: string;
  initialVisibility?: ChannelVisibility;
};

// ─── Component ────────────────────────────────────────────────────────────────
export function EditChannelForm({
  channelId,
  initialName,
  initialDesc,
  initialVisibility = "public",
}: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const [channelName, setChannelName] = useState(initialName);
  const [channelDesc, setChannelDesc] = useState(initialDesc);
  const [visibility, setVisibility] =
    useState<ChannelVisibility>(initialVisibility);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateChannel = useMutation(api.channel.updateChannel);

  // ── Reset on open ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (open) {
      setChannelName(initialName);
      setChannelDesc(initialDesc);
      setVisibility(initialVisibility);
      setStep(0);
      setError(null);
    }
  }, [open, initialName, initialDesc, initialVisibility]);

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
    setError(null);

    try {
      await updateChannel({
        channelId,
        channelName: channelName.trim(),
        channelDesc: channelDesc.trim(),
        visibility,
      });
      setOpen(false);
    } catch (err: any) {
      setError(err?.message ?? "Failed to update channel. Please try again.");
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-[#5294ff] hover:bg-[#4a86e6] transition-all duration-200">
          Edit Channel
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-md bg-[#5294ff]">
        <DialogHeader className="flex items-center">
          <DialogTitle className="text-2xl mb-2">Edit Channel</DialogTitle>
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
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm animate-in fade-in slide-in-from-top-1 duration-200">
              <CircleAlert className="w-4 h-4 shrink-0 text-red-500" />
              <p className="font-medium leading-snug mt-1">{error}</p>
            </div>
          )}
        </div>

        {/* Footer */}
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
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? "Updating…" : "Update Channel"}
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
