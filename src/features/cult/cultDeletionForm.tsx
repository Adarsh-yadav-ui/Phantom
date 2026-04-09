"use client";

import { useState } from "react";
import { AlertTriangle, Trash2 } from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogMedia,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useRouter } from "next/navigation";

export function CultDeletionForm({ cultId }: { cultId: string }) {
  const [confirmed, setConfirmed] = useState(false);
  const deleteCult = useMutation(api.cult.deleteCult);
  const router = useRouter();
  const handleOpenChange = (open: boolean) => {
    if (!open) setConfirmed(false);
  };

  async function handleCultDelete() {
    await deleteCult({ cultId: cultId as Id<"cult"> });
  }

  return (
    <AlertDialog onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive">Delete Cult</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        {!confirmed ? (
          <>
            <AlertDialogHeader className="flex items-center">
              <AlertDialogMedia className="bg-red-200 text-red-400 dark:bg-destructive/20 dark:text-destructive">
                <Trash2 />
              </AlertDialogMedia>
              <AlertDialogTitle>Delete this cult?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete this cult and all of its channels,
                members, and messages.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <Button variant="destructive" onClick={() => setConfirmed(true)}>
                Delete
              </Button>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader className="flex items-center">
              <AlertDialogMedia className="bg-amber-100 text-amber-500 dark:bg-amber-900/30 dark:text-amber-400">
                <AlertTriangle />
              </AlertDialogMedia>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. All channels, members, and
                messages within this cult will be permanently erased.
              </AlertDialogDescription>
              <div className="mt-2 w-full rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-900/20 dark:text-amber-300">
                You are about to disband the cult. Confirm below to make it
                disappear forever.
              </div>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="neutral" onClick={() => setConfirmed(false)}>
                Go back
              </Button>
              <AlertDialogAction
                onClick={async (e) => {
                  e.preventDefault();
                  await handleCultDelete();
                  await router.push("/dashboard");
                }}
              >
                Yes, disband it
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );
}
