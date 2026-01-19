"use client";

import { useRouter } from "next/navigation";
import DashboardView from "@/components/DashboardView";

export default function DashboardPage() {
  const router = useRouter();

  const handleNavigateToChat = (conversation: any) => {
    // Assuming we navigate to /livechat with a query param or route param
    // The previous logic set selectedChatFromDashboard.
    // We should probably rely on the ID being present in the URL for LiveChat to pick it up.
    // If LiveChatView doesn't support reading from URL yet, we might need to update it.
    // For now, let's pass the ID in the query string.
    const jid = conversation.remoteJid;
    router.push(`/livechat?jid=${jid}`);
  };

  return <DashboardView onNavigateToChat={handleNavigateToChat} />;
}
