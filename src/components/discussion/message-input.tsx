import { useState, useRef, useEffect, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Send, Loader2, X, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { ExpertType, DiscussionMessage } from "@/types";
import { getExpertList } from "@/types";

interface MessageInputProps {
  onSend: (content: string, targetExpert?: ExpertType) => void;
  replyingTo?: DiscussionMessage | null;
  onCancelReply?: () => void;
  disabled?: boolean;
  isSending?: boolean;
  placeholder?: string;
  countrySlug?: string;
}

export function MessageInput({
  onSend,
  replyingTo,
  onCancelReply,
  disabled = false,
  isSending = false,
  placeholder,
  countrySlug,
}: MessageInputProps) {
  const { t } = useTranslation();
  const [content, setContent] = useState("");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionFilter, setMentionFilter] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [cursorPosition, setCursorPosition] = useState(0);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const expertList = useMemo(() => getExpertList(countrySlug), [countrySlug]);

  const filteredExperts = useMemo(() => {
    if (!mentionFilter) return expertList;
    const lower = mentionFilter.toLowerCase();
    return expertList.filter(
      (e) =>
        e.name.toLowerCase().includes(lower) ||
        e.role.toLowerCase().includes(lower)
    );
  }, [mentionFilter, expertList]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  useEffect(() => {
    setMentionIndex(0);
  }, [mentionFilter]);

  // Focus textarea when replying to a message
  useEffect(() => {
    if (replyingTo && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [replyingTo]);

  // Refocus textarea when sending completes (isSending transitions to false)
  const prevIsSendingRef = useRef(isSending);
  const shouldRefocusRef = useRef(false);

  useEffect(() => {
    if (prevIsSendingRef.current && !isSending) {
      // Was sending, now done - mark for refocus
      shouldRefocusRef.current = true;
    }
    prevIsSendingRef.current = isSending;
  }, [isSending]);

  // Separate effect to handle refocus after disabled state clears
  useEffect(() => {
    if (shouldRefocusRef.current && !disabled && !isSending) {
      shouldRefocusRef.current = false;
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        if (textareaRef.current && !textareaRef.current.disabled) {
          textareaRef.current.focus();
        }
      });
    }
  }, [disabled, isSending]);

  const extractMentionedExpert = (text: string): ExpertType | undefined => {
    const lowerText = text.toLowerCase();

    // First check for @mentions (explicit)
    for (const expert of expertList) {
      if (new RegExp(`@${expert.name}`, "i").test(text)) {
        return expert.id;
      }
    }

    // Then check for natural name mentions (e.g., "hello Shifa", "Shifa, can you...")
    // Check each part of the expert's name (first name, last name, etc.)
    for (const expert of expertList) {
      const nameParts = expert.name.split(" ").filter(part =>
        // Skip titles like "Dr." and very short parts
        part.length > 2 && !part.endsWith(".")
      );

      for (const namePart of nameParts) {
        // Use word boundary to match whole words only
        const regex = new RegExp(`\\b${namePart}\\b`, "i");
        if (regex.test(lowerText)) {
          return expert.id;
        }
      }
    }

    return undefined;
  };

  const handleSubmit = () => {
    if (!content.trim() || disabled || isSending) return;
    const messageContent = content.trim();
    const targetExpert = extractMentionedExpert(content);

    // Clear content and menu first
    setContent("");
    setShowMentionMenu(false);

    // Reset textarea height
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }

    // Mark that we should refocus after send completes
    shouldRefocusRef.current = true;

    // Send the message
    onSend(messageContent, targetExpert);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showMentionMenu) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => (i < filteredExperts.length - 1 ? i + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => (i > 0 ? i - 1 : filteredExperts.length - 1));
      } else if (e.key === "Enter" || e.key === "Tab") {
        e.preventDefault();
        if (filteredExperts[mentionIndex]) insertMention(filteredExperts[mentionIndex].name);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setShowMentionMenu(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    const pos = e.target.selectionStart || 0;
    setContent(val);
    setCursorPosition(pos);

    const match = val.slice(0, pos).match(/@(\w*)$/);
    if (match) {
      setShowMentionMenu(true);
      setMentionFilter(match[1] || "");
    } else {
      setShowMentionMenu(false);
      setMentionFilter("");
    }
  };

  const insertMention = (name: string) => {
    const before = content.slice(0, cursorPosition);
    const after = content.slice(cursorPosition);
    const match = before.match(/@(\w*)$/);
    if (match) {
      const newBefore = before.slice(0, match.index) + `@${name} `;
      setContent(newBefore + after);
      setShowMentionMenu(false);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(newBefore.length, newBefore.length);
        }
      }, 0);
    }
  };

  return (
    <div className="relative">
      {/* Reply preview - shown when replying to a message */}
      {replyingTo && (
        <div className="flex items-center gap-2 mb-2 px-3 py-2 rounded-xl bg-muted/50 border border-border/50">
          <Reply className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-muted-foreground">
              {t('report.discussion.input.replyingTo', { name: replyingTo.participantName })}
            </p>
            <p className="text-xs text-muted-foreground/70 truncate">
              {replyingTo.content}
            </p>
          </div>
          {onCancelReply && (
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0 text-muted-foreground hover:text-foreground"
              onClick={onCancelReply}
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      )}

      {/* Mention dropdown - positioned above input */}
      {showMentionMenu && filteredExperts.length > 0 && (
        <div className="absolute bottom-full start-0 mb-2 w-64 rounded-xl border bg-popover/95 backdrop-blur-sm shadow-xl z-50 py-1.5 overflow-hidden">
          <div className="px-3 py-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            {t('report.discussion.input.mentionExpert')}
          </div>
          {filteredExperts.map((expert, i) => (
            <button
              key={expert.id}
              className={cn(
                "flex items-center gap-3 w-full px-3 py-2 text-sm transition-colors",
                i === mentionIndex
                  ? "bg-primary/10 text-primary"
                  : "hover:bg-muted/50"
              )}
              onClick={() => insertMention(expert.name)}
              onMouseEnter={() => setMentionIndex(i)}
            >
              <span className="text-base">{expert.emoji}</span>
              <div className="flex flex-col items-start">
                <span className="font-medium">{expert.name}</span>
                <span className="text-[10px] text-muted-foreground">{expert.role}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Modern input container */}
      <div className="flex items-end gap-2 p-1 rounded-2xl bg-muted/30 border border-border/50 focus-within:border-primary/30 focus-within:bg-muted/50 transition-all">
        {/* Textarea */}
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            dir="auto"
            value={content}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder || t('report.discussion.input.placeholder')}
            disabled={disabled || isSending}
            className={cn(
              "min-h-[36px] max-h-[120px] resize-none py-2 px-3",
              "text-base md:text-sm", // 16px on mobile prevents iOS zoom, 14px on desktop
              "bg-transparent border-0 focus-visible:ring-0 focus-visible:ring-offset-0",
              "placeholder:text-muted-foreground/60"
            )}
            rows={1}
          />
        </div>

        {/* Send button */}
        <Button
          size="icon"
          className={cn(
            "h-9 w-9 rounded-xl shrink-0 transition-all",
            content.trim() && !disabled
              ? "bg-primary hover:bg-primary/90 shadow-md"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
          onClick={handleSubmit}
          disabled={!content.trim() || disabled || isSending}
        >
          {isSending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4 rtl:rotate-180" />
          )}
        </Button>
      </div>

      {/* Hint text */}
      <div className="flex items-center justify-center gap-1.5 mt-2">
        <span className="text-[10px] text-muted-foreground/60">
          {t('report.discussion.input.mentionHint')} <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">@</kbd>
        </span>
        <span className="text-muted-foreground/30">·</span>
        <span className="text-[10px] text-muted-foreground/60">
          <kbd className="px-1 py-0.5 rounded bg-muted text-[9px] font-mono">Enter</kbd> {t('report.discussion.input.toSend')}
        </span>
      </div>
    </div>
  );
}
