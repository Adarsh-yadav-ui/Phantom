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
import { useState, useEffect } from "react";
import { ProfilePhotoUpload } from "@/components/profile-photo-upload";
import { z } from "zod";
import { Id } from "../../../convex/_generated/dataModel";

// ─── Steps ───────────────────────────────────────────────────────
const STEPS = [
  {
    id: "name",
    description: "Update your cult name (min 3 letter).",
  },
  {
    id: "desc",
    description: "Update description (max 180 chars).",
  },
  {
    id: "photo",
    description: "Update your cult symbol.",
  },
];

type Props = {
  cultId: string;
  initialName: string;
  initialDesc: string;
  initialProfile?: string;
};

export function EditCultForm({
  cultId,
  initialName,
  initialDesc,
  initialProfile,
}: Props) {
  // ─── Validation ────────────────────────────────────────────────
  const cultNameSchema = z
    .string()
    .refine((val) => val.trim().split(/\s+/).length >= 3, {
      message: "Cult name must contain at least 3 words",
    });

  const cultDescSchema = z
    .string()
    .min(1, "Description cannot be empty.")
    .max(180, "Max 180 characters.");

  const getFirstError = (err: z.ZodError) =>
    err.issues?.[0]?.message ?? "Invalid value";

  // ─── State ─────────────────────────────────────────────────────
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const [cultName, setCultName] = useState(initialName);
  const [cultDesc, setCultDesc] = useState(initialDesc);
  const [cultProfile, setCultProfile] = useState(initialProfile || "");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateCult = useMutation(api.cult.updateCult);

  // Reset when dialog opens
  useEffect(() => {
    if (open) {
      setCultName(initialName);
      setCultDesc(initialDesc);
      setCultProfile(initialProfile || "");
      setStep(0);
      setError(null);
    }
  }, [open, initialName, initialDesc, initialProfile]);

  // ─── Navigation ────────────────────────────────────────────────
  const handleNext = () => {
    setError(null);

    if (step === 0) {
      const result = cultNameSchema.safeParse(cultName);
      if (!result.success) return setError(getFirstError(result.error));
    }

    if (step === 1) {
      const result = cultDescSchema.safeParse(cultDesc);
      if (!result.success) return setError(getFirstError(result.error));
    }

    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => s - 1);
  };

  // ─── Submit ────────────────────────────────────────────────────
  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      await updateCult({
        cultId: cultId as Id<"cult">,
        cultName,
        cultDesc,
        cultProfile,
      });

      setOpen(false);
    } catch (err) {
      setError("Failed to update cult.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isLastStep = step === STEPS.length - 1;
  const currentStep = STEPS[step];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>Edit Cult</Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-105 bg-[#fef3c8]">
        <DialogHeader className="flex items-center">
          <DialogTitle className="text-2xl">Edit Cult</DialogTitle>
          <DialogDescription className="text-center">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex justify-center gap-2">
          {STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full ${
                i === step ? "w-6 bg-amber-600" : "w-2 bg-gray-300"
              }`}
            />
          ))}
        </div>

        {/* Steps */}
        <div className="grid gap-4 py-2">
          {step === 0 && (
            <>
              <Label>Cult Name</Label>
              <Input
                value={cultName}
                onChange={(e) => setCultName(e.target.value)}
              />
            </>
          )}

          {step === 1 && (
            <>
              <Label>Description ({cultDesc.length}/180)</Label>
              <Input
                value={cultDesc}
                maxLength={180}
                onChange={(e) => setCultDesc(e.target.value)}
              />
            </>
          )}

          {step === 2 && (
            <ProfilePhotoUpload
              entityType="cult"
              onUploadComplete={(url: string) => {
                console.log(url);
                setCultProfile(url);
              }}
              onUploadError={(err: any) => console.error(err)}
            />
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
        </div>

        {/* Footer */}
        <DialogFooter className="flex justify-between">
          {step === 0 ? (
            <DialogClose asChild>
              <Button variant="neutral">Cancel</Button>
            </DialogClose>
          ) : (
            <Button variant="neutral" onClick={handleBack}>
              Back
            </Button>
          )}

          {isLastStep ? (
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? "Updating..." : "Update"}
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
