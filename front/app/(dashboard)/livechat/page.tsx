"use client";

import { useSearchParams } from "next/navigation";
import LiveChatView from "@/components/chat/LiveChatView";
import { Suspense } from "react";

function LiveChatContent() {
  const searchParams = useSearchParams();
  const jid = searchParams.get("jid");

  const initialChat = jid
    ? {
        remoteJid: jid,
        contact: jid,
        instanceKey: "",
        profilePicUrl: null,
      }
    : null;

  return <LiveChatView initialChat={initialChat} />;
}

export default function LiveChatPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LiveChatContent />
    </Suspense>
  );
}
