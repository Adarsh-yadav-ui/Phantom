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
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useState } from "react";
import { nanoid } from "nanoid";
import { ProfilePhotoUpload } from "@/components/profile-photo-upload";
import { z } from "zod";

// ─── Steps config ────────────────────────────────────────────────────────────
const STEPS = [
  {
    id: "name",
    label: "Name Your Cult",
    description: "Give your cult a powerful name (at least 3 letter).",
  },
  {
    id: "desc",
    label: "Describe Your Cult",
    description: "What's your cult about? (max 180 characters)",
  },
  {
    id: "photo",
    label: "Choose a Symbol",
    description: "Upload a profile photo for your cult.",
  },
];

export function CultCreationForm() {
  // Schemas inside component to avoid Turbopack module-level init issues
  const cultNameSchema = z
    .string()
    .min(3, "Title cannot be less than 3 letters");

  const cultDescSchema = z
    .string()
    .min(1, "Description cannot be empty.")
    .max(180, "Description must be 180 characters or fewer.");

  const getFirstError = (err: z.ZodError): string =>
    err?.issues?.[0]?.message ?? "Invalid value.";

  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [cultName, setCultName] = useState("");
  const [cultDesc, setCultDesc] = useState("");
  const [cultProfile, setCultProfile] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentUser = useQuery(api.users.current);
  const createCult = useMutation(api.cult.createCult);
  const joinAsAdmin = useMutation(api.cultMembers.joinAsAdmin);

  // Reset on dialog close
  const handleOpenChange = (val: boolean) => {
    setOpen(val);
    if (!val) {
      setStep(0);
      setCultName("");
      setCultDesc("");
      setCultProfile("");
      setError(null);
    }
  };

  // Validate current step and advance
  const handleNext = () => {
    setError(null);

    if (step === 0) {
      const result = cultNameSchema.safeParse(cultName);
      if (!result.success) {
        setError(getFirstError(result.error));
        return;
      }
    }

    if (step === 1) {
      const result = cultDescSchema.safeParse(cultDesc);
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

  const handleSubmit = async () => {
    if (!currentUser) return;

    // Final validation
    const nameResult = cultNameSchema.safeParse(cultName);
    if (!nameResult.success) {
      setStep(0);
      setError(getFirstError(nameResult.error));
      return;
    }
    const descResult = cultDescSchema.safeParse(cultDesc);
    if (!descResult.success) {
      setStep(1);
      setError(getFirstError(descResult.error));
      return;
    }

    setIsSubmitting(true);
    try {
      const joinCode = nanoid();
      await createCult({
        cultName,
        cultDesc,
        joinCode,
        cultProfile,
      });

      handleOpenChange(false);
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;
  const currentStep = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button>Create a cult</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-106.25 bg-[#fef3c8]">
        <DialogHeader className="flex items-center">
          <DialogTitle className="text-2xl mb-2">Create Your Cult</DialogTitle>
          <DialogDescription className="text-center">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        {/* Step indicator */}
        <div className="flex justify-center gap-2 my-2">
          {STEPS.map((s, i) => (
            <div
              key={s.id}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === step
                  ? "w-6 bg-amber-600"
                  : i < step
                    ? "w-2 bg-amber-400"
                    : "w-2 bg-amber-200"
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="grid gap-4 py-2">
          {step === 0 && (
            <div className="grid gap-3">
              <Label htmlFor="cult-name">Cult Name</Label>
              <Input
                id="cult-name"
                placeholder="e.g. Shadows Of The Void"
                value={cultName}
                onChange={(e) => {
                  setCultName(e.target.value);
                  setError(null);
                }}
                autoFocus
              />
            </div>
          )}

          {step === 1 && (
            <div className="grid gap-3">
              <Label htmlFor="cult-desc">
                Description
                <span className="ml-auto text-xs text-muted-foreground float-right">
                  {cultDesc.length}/180
                </span>
              </Label>
              <Input
                id="cult-desc"
                placeholder="What does your cult stand for?"
                value={cultDesc}
                onChange={(e) => {
                  setCultDesc(e.target.value);
                  setError(null);
                }}
                maxLength={180}
                autoFocus
              />
            </div>
          )}

          {step === 2 && (
            <ProfilePhotoUpload
              entityType="user"
              onUploadComplete={async (url: any) => {
                await console.log(url);
                await setCultProfile(url);
              }}
              onUploadError={(err: any) => console.error(err)}
            />
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-600 font-medium -mt-1">{error}</p>
          )}
        </div>

        <DialogFooter className="flex justify-between gap-2">
          <div className="flex gap-2">
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
                {isSubmitting ? "Creating..." : "Create Cult"}
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
