"use client";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";

export default function PostPage() {
  const { joinId, cultId } = useParams<{ joinId: string; cultId: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const currentUser = useQuery(api.users.current);
  const isUserInCult = useQuery(
    api.cultMembers.isCultMember,
    currentUser && cultId
      ? { cultId: cultId as Id<"cult">, userId: currentUser._id }
      : "skip",
  );
  const joinCultByCode = useMutation(api.cultMembers.joinByCode);

  useEffect(() => {
    if (!joinId || !currentUser || isUserInCult === undefined) return;
    if (isUserInCult) {
      // Already a member, redirect straight to the cult
      router.push(`/dashboard/cult/${cultId}`);
      return;
    }

    const join = async () => {
      setJoining(true);
      try {
        await joinCultByCode({ joinCode: joinId });
        router.push(`/cults/${cultId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setJoining(false);
      }
    };

    join();
  }, [joinId, currentUser, isUserInCult]);

  if (!currentUser || isUserInCult === undefined || joining) {
    return <div>Joining cult...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return null; // will redirect in useEffect
}
