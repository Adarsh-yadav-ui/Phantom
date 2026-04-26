"use client";
import { useMutation, useQuery } from "convex/react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "../../../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../../../convex/_generated/dataModel";

export default function PostPage() {
  const { joinId, channelId, cultId } = useParams<{
    joinId: string;
    channelId: string;
    cultId: string;
  }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  const currentUser = useQuery(api.users.current);
  const isUserInCult = useQuery(
    api.cultMembers.isCultMember,
    currentUser && channelId
      ? { cultId: cultId as Id<"cult">, userId: currentUser._id }
      : "skip",
  );
  const isUserInChannel = useQuery(
    api.channelMembers.isChannelMember,
    currentUser && channelId
      ? { channelId: channelId as Id<"channel">, userId: currentUser._id }
      : "skip",
  );
  const joinChannelByCode = useMutation(api.channelMembers.joinByCode);

  useEffect(() => {
    if (!joinId || !currentUser || isUserInChannel === undefined) return;
    if (isUserInChannel) {
      router.push(`/dashboard/cult/${cultId}/channel/${channelId}`);
      return;
    }

    const join = async () => {
      setJoining(true);
      try {
        await joinChannelByCode({ joinCode: joinId, userId: currentUser._id });
        router.push(`/dashboard/cult/${cultId}/channel/${channelId}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      } finally {
        setJoining(false);
      }
    };
    if (isUserInCult) {
      join();
    }
  }, [joinId, currentUser, isUserInChannel]);

  if (!currentUser || isUserInChannel === undefined || joining) {
    return <div>Joining Channel...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }

  return null; // will redirect in useEffect
}
