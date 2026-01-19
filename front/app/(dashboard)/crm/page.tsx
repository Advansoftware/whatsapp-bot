"use client";

import { useRouter } from "next/navigation";
import ContactsView from "@/components/crm/ContactsView";

export default function CrmPage() {
  const router = useRouter();

  const handleNavigateToChat = (conversation: any) => {
    const jid = conversation.remoteJid;
    router.push(`/livechat?jid=${jid}`);
  };

  return <ContactsView onNavigateToChat={handleNavigateToChat} />;
}
