"use client";

import { use } from "react";
import { InvitePageContent } from "./InvitePageContent";

interface InvitePageProps {
  params: Promise<{ inviteId: string }>;
}

export default function InvitePage({ params }: InvitePageProps) {
  const { inviteId } = use(params);
  return <InvitePageContent inviteId={inviteId} />;
}
