export type SupportSenderType = "platform" | "tenant";

export interface SupportThread {
  companyId: string;
  companyName: string;
  ownerId: string;
  lastMessageAt: string | null;
  lastMessagePreview: string;
  unreadForPlatform: number;
  unreadForTenant: number;
  updatedAt: string | null;
}

export interface SupportMessage {
  id: string;
  senderType: SupportSenderType;
  senderUid: string;
  senderName: string;
  body: string;
  createdAt: string | null;
}

export const SUPPORT_MESSAGE_MAX_LENGTH = 4000;
export const SUPPORT_MESSAGE_MIN_LENGTH = 1;
export const SUPPORT_PREVIEW_MAX_LENGTH = 120;
export const SUPPORT_MESSAGES_PAGE_SIZE = 100;
