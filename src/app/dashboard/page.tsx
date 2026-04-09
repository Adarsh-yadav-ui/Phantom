"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { CultCreationForm } from "@/features/cult/cultCreationForm";
import Link from "next/link";
import { UserButton } from "@clerk/nextjs";

export default function DashboardPage() {
  const cults = useQuery(api.cult.getAllCult);

  return (
    <div className="m-auto p-6">
      <CultCreationForm />
      <UserButton />

      <div className="mt-6 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 text-left font-medium">Id</th>
              <th className="px-4 py-3 text-left font-medium">Name</th>
              <th className="px-4 py-3 text-left font-medium">Description</th>
              <th className="px-4 py-3 text-left font-medium">Join Code</th>
              <th className="px-4 py-3 text-left font-medium">Created At</th>
            </tr>
          </thead>
          <tbody>
            {cults === undefined ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  Loading...
                </td>
              </tr>
            ) : cults.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-6 text-center text-muted-foreground"
                >
                  No cults yet.
                </td>
              </tr>
            ) : (
              cults.map((cult) => (
                <tr
                  key={cult._id}
                  className="border-t border-border hover:bg-muted/50 transition-colors"
                >
                  <td className="px-4 py-3 font-medium">{cult._id}</td>
                  <Link href={`/dashboard/cult/${cult._id}`}>
                    <td className="px-4 py-3 font-medium">{cult.cultName}</td>
                  </Link>
                  <td className="px-4 py-3 text-muted-foreground">
                    {cult.cultDesc}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-muted px-2 py-1 font-mono text-xs">
                      {cult.joinCode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(cult.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
