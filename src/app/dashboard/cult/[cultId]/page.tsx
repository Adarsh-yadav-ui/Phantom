"use client";

import { useMutation, useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { EditCultForm } from "@/features/cult/cultUpdateForm";
import { CultDeletionForm } from "@/features/cult/cultDeletionForm";
import React, { useEffect } from "react";
import { ChannelCreationForm } from "@/features/channels/channelCreationForm";

export default function PostPage() {
  const { cultId } = useParams<{ cultId: string }>();

  const currentUser = useQuery(api.users.current);
  const userId = currentUser?._id;

  const joinCult = useMutation(api.cultMembers.join);
  const syncChannelMemberships  = useMutation(api.channelMembers.syncChannelMemberships );

  const getCultById = useQuery(
    api.cult.getCult,
    cultId ? { cultId: cultId as Id<"cult"> } : "skip",
  );

  const isCultMember = useQuery(
    api.cultMembers.isCultMember,
    cultId && userId ? { cultId: cultId as Id<"cult">, userId } : "skip",
  );

  const isAdmin = useQuery(
    api.cultMembers.isAdmin,
    cultId && userId ? { cultId: cultId as Id<"cult">, userId } : "skip",
  );

  const getUsersForCult = useQuery(
    api.cultMembers.listMembers,
    cultId ? { cultId: cultId as Id<"cult"> } : "skip",
  );

  const channelsForCult = useQuery(
    api.channel.getChannelsForCult,
    cultId && userId ? { cultId: cultId as Id<"cult">, userId } : "skip",
  );

  // Auto join all public channels once we know the user is a cult member
  useEffect(() => {
    if (!isCultMember || !userId || !cultId) return;

    syncChannelMemberships ({
      cultId: cultId as Id<"cult">,
      userId,
    });
  }, [isCultMember, userId, cultId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Loading state AFTER hooks
  if (!cultId || currentUser === undefined) {
    return <div>Loading...</div>;
  }

  if (!getCultById) {
    return <div>No cult found by this id</div>;
  }

  if (!isCultMember) {
    return (
      <div>
        <p>You are not a member of this cult.</p>

        <button
          onClick={() =>
            joinCult({
              cultId: cultId as Id<"cult">,
              userId: userId!,
            })
          }
        >
          Join Cult
        </button>

        <Link href={`/dashboard/cult/${cultId}/join/${getCultById.joinCode}`}>
          Join by link instead
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div>Post: {cultId}</div>
      <br />

      <div>{getCultById.cultName}</div>

      {isAdmin && (
        <div>
          <EditCultForm
            cultId={getCultById._id}
            initialName={getCultById.cultName}
            initialDesc={getCultById.cultDesc}
          />
          <CultDeletionForm cultId={cultId} />
        </div>
      )}

      <ChannelCreationForm cultId={cultId as Id<"cult">} />

      <pre>{JSON.stringify(channelsForCult, null, 2)}</pre>
    </div>
  );
}