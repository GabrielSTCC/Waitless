"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { MessageCircle, Send } from "lucide-react";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import { SettingsFeedback } from "@/components/settings/SettingsFeedback";
import { auth } from "@/lib/firebase/config";
import { listenSupportMessages } from "@/lib/firebase/support-chat";
import {
  SUPPORT_MESSAGE_MAX_LENGTH,
  type SupportMessage,
  type SupportThread,
} from "@/lib/support/chat-types";
import { formatDisplayDateTime } from "@/lib/utils/format-date";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

interface SupportChatPanelProps {
  companyId: string;
  className?: string;
}

async function authHeaders(): Promise<HeadersInit> {
  const user = auth.currentUser;
  if (!user) throw new Error("UNAUTHENTICATED");
  const idToken = await user.getIdToken();
  return {
    Authorization: `Bearer ${idToken}`,
    "Content-Type": "application/json",
  };
}

export function SupportChatPanel({ companyId, className }: Readonly<SupportChatPanelProps>) {
  const { t } = useTranslations("help");
  const { locale } = useLocale();
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [thread, setThread] = useState<SupportThread | null>(null);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      setLoading(true);
      setError("");
      try {
        const headers = await authHeaders();
        const res = await fetch("/api/support/chat", { headers });
        const data = (await res.json().catch(() => ({}))) as {
          thread?: SupportThread | null;
          messages?: SupportMessage[];
          error?: string;
        };
        if (!res.ok) {
          throw new Error(data.error ?? t("chatLoadError"));
        }
        if (!cancelled) {
          setThread(data.thread ?? null);
          if (Array.isArray(data.messages)) setMessages(data.messages);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("chatLoadError"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [companyId, t]);

  useEffect(() => {
    if (!companyId) return;
    const unsub = listenSupportMessages(
      companyId,
      (next) => {
        setMessages(next);
        setLoading(false);
      },
      () => {
        // Listener opcional — API já carrega; falha de rules/rede não bloqueia o painel
      },
    );
    return () => unsub();
  }, [companyId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const body = draft.trim();
    if (!body || sending) return;

    setSending(true);
    setError("");
    try {
      const headers = await authHeaders();
      const res = await fetch("/api/support/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({ body }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        thread?: SupportThread;
        message?: SupportMessage;
        error?: string;
      };
      if (!res.ok) {
        throw new Error(data.error ?? t("chatSendError"));
      }
      setDraft("");
      if (data.thread) setThread(data.thread);
      if (data.message) {
        setMessages((prev) =>
          prev.some((m) => m.id === data.message!.id) ? prev : [...prev, data.message!],
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t("chatSendError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <section
      id="support-chat"
      aria-labelledby="help-chat-title"
      className={cn("flex flex-col", surfaceCard, "p-5 md:p-6", className)}
    >
      <header className="mb-4 flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10">
          <MessageCircle className="h-4 w-4 text-primary" strokeWidth={2} />
        </div>
        <div className="min-w-0">
          <h2
            id="help-chat-title"
            className="font-heading text-sm font-semibold text-on-surface md:text-base"
          >
            {t("chatTitle")}
          </h2>
          <p className="mt-0.5 text-xs text-on-surface-variant md:text-sm">
            {t("chatSubtitle")}
          </p>
        </div>
      </header>

      <SettingsFeedback error={error} />

      <div className="flex min-h-[280px] flex-col overflow-hidden rounded-xl border border-outline-variant/60 bg-surface-container-low">
        <div className="flex max-h-[360px] min-h-[220px] flex-1 flex-col gap-3 overflow-y-auto p-4">
          {loading && (
            <p className="text-sm text-on-surface-variant">{t("chatLoading")}</p>
          )}
          {!loading && messages.length === 0 && (
            <p className="text-sm text-on-surface-variant">{t("chatEmpty")}</p>
          )}
          {messages.map((message) => {
            const mine = message.senderType === "tenant";
            return (
              <div
                key={message.id}
                className={cn("flex flex-col gap-1", mine ? "items-end" : "items-start")}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                    mine
                      ? "bg-primary text-on-primary"
                      : "bg-surface-container-highest text-on-surface",
                  )}
                >
                  {message.body}
                </div>
                <p className="px-1 text-[11px] text-on-surface-variant">
                  {mine ? t("chatYou") : message.senderName || t("chatSupport")}
                  {message.createdAt
                    ? ` · ${formatDisplayDateTime(message.createdAt, locale)}`
                    : ""}
                </p>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form
          onSubmit={(e) => void handleSend(e)}
          className="flex items-end gap-2 border-t border-outline-variant/50 p-3"
        >
          <label className="sr-only" htmlFor="support-chat-input">
            {t("chatPlaceholder")}
          </label>
          <textarea
            id="support-chat-input"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder={t("chatPlaceholder")}
            rows={2}
            maxLength={SUPPORT_MESSAGE_MAX_LENGTH}
            disabled={sending}
            className="min-h-[44px] flex-1 resize-none rounded-xl border border-outline-variant bg-surface px-3 py-2.5 text-sm text-on-surface placeholder:text-on-surface-variant/70 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={sending || !draft.trim()}
            className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-medium text-on-primary transition-colors hover:brightness-110 disabled:opacity-50"
          >
            <Send className="h-4 w-4" strokeWidth={2} />
            <span className="hidden sm:inline">{t("chatSend")}</span>
          </button>
        </form>
      </div>

      {thread?.unreadForTenant ? (
        <p className="mt-2 text-xs text-on-surface-variant">{t("chatUnreadHint")}</p>
      ) : null}
    </section>
  );
}
