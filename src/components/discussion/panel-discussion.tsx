import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  MessageSquare,
  CheckCircle2,
  Loader2,
  MapPin,
  TrendingUp,
  ChevronDown,
  PanelLeftClose,
  PanelRightClose,
  Globe,
  Languages,
  DollarSign,
  WifiOff,
  Info,
  Users as UsersIcon,
  X,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@/components/ui/select";
import { languages } from "@/i18n";
import { useDiscussion } from "@/contexts/discussion-context";
import { SplitMessageBubble, StreamingMessageBubble } from "./message-bubble";
import { TypingIndicator } from "./typing-indicator";
import { MessageInput } from "./message-input";
import { ExpertPanel } from "./expert-panel";
import { DiscussionSummary } from "./discussion-summary";
import { ThemeToggle } from "@/components/theme-toggle";
import type { FeasibilityReport, CategoryKey } from "@/types";
import { categoryLabels } from "@/types";
import type { CountryConfig } from "@/lib/countries";
import { cn } from "@/lib/utils";

// Format large numbers with B/M suffix for compact display
function formatCompactCurrency(value: number): string {
  if (value >= 1_000_000_000) {
    return (value / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  }
  if (value >= 1_000_000) {
    return (value / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  }
  if (value >= 1_000) {
    return (value / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  }
  return value.toLocaleString();
}

interface PanelDiscussionProps {
  reportSlug: string;
  report: FeasibilityReport;
  country: CountryConfig;
  projectDescription?: string;
}

export function PanelDiscussion({
  reportSlug,
  report,
  country,
  projectDescription,
}: PanelDiscussionProps) {
  const { t, i18n } = useTranslation();
  const {
    discussion,
    messages,
    translatedMessages,
    translatedDiscussion,
    activeGuests,
    currentUserSessionId,
    connectionState,
    isLoading,
    isSending,
    isTranslating,
    error,
    typingIndicator,
    streamingMessage,
    startDiscussion,
    loadTranslation,
    clearTranslation,
    sendMessageStream,
    reset,
  } = useDiscussion();

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);
  const [showLeftSidebar, setShowLeftSidebar] = useState(true);
  const [showRightSidebar, setShowRightSidebar] = useState(true);
  const [mobilePanel, setMobilePanel] = useState<"left" | "right" | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [showScrollButton, setShowScrollButton] = useState(false);
  const [replyingTo, setReplyingTo] = useState<typeof messages[0] | null>(null);
  const prevMessagesLengthRef = useRef(0);

  // Resizable sidebar state
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(240);
  const isResizingRef = useRef<"left" | "right" | null>(null);
  const startXRef = useRef(0);
  const startWidthRef = useRef(0);

  const MIN_WIDTH = 180;
  const MAX_WIDTH = 400;

  // RTL detection for layout logic
  const isRTL = languages.find(l => l.code === i18n.language)?.dir === 'rtl';

  const handleMouseDown = (side: "left" | "right", e: React.MouseEvent) => {
    e.preventDefault();
    isResizingRef.current = side;
    startXRef.current = e.clientX;
    startWidthRef.current = side === "left" ? leftWidth : rightWidth;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingRef.current) return;

      const delta = e.clientX - startXRef.current;
      const rtlMultiplier = isRTL ? -1 : 1;
      const newWidth = isResizingRef.current === "left"
        ? startWidthRef.current + delta * rtlMultiplier
        : startWidthRef.current - delta * rtlMultiplier;

      const clampedWidth = Math.max(MIN_WIDTH, Math.min(MAX_WIDTH, newWidth));

      if (isResizingRef.current === "left") {
        setLeftWidth(clampedWidth);
      } else {
        setRightWidth(clampedWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingRef.current = null;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isRTL]);

  const handleLanguageChange = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  // Initialize discussion on mount
  useEffect(() => {
    const init = async () => {
      await startDiscussion(reportSlug);
      setIsInitialized(true);
    };
    init();

    return () => {
      reset();
    };
  }, [reportSlug, startDiscussion, reset]);

  // Scroll to bottom when discussion is initialized and has messages
  const hasMessages = messages.length > 0;
  useEffect(() => {
    if (isInitialized && hasMessages) {
      // Use setTimeout to ensure DOM is fully rendered after React updates
      const timeoutId = setTimeout(() => {
        const container = messagesContainerRef.current;
        if (container) {
          container.scrollTop = container.scrollHeight;
        }
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [isInitialized, hasMessages]); // Only trigger when initialized or first message arrives

  // Current language for translation
  const currentLanguage = i18n.language;
  const needsTranslation = currentLanguage !== 'en' && !currentLanguage.startsWith('en-');

  // Fetch translation when language changes
  useEffect(() => {
    if (!isInitialized || messages.length === 0) return;

    if (needsTranslation) {
      loadTranslation(reportSlug, currentLanguage);
    } else {
      clearTranslation();
    }
  }, [currentLanguage, needsTranslation, isInitialized, messages.length, reportSlug, loadTranslation, clearTranslation]);

  // Track scroll position
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;
      isNearBottomRef.current = distanceFromBottom < 100;
      setShowScrollButton(distanceFromBottom > 200);
    };

    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  // Auto-scroll on new messages
  useEffect(() => {
    const currentLength = messages.length;
    if (currentLength > prevMessagesLengthRef.current && isNearBottomRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
    prevMessagesLengthRef.current = currentLength;
  }, [messages.length]);

  useEffect(() => {
    if (typingIndicator && isNearBottomRef.current) {
      const container = messagesContainerRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    }
  }, [typingIndicator]);

  const scrollToBottom = () => {
    const container = messagesContainerRef.current;
    if (container) {
      container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
    }
  };

  const handleSendMessage = async (content: string, targetExpert?: string) => {
    const replyId = replyingTo?.id;
    setReplyingTo(null);
    await sendMessageStream(
      reportSlug,
      content,
      targetExpert as Parameters<typeof sendMessageStream>[2],
      replyId
    );
  };

  const handleReply = (message: typeof messages[0]) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Loading state
  if (!isInitialized || isLoading) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">{t('report.discussion.loadingDiscussion')}</p>
        </motion.div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="h-dvh flex items-center justify-center bg-background">
        <div className="text-center max-w-md px-6">
          <MessageSquare className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h2 className="text-xl font-semibold mb-2">{t('common.error')}</h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button asChild>
            <Link to={`/${country.slug}/report/${reportSlug}`}>
              <ArrowLeft className="h-4 w-4 me-2 rtl:rotate-180" />
              {t('report.discussion.backToReport')}
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const isConcluded = discussion?.status === "concluded";

  // Use translated content when available
  const displayMessages = (needsTranslation && translatedMessages) ? translatedMessages : messages;
  const displayDiscussion = (needsTranslation && translatedDiscussion) ? translatedDiscussion : discussion;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600";
    if (score >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="h-dvh flex flex-col bg-background overflow-hidden">
      {/* Compact Header */}
      <header className="h-12 flex-shrink-0 border-b flex items-center px-3 gap-3 bg-background z-50">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link to={`/${country.slug}/report/${reportSlug}`}>
            <ArrowLeft className="h-4 w-4 rtl:rotate-180" />
          </Link>
        </Button>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <img
            src={`https://flagcdn.com/20x15/${country.code.toLowerCase()}.png`}
            srcSet={`https://flagcdn.com/40x30/${country.code.toLowerCase()}.png 2x`}
            width="20"
            height="15"
            alt={country.name}
            className="rounded-sm"
          />
          <span className="font-medium text-sm truncate">
            {report.detectedProjectType}
          </span>
          <Badge variant="outline" className={cn("text-xs", getScoreColor(report.overallScore))}>
            {report.overallScore}/100
          </Badge>
          {isConcluded && (
            <Badge variant="secondary" className="text-xs gap-1 bg-green-100 text-green-700">
              <CheckCircle2 className="h-3 w-3" />
              {t('report.discussion.concluded')}
            </Badge>
          )}
          {/* Connection status indicator */}
          {connectionState === "reconnecting" && (
            <Badge variant="secondary" className="text-xs gap-1 bg-transparent border border-yellow-600 text-yellow-700 dark:text-yellow-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              {t('report.discussion.reconnecting', 'Reconnecting...')}
            </Badge>
          )}
          {connectionState === "disconnected" && (
            <Badge variant="secondary" className="text-xs gap-1 bg-transparent border border-red-600 text-red-700 dark:text-red-400">
              <WifiOff className="h-3 w-3" />
              {t('report.discussion.disconnected', 'Offline')}
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-1">
          {/* Mobile-only toggle buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setMobilePanel(mobilePanel === "left" ? null : "left")}
          >
            <Info className={cn("h-4 w-4", mobilePanel === "left" && "text-primary")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setMobilePanel(mobilePanel === "right" ? null : "right")}
          >
            <UsersIcon className={cn("h-4 w-4", mobilePanel === "right" && "text-primary")} />
          </Button>
          <Select value={i18n.language} onValueChange={handleLanguageChange}>
            <SelectTrigger className="h-8 w-8 p-0 border-0 bg-transparent hover:bg-accent">
              <Globe className="h-4 w-4" />
            </SelectTrigger>
            <SelectContent>
              {languages.map((lang) => (
                <SelectItem key={lang.code} value={lang.code}>
                  {lang.nativeName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <ThemeToggle />
          {/* Desktop-only toggle buttons */}
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden md:flex"
            onClick={() => setShowLeftSidebar(!showLeftSidebar)}
          >
            <PanelLeftClose className={cn("h-4 w-4", !showLeftSidebar && "opacity-50")} />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 hidden lg:flex"
            onClick={() => setShowRightSidebar(!showRightSidebar)}
          >
            <PanelRightClose className={cn("h-4 w-4", !showRightSidebar && "opacity-50")} />
          </Button>
        </div>
      </header>

      {/* Main Content - fills remaining viewport height */}
      <div className="flex-1 flex min-h-0 overflow-hidden">
        {/* Left Sidebar - Project Info */}
        <AnimatePresence>
          {showLeftSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: leftWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ width: leftWidth }}
              className="hidden md:flex border-e overflow-hidden flex-shrink-0 relative"
            >
              <div className="h-full w-full min-w-0 overflow-y-auto overscroll-contain p-3 space-y-3">
                {/* Score */}
                <div className="p-3 rounded-lg border bg-card">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground">{t('report.discussion.scoreLabel')}</span>
                    <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className={cn("text-3xl font-bold", getScoreColor(report.overallScore))}>
                      {report.overallScore}
                    </span>
                    <span className="text-muted-foreground text-sm">/100</span>
                  </div>
                </div>

                {/* Location */}
                {report.location?.specified && (
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('report.location')}</span>
                    </div>
                    <p className="text-sm">{report.location.specified}</p>
                  </div>
                )}

                {/* Description */}
                {projectDescription && (
                  <div className="p-3 rounded-lg border bg-card">
                    <span className="text-xs text-muted-foreground">{t('report.discussion.description')}</span>
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-4">
                      {projectDescription}
                    </p>
                  </div>
                )}

                {/* Budget & Cost */}
                {report.estimatedCost && (
                  <div className="p-3 rounded-lg border bg-card">
                    <div className="flex items-center gap-1.5 mb-2">
                      <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{t('report.estimatedCost')}</span>
                    </div>
                    <p className="text-sm font-medium">
                      {report.estimatedCost.currency} {formatCompactCurrency(report.estimatedCost.low)} - {formatCompactCurrency(report.estimatedCost.high)}
                    </p>
                    {report.budgetAlignment && (
                      <div className="mt-2 pt-2 border-t">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-muted-foreground">{t('report.budgetAlignment.affordabilityScore')}</span>
                          <span className={cn(
                            "font-medium",
                            report.budgetAlignment.affordabilityScore >= 70 ? "text-green-600" :
                            report.budgetAlignment.affordabilityScore >= 50 ? "text-yellow-600" : "text-red-600"
                          )}>
                            {report.budgetAlignment.affordabilityScore}/100
                          </span>
                        </div>
                        {report.budgetAlignment.fundingGap && report.budgetAlignment.fundingGap > 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('report.budgetAlignment.fundingGap')}: {report.estimatedCost.currency} {formatCompactCurrency(report.budgetAlignment.fundingGap)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Categories */}
                {report.categories && typeof report.categories === 'object' && (
                <div className="p-3 rounded-lg border bg-card">
                  <span className="text-xs text-muted-foreground">{t('report.categories.title')}</span>
                  <div className="mt-2 space-y-2">
                    {Object.entries(report.categories)
                      .filter(([, cat]) => cat?.score != null)
                      .map(([key, cat]) => (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs">{cat.name || categoryLabels[key as CategoryKey] || key}</span>
                          <span className="text-xs font-medium">{cat.score}</span>
                        </div>
                        <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full",
                              cat.score >= 70 ? "bg-green-500" : cat.score >= 50 ? "bg-yellow-500" : "bg-red-500"
                            )}
                            style={{ width: `${cat.score}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                )}
              </div>
              {/* Resize handle */}
              <div
                onMouseDown={(e) => handleMouseDown("left", e)}
                className="absolute end-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
              />
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Center - Chat area with fixed input */}
        <div className="flex-1 flex flex-col min-w-0 min-h-0 relative">
          {/* Messages - scrollable area */}
          <div
            ref={messagesContainerRef}
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-3"
          >
            {/* Translation indicator */}
            {isTranslating && (
              <div className="flex justify-center py-2">
                <div className="flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm text-primary">
                  <Languages className="h-4 w-4 animate-pulse" />
                  <span>{t('common.translating')}</span>
                </div>
              </div>
            )}


            <AnimatePresence mode="popLayout">
              {displayMessages.map((message) => {
                const replyToMessage = message.replyToId
                  ? displayMessages.find((m) => m.id === message.replyToId)
                  : undefined;
                // Check if this message is from the current user by comparing guestId
                // guestId can be at top level (from WebSocket/SSE) or in metadata (from DB)
                const messageGuestId = (message as { guestId?: string }).guestId ||
                  (message.metadata as { guestId?: string } | undefined)?.guestId;
                // For user messages: match by guestId, or if no guestId, it's from before multi-user support
                const isCurrentUser = message.participantType === "user" &&
                  (messageGuestId === currentUserSessionId || (messageGuestId === undefined && message.participantName !== "Moderator"));
                return (
                  <SplitMessageBubble
                    key={message.id}
                    message={message}
                    replyToMessage={replyToMessage}
                    isCurrentUser={isCurrentUser}
                    onReply={handleReply}
                  />
                );
              })}
            </AnimatePresence>

            {/* Suggested questions - show when only welcome message exists (no user messages yet) */}
            {!isConcluded && !streamingMessage && !typingIndicator && displayMessages.filter(m => m.participantName !== "Moderator").length === 0 && (
              <div className="flex flex-col items-center py-6 px-4">
                <p className="text-xs text-muted-foreground mb-3">{t('report.discussion.suggestedQuestions', 'Try asking:')}</p>
                <div className="w-full max-w-md grid gap-2">
                  {[
                    t('report.discussion.suggestion1', 'What are the main risks of this project?'),
                    t('report.discussion.suggestion2', 'How can we improve the feasibility score?'),
                    t('report.discussion.suggestion3', 'What permits and approvals are needed?'),
                  ].map((question, index) => (
                    <button
                      key={index}
                      onClick={() => handleSendMessage(question)}
                      disabled={isSending}
                      className="text-start px-4 py-3 rounded-xl border border-border/50 bg-transparent hover:bg-muted/50 hover:border-primary/30 transition-all text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
                    >
                      {question}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {streamingMessage && (
              <StreamingMessageBubble
                participantType={streamingMessage.participant}
                participantName={streamingMessage.participantName}
                content={streamingMessage.content}
              />
            )}

            <AnimatePresence>
              {typingIndicator && (
                <TypingIndicator
                  participant={typingIndicator.participant}
                  participantName={typingIndicator.participantName}
                />
              )}
            </AnimatePresence>

            {isConcluded && displayDiscussion?.summary && (
              <DiscussionSummary
                summary={displayDiscussion.summary}
                concludedAt={displayDiscussion.concludedAt || new Date().toISOString()}
              />
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Scroll to bottom */}
          <AnimatePresence>
            {showScrollButton && displayMessages.length > 0 && (
              <motion.button
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                onClick={scrollToBottom}
                className="absolute bottom-24 end-6 z-10 h-9 w-9 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:bg-primary/90"
              >
                <ChevronDown className="h-5 w-5" />
              </motion.button>
            )}
          </AnimatePresence>

          {/* Fixed Input */}
          {!isConcluded ? (
            <div className="flex-shrink-0 border-t bg-background p-3">
              <MessageInput
                onSend={handleSendMessage}
                replyingTo={replyingTo}
                onCancelReply={handleCancelReply}
                disabled={isSending}
                isSending={isSending}
                countrySlug={country.slug}
              />
            </div>
          ) : (
            <div className="flex-shrink-0 border-t bg-transparent p-3 text-center">
              <p className="text-sm text-muted-foreground">
                {t('report.discussion.concludedMessage')}{" "}
                <Link to={`/${country.slug}/report/${reportSlug}`} className="text-primary hover:underline">
                  {t('report.discussion.backToReport')}
                </Link>
              </p>
            </div>
          )}
        </div>

        {/* Right Sidebar - Experts */}
        <AnimatePresence>
          {showRightSidebar && (
            <motion.aside
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: rightWidth, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.15 }}
              style={{ width: rightWidth }}
              className="hidden lg:flex border-s overflow-hidden flex-shrink-0 relative"
            >
              {/* Resize handle */}
              <div
                onMouseDown={(e) => handleMouseDown("right", e)}
                className="absolute start-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/20 active:bg-primary/30 transition-colors"
              />
              <div className="h-full overflow-y-auto overscroll-contain p-3 flex-1">
                <ExpertPanel
                  countrySlug={country.slug}
                  activeGuests={activeGuests.map((guest) => ({
                    ...guest,
                    // Mark the current user's entry
                    name: guest.id === currentUserSessionId ? `${guest.name} (${t('report.discussion.you')})` : guest.name,
                  }))}
                />
              </div>
            </motion.aside>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile slide-over panels */}
      <AnimatePresence>
        {mobilePanel && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="fixed inset-0 z-40 bg-black/40 md:hidden"
              onClick={() => setMobilePanel(null)}
            />
            {/* Panel */}
            <motion.div
              initial={{ x: mobilePanel === "left" ? "-100%" : "100%" }}
              animate={{ x: 0 }}
              exit={{ x: mobilePanel === "left" ? "-100%" : "100%" }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className={cn(
                "fixed top-12 bottom-0 z-50 w-[280px] bg-background border-e shadow-xl md:hidden overflow-hidden flex flex-col",
                mobilePanel === "left" ? "start-0" : "end-0 border-e-0 border-s"
              )}
            >
              {/* Panel header */}
              <div className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0">
                <span className="text-sm font-medium">
                  {mobilePanel === "left" ? t('report.discussion.projectInfo', 'Project Info') : t('report.discussion.experts', 'Experts')}
                </span>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setMobilePanel(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* Panel content */}
              <div className="flex-1 overflow-y-auto overscroll-contain p-3 space-y-3">
                {mobilePanel === "left" ? (
                  <>
                    {/* Score */}
                    <div className="p-3 rounded-lg border bg-card">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-muted-foreground">{t('report.discussion.scoreLabel')}</span>
                        <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                      <div className="flex items-baseline gap-1">
                        <span className={cn("text-3xl font-bold", getScoreColor(report.overallScore))}>
                          {report.overallScore}
                        </span>
                        <span className="text-muted-foreground text-sm">/100</span>
                      </div>
                    </div>

                    {/* Location */}
                    {report.location?.specified && (
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-1.5 mb-1">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{t('report.location')}</span>
                        </div>
                        <p className="text-sm">{report.location.specified}</p>
                      </div>
                    )}

                    {/* Description */}
                    {projectDescription && (
                      <div className="p-3 rounded-lg border bg-card">
                        <span className="text-xs text-muted-foreground">{t('report.discussion.description')}</span>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-4">
                          {projectDescription}
                        </p>
                      </div>
                    )}

                    {/* Budget & Cost */}
                    {report.estimatedCost && (
                      <div className="p-3 rounded-lg border bg-card">
                        <div className="flex items-center gap-1.5 mb-2">
                          <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground">{t('report.estimatedCost')}</span>
                        </div>
                        <p className="text-sm font-medium">
                          {report.estimatedCost.currency} {formatCompactCurrency(report.estimatedCost.low)} - {formatCompactCurrency(report.estimatedCost.high)}
                        </p>
                      </div>
                    )}

                    {/* Categories */}
                    {report.categories && typeof report.categories === 'object' && (
                      <div className="p-3 rounded-lg border bg-card">
                        <span className="text-xs text-muted-foreground">{t('report.categories.title')}</span>
                        <div className="mt-2 space-y-2">
                          {Object.entries(report.categories)
                            .filter(([, cat]) => cat?.score != null)
                            .map(([key, cat]) => (
                              <div key={key} className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="text-xs">{cat.name || categoryLabels[key as CategoryKey] || key}</span>
                                  <span className="text-xs font-medium">{cat.score}</span>
                                </div>
                                <div className="w-full h-1 rounded-full bg-muted overflow-hidden">
                                  <div
                                    className={cn(
                                      "h-full rounded-full",
                                      cat.score >= 70 ? "bg-green-500" : cat.score >= 50 ? "bg-yellow-500" : "bg-red-500"
                                    )}
                                    style={{ width: `${cat.score}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <ExpertPanel
                    countrySlug={country.slug}
                    activeGuests={activeGuests.map((guest) => ({
                      ...guest,
                      name: guest.id === currentUserSessionId ? `${guest.name} (${t('report.discussion.you')})` : guest.name,
                    }))}
                  />
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
