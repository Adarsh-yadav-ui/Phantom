"use client";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../../../convex/_generated/api";
import { Id } from "../../../../../../../convex/_generated/dataModel";
import { EditChannelForm } from "@/features/channels/channelUpdateForm";
import { ChannelDeletionForm } from "@/features/channels/channelDeletionForm";

export default function PostPage() {
  const { channelId, cultId } = useParams<{
    channelId: string;
    cultId: string;
  }>();
  const currentUser = useQuery(api.users.current);
  const channelDetails = useQuery(api.channel.getChannel, {
    channelId: channelId as Id<"channel">,
    userId: currentUser?._id as Id<"users">,
  });

  if (!channelId) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <div>CultId: {cultId}</div>
      <div>ChannelId: {channelId}</div>
      <br />
      <pre className="bg-gray-200 p-4 rounded-lg overflow-auto w-fit">
        {JSON.stringify(channelDetails, null, 2)}
      </pre>
      <EditChannelForm
        initialName={channelDetails?.channelName || ""}
        initialDesc={channelDetails?.channelDesc || ""}
        initialVisibility={channelDetails?.visibility || "public"}
        channelId={channelId as Id<"channel">}
      />
      <ChannelDeletionForm channelId={channelDetails?._id as Id<"channel">} />
    </div>
  );
}
