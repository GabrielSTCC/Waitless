import {
  collection,
  onSnapshot,
  orderBy,
  query,
  limit,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/lib/firebase/config";
import {
  SUPPORT_MESSAGES_PAGE_SIZE,
  type SupportMessage,
  type SupportSenderType,
} from "@/lib/support/chat-types";

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    try {
      return (value as { toDate: () => Date }).toDate().toISOString();
    } catch {
      return null;
    }
  }
  if (typeof value === "string") return value;
  return null;
}

export function listenSupportMessages(
  companyId: string,
  onChange: (messages: SupportMessage[]) => void,
  onError?: (error: Error) => void,
): Unsubscribe {
  const q = query(
    collection(getDb(), "supportThreads", companyId, "messages"),
    orderBy("createdAt", "asc"),
    limit(SUPPORT_MESSAGES_PAGE_SIZE),
  );

  return onSnapshot(
    q,
    (snap) => {
      const messages: SupportMessage[] = snap.docs.map((docSnap) => {
        const data = docSnap.data();
        const senderType: SupportSenderType =
          data.senderType === "platform" ? "platform" : "tenant";
        return {
          id: docSnap.id,
          senderType,
          senderUid: typeof data.senderUid === "string" ? data.senderUid : "",
          senderName: typeof data.senderName === "string" ? data.senderName : "",
          body: typeof data.body === "string" ? data.body : "",
          createdAt: toIso(data.createdAt),
        };
      });
      onChange(messages);
    },
    (error) => {
      onError?.(error);
    },
  );
}
