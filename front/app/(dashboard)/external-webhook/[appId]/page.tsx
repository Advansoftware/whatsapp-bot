"use client";

import { useParams } from "next/navigation";
import { WebhookAppDetailView } from "@/components/external-webhook";

export default function WebhookAppDetailPage() {
  const params = useParams();
  const appId = params.appId as string;

  return <WebhookAppDetailView appId={appId} />;
}
