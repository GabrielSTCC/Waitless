"use client";

import { FormEvent, useEffect, useEffectEvent, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { MessageCircle, Send } from "lucide-react";
import { PlatformRouteGuard } from "@/components/platform/PlatformRouteGuard";
import { PlatformShell } from "@/components/platform/PlatformShell";
import { useLocale, useTranslations } from "@/components/providers/LocaleProvider";
import {
  fetchPlatformSupportThread,
  fetchPlatformSupportThreads,
  sendPlatformSupportMessage,
} from "@/lib/platform/client";
import {
  SUPPORT_MESSAGE_MAX_LENGTH,
  type SupportMessage,
  type SupportThread,
} from "@/lib/support/chat-types";
import { formatDisplayDateTime } from "@/lib/utils/format-date";
import { surfaceCard } from "@/lib/ui/surface";
import { cn } from "@/lib/utils/cn";

const POLL_MS = 5000;

export default function PlatformSupportContent() {
  const { t } = useTranslations("platform");
  const { locale } = useLocale();
  const searchParams = useSearchParams();
  const queryCompanyId = searchParams.get("companyId");
  const [manualSelectedId, setManualSelectedId] = useState<string | null>(null);
  const selectedId = manualSelectedId ?? queryCompanyId;

  const [threads, setThreads] = useState<SupportThread[]>([]);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [activeThread, setActiveThread] = useState<SupportThread | null>(null);
  const [listLoading, setListLoading] = useState(true);
  const [chatLoading, setChatLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const refreshThread = useEffectEvent(async (companyId: string, silent = false) => {
    if (!silent) setChatLoading(true);
    try {
      const result = await fetchPlatformSupportThread(companyId);
      setActiveThread(result.thread);
      setMessages(result.messages);
      setError("");
      const list = await fetchPlatformSupportThreads();
      setThreads(list.threads);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("loadError"));
    } finally {
      if (!silent) setChatLoading(false);
    }
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const result = await fetchPlatformSupportThreads();
        if (cancelled) return;
        setThreads(result.threads);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("loadError"));
        }
      } finally {
        if (!cancelled) setListLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t]);

  useEffect(() => {
    if (!selectedId) return;
    let cancelled = false;
    void (async () => {
      setChatLoading(true);
      try {
        const result = await fetchPlatformSupportThread(selectedId);
        if (cancelled) return;
        setActiveThread(result.thread);
        setMessages(result.messages);
        setError("");
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : t("loadError"));
        }
      } finally {
        if (!cancelled) setChatLoading(false);
      }
    })();

    const timer = window.setInterval(() => {
      void refreshThread(selectedId, true);
    }, POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedId, t]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, selectedId]);

  function selectThread(companyId: string) {
    setManualSelectedId(companyId);
    setMessages([]);
    setActiveThread(null);
    setDraft("");
    setError("");
  }

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    if (!selectedId || !draft.trim() || sending) return;
    setSending(true);
    setError("");
    try {
      const result = await sendPlatformSupportMessage(selectedId, draft.trim());
      setDraft("");
      setActiveThread(result.thread);
      setMessages((prev) =>
        prev.some((m) => m.id === result.message.id)
          ? prev
          : [...prev, result.message],
      );
      const list = await fetchPlatformSupportThreads();
      setThreads(list.threads);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("support.sendError"));
    } finally {
      setSending(false);
    }
  }

  return (
    <PlatformRouteGuard>
      <PlatformShell pageTitle={t("support.title")}>
        <main
          id="main-content"
          className="flex min-h-0 flex-1 flex-col overflow-hidden px-4 pb-6 pt-14 md:px-8 md:py-6 md:pb-8 md:pt-6"
        >
          <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col gap-4">
            <div>
              <h1 className="font-heading text-2xl font-semibold text-on-surface">
                {t("support.title")}
              </h1>
              <p className="mt-1 text-sm text-on-surface-variant">{t("support.subtitle")}</p>
            </div>

            {error && (
              <p className="rounded-lg border border-error/30 bg-error-container px-4 py-3 text-sm text-error">
                {error}
              </p>
            )}

            <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
              <aside className={cn(surfaceCard, "flex max-h-[70vh] flex-col overflow-hidden lg:max-h-none")}>
                <div className="border-b border-outline-variant/40 px-4 py-3">
                  <p className="text-sm font-medium text-on-surface">{t("support.threads")}</p>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {listLoading && (
                    <p className="px-4 py-4 text-sm text-on-surface-variant">{t("loading")}</p>
                  )}
                  {!listLoading && threads.length === 0 && !selectedId && (
                    <p className="px-4 py-4 text-sm text-on-surface-variant">
                      {t("support.emptyThreads")}
                    </p>
                  )}
                  {selectedId &&
                    !threads.some((thread) => thread.companyId === selectedId) && (
                      <button
                        type="button"
                        onClick={() => selectThread(selectedId)}
                        className="flex w-full flex-col gap-1 border-b border-outline-variant/30 bg-primary/10 px-4 py-3 text-left"
                      >
                        <span className="truncate text-sm font-medium text-on-surface">
                          {activeThread?.companyName || selectedId}
                        </span>
                        <p className="truncate text-xs text-on-surface-variant">
                          {t("support.noPreview")}
                        </p>
                      </button>
                    )}
                  {threads.map((thread) => {
                    const active = thread.companyId === selectedId;
                    return (
                      <button
                        key={thread.companyId}
                        type="button"
                        onClick={() => selectThread(thread.companyId)}
                        className={cn(
                          "flex w-full flex-col gap-1 border-b border-outline-variant/30 px-4 py-3 text-left transition-colors",
                          active
                            ? "bg-primary/10"
                            : "hover:bg-surface-container-high",
                        )}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-sm font-medium text-on-surface">
                            {thread.companyName || thread.companyId}
                          </span>
                          {thread.unreadForPlatform > 0 && (
                            <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-on-primary">
                              {thread.unreadForPlatform}
                            </span>
                          )}
                        </div>
                        <p className="truncate text-xs text-on-surface-variant">
                          {thread.lastMessagePreview || t("support.noPreview")}
                        </p>
                        {thread.lastMessageAt && (
                          <time className="text-[11px] text-on-surface-variant/80">
                            {formatDisplayDateTime(thread.lastMessageAt, locale)}
                          </time>
                        )}
                      </button>
                    );
                  })}
                </div>
              </aside>

              <section className={cn(surfaceCard, "flex min-h-[420px] flex-col overflow-hidden")}>
                {!selectedId && (
                  <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
                    <MessageCircle className="h-8 w-8 text-on-surface-variant" strokeWidth={1.75} />
                    <p className="text-sm text-on-surface-variant">{t("support.selectThread")}</p>
                  </div>
                )}

                {selectedId && (
                  <>
                    <div className="flex items-center justify-between gap-3 border-b border-outline-variant/40 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-on-surface">
                          {activeThread?.companyName || selectedId}
                        </p>
                        <Link
                          href={`/platform/companies/${selectedId}`}
                          className="text-xs text-primary hover:underline"
                        >
                          {t("support.openCompany")}
                        </Link>
                      </div>
                    </div>

                    <div className="flex max-h-[50vh] min-h-[240px] flex-1 flex-col gap-3 overflow-y-auto bg-surface-container-low/40 p-4">
                      {chatLoading && (
                        <p className="text-sm text-on-surface-variant">{t("loading")}</p>
                      )}
                      {!chatLoading && messages.length === 0 && (
                        <p className="text-sm text-on-surface-variant">
                          {t("support.emptyMessages")}
                        </p>
                      )}
                      {messages.map((message) => {
                        const mine = message.senderType === "platform";
                        return (
                          <div
                            key={message.id}
                            className={cn(
                              "flex flex-col gap-1",
                              mine ? "items-end" : "items-start",
                            )}
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
                              {mine
                                ? t("support.you")
                                : message.senderName || t("support.tenant")}
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
                      className="flex items-end gap-2 border-t border-outline-variant/40 p-3"
                    >
                      <label className="sr-only" htmlFor="platform-support-input">
                        {t("support.placeholder")}
                      </label>
                      <textarea
                        id="platform-support-input"
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder={t("support.placeholder")}
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
                        <span className="hidden sm:inline">{t("support.send")}</span>
                      </button>
                    </form>
                  </>
                )}
              </section>
            </div>
          </div>
        </main>
      </PlatformShell>
    </PlatformRouteGuard>
  );
}
