"use client";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import Link from "next/link";
import { EditCultForm } from "@/features/cult/cultUpdateForm";
import { CultDeletionForm } from "@/features/cult/cultDeletionForm";

export default function PostPage() {
  const { cultId } = useParams<{ cultId: string }>();
  const currentUser = useQuery(api.users.current);
  const getCultById = useQuery(api.cult.getCult, {
    cultId: cultId as Id<"cult">,
  });
  const isCultMember = useQuery(api.cultMembers.isCultMember, {
    cultId: cultId as Id<"cult">,
    userId: currentUser?._id as Id<"users">,
  });
  const isAdmin = useQuery(api.cultMembers.isAdmin, {
    cultId: cultId as Id<"cult">,
    userId: currentUser?._id as Id<"users">,
  });
  const getUsersForCult = useQuery(api.cultMembers.listMembers, {
    cultId: cultId as Id<"cult">,
  });
  const getAdminUsersForCult = useQuery(api.cultMembers.listAdmins, {
    cultId: cultId as Id<"cult">,
  });
  if (!getCultById) {
    return <div>No cult found by this id</div>;
  }
  if (!cultId) {
    return <div>Loading...</div>;
  }

  if (!isCultMember) {
    return (
      <div>
        join by this link{" "}
        <Link href={`/dashboard/cult/${cultId}/join/${getCultById?.joinCode}`}>
          Click here
        </Link>
      </div>
    );
  }

  if (isCultMember)
    return (
      <div>
        Post: {cultId}
        <br />
        <br />
        {JSON.stringify(getCultById)}
        <br />
        <br />
        <div>{getCultById?.cultName}</div>
        {/* {isCultMember} */}
        {getUsersForCult?.map((user) => {
          return <div key={user._id}>{user.user?.firstName}</div>;
        })}
        abc
        {getAdminUsersForCult?.map((user) => {
          return <div key={user._id}>{user.user?.firstName}</div>;
        })}
        {isAdmin && (
          <EditCultForm
            cultId={getCultById?._id}
            initialName={getCultById?.cultName}
            initialDesc={getCultById?.cultDesc}
          />
        )}
        <CultDeletionForm cultId={cultId} />
      </div>
    );
}
