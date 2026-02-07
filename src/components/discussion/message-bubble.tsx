import { useState, useEffect } from "react";
import { motion, useMotionValue, useTransform, useAnimation, animate, type PanInfo } from "framer-motion";
import { TrendingUp, Wrench, Scale, Leaf, Users, Settings, Reply, Bot, Copy, Check, MessageCircle, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ExpertAvatar } from "./expert-avatar";
import { MarkdownBlock } from "@/components/ui/markdown";
import { Button } from "@/components/ui/button";
import type { DiscussionMessage, ParticipantType, ExpertType } from "@/types";
import { expertPersonas } from "@/types";

// Swipe threshold to trigger reply (in pixels)
const SWIPE_THRESHOLD = 60;

// Split long messages into multiple chunks for more natural chat flow
function splitMessageIntoChunks(content: string): string[] {
  // Don't split short messages
  if (content.length < 150) {
    return [content];
  }

  const chunks: string[] = [];

  // First, try to split by double newlines (paragraphs)
  const paragraphs = content.split(/\n\n+/);

  for (const paragraph of paragraphs) {
    // If paragraph is short enough, add it as a chunk
    if (paragraph.length < 200) {
      if (paragraph.trim()) {
        chunks.push(paragraph.trim());
      }
      continue;
    }

    // Try to split long paragraphs by sentences
    // Use a more careful approach to avoid splitting on decimals (1.5), abbreviations, etc.
    // Split on . ! ? only when followed by a space and uppercase letter, or end of string
    const sentenceEndings: number[] = [];
    for (let i = 0; i < paragraph.length; i++) {
      const char = paragraph[i];
      if (char === '.' || char === '!' || char === '?') {
        // Check if this is a decimal number (digit before and after the period)
        if (char === '.') {
          const prevChar = paragraph[i - 1];
          const nextChar = paragraph[i + 1];
          // Skip if it's a decimal number (e.g., 1.5, 3.14)
          if (prevChar && nextChar && /\d/.test(prevChar) && /\d/.test(nextChar)) {
            continue;
          }
          // Skip common abbreviations like "Dr.", "Mr.", "vs.", "e.g.", "i.e."
          const prevTwo = paragraph.slice(Math.max(0, i - 2), i).toLowerCase();
          if (['dr', 'mr', 'ms', 'vs', '.g', '.e'].includes(prevTwo)) {
            continue;
          }
        }
        // Check if followed by space (or end) - marks a sentence boundary
        const nextChar = paragraph[i + 1];
        if (!nextChar || nextChar === ' ' || nextChar === '\n') {
          sentenceEndings.push(i + 1);
        }
      }
    }

    // Build sentences from the endings
    const sentences: string[] = [];
    let lastEnd = 0;
    for (const end of sentenceEndings) {
      const sentence = paragraph.slice(lastEnd, end).trim();
      if (sentence) {
        sentences.push(sentence + ' ');
      }
      lastEnd = end;
    }
    // Add any remaining text
    const remaining = paragraph.slice(lastEnd).trim();
    if (remaining) {
      sentences.push(remaining);
    }

    // If no sentences found, use the whole paragraph
    if (sentences.length === 0) {
      sentences.push(paragraph);
    }

    let currentChunk = "";
    for (const sentence of sentences) {
      // If adding this sentence would make chunk too long, start a new chunk
      if (currentChunk.length + sentence.length > 250 && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = sentence;
      } else {
        currentChunk += sentence;
      }
    }

    // Add remaining content
    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }
  }

  // If we couldn't split meaningfully, return original
  if (chunks.length === 0) {
    return [content];
  }

  return chunks;
}

// Affiliation badge with icon only (like Twitter's affiliation badges)
const affiliationBadges: Record<ExpertType, { icon: LucideIcon; bgColor: string }> = {
  ai_economist: { icon: TrendingUp, bgColor: "bg-amber-500" },
  ai_engineer: { icon: Wrench, bgColor: "bg-orange-500" },
  ai_legal: { icon: Scale, bgColor: "bg-purple-500" },
  ai_environmental: { icon: Leaf, bgColor: "bg-green-500" },
  ai_social: { icon: Users, bgColor: "bg-pink-500" },
  ai_operations: { icon: Settings, bgColor: "bg-slate-500" },
  ai_moderator: { icon: MessageCircle, bgColor: "bg-cyan-500" },
};

// Generate consistent color from name
function getColorFromName(name: string): string {
  const colors = [
    "bg-gray-500",
    "bg-green-500",
    "bg-purple-500",
    "bg-orange-500",
    "bg-pink-500",
    "bg-teal-500",
    "bg-indigo-500",
    "bg-rose-500",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length] || "bg-gray-500";
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0] || "")
    .join("")
    .toUpperCase()
    .slice(0, 2) || "?";
}

interface MessageBubbleProps {
  message: DiscussionMessage;
  replyToMessage?: DiscussionMessage;
  isStreaming?: boolean;
  isCurrentUser?: boolean;
  onReply?: (message: DiscussionMessage) => void;
  className?: string;
}

export function MessageBubble({
  message,
  replyToMessage,
  isStreaming = false,
  isCurrentUser = true,
  onReply,
  className,
}: MessageBubbleProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.participantType === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Swipe to reply state
  const x = useMotionValue(0);
  const controls = useAnimation();
  const replyIconOpacity = useTransform(x, [0, SWIPE_THRESHOLD], [0, 1]);
  const replyIconScale = useTransform(x, [0, SWIPE_THRESHOLD], [0.5, 1]);

  // Trigger entry animation on mount
  useEffect(() => {
    controls.start({ opacity: 1, y: 0 });
  }, [controls]);

  const handleDragEnd = (_: unknown, info: PanInfo) => {
    if (info.offset.x >= SWIPE_THRESHOLD && onReply) {
      onReply(message);
    }
    // Always snap back to original position with smooth animation
    animate(x, 0, { type: "spring", stiffness: 500, damping: 30 });
  };
  const expert =
    !isUser && message.participantType !== "user"
      ? expertPersonas[message.participantType as Exclude<ParticipantType, "user">]
      : null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Current user's messages - aligned right with blue bubble
  if (isUser && isCurrentUser) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn("flex justify-end", className)}
      >
        <div className="max-w-[75%]">
          {/* Name first */}
          <div className="flex items-center gap-2 mb-1.5 justify-end">
            <span className="text-sm font-medium text-muted-foreground">
              {message.participantName}
            </span>
          </div>
          {/* Reply context - shows quoted message being replied to */}
          {replyToMessage && (
            <div className="flex items-center justify-end gap-1.5 mb-1.5">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-gray-400/20 dark:bg-gray-500/20 border-e-2 border-gray-400">
                <Reply className="h-3 w-3 text-gray-600 dark:text-gray-400" />
                <span className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                  {replyToMessage.participantName}
                </span>
                <span className="text-xs text-gray-600/70 dark:text-gray-400/70 truncate max-w-[150px]">
                  {replyToMessage.content}
                </span>
              </div>
            </div>
          )}
          <div className={cn(
            "rounded-2xl rounded-ee-sm bg-gray-500 dark:bg-gray-600 px-4 py-3 text-white shadow-sm",
            replyToMessage && "border-s-2 border-gray-300"
          )}>
            <div dir="auto" className="text-sm leading-relaxed">
              <MarkdownBlock className="text-white [&_a]:text-gray-200 [&_a:hover]:text-gray-100">{message.content}</MarkdownBlock>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-1.5 justify-end">
            <p className="text-[11px] text-muted-foreground">
              {formatTime(message.createdAt)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 md:w-auto md:px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {isCopied ? (
                <Check className="h-3 w-3 md:me-1 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 md:me-1" />
              )}
              <span className="hidden md:inline">{isCopied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Other users' messages - aligned left with avatar and distinct color
  if (isUser && !isCurrentUser) {
    const avatarColor = getColorFromName(message.participantName);
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className={cn("flex gap-3", className)}
      >
        <div className="flex-shrink-0 pt-1">
          <div
            className={cn(
              "h-9 w-9 rounded-full flex items-center justify-center text-white text-xs font-medium",
              avatarColor
            )}
          >
            {getInitials(message.participantName)}
          </div>
        </div>

        <div className="max-w-[80%]">
          {/* Name first */}
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-sm font-semibold">
              {message.participantName}
            </span>
            <span className="text-[11px] text-muted-foreground px-1.5 py-0.5 rounded-full bg-muted">
              Guest
            </span>
          </div>

          {/* Reply context - shows quoted message being replied to */}
          {replyToMessage && (
            <div className="flex items-center gap-1.5 mb-2">
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/80 border-s-2 border-slate-400">
                <Reply className="h-3 w-3 text-muted-foreground" />
                <span className="text-xs text-foreground/80 font-medium">
                  {replyToMessage.participantName}
                </span>
                <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                  {replyToMessage.content}
                </span>
              </div>
            </div>
          )}

          <div className={cn(
            "inline-block rounded-2xl rounded-ss-sm px-4 py-3 shadow-sm bg-muted",
            replyToMessage && "border-s-2 border-slate-400"
          )}>
            <div dir="auto" className="text-sm leading-relaxed">
              <MarkdownBlock>{message.content}</MarkdownBlock>
            </div>
          </div>

          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[11px] text-muted-foreground">
              {formatTime(message.createdAt)}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 md:w-auto md:px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={handleCopy}
            >
              {isCopied ? (
                <Check className="h-3 w-3 md:me-1 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 md:me-1" />
              )}
              <span className="hidden md:inline">{isCopied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Expert messages - aligned left with expert avatar
  return (
    <div className={cn("relative overflow-hidden", className)}>
      {/* Swipe reply indicator - visible on mobile */}
      {onReply && (
        <motion.div
          className="absolute start-0 top-1/2 -translate-y-1/2 flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 md:hidden"
          style={{ opacity: replyIconOpacity, scale: replyIconScale }}
        >
          <Reply className="h-4 w-4 text-primary" />
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={controls}
        transition={{ duration: 0.2 }}
        className="flex gap-3 group"
        style={{ x }}
        drag={onReply ? "x" : false}
        dragConstraints={{ left: 0, right: SWIPE_THRESHOLD + 10 }}
        dragElastic={{ left: 0, right: 0.5 }}
        onDragEnd={handleDragEnd}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <div className="flex-shrink-0 pt-1">
          <ExpertAvatar participantType={message.participantType} name={message.participantName} size="md" />
        </div>

        <div className="flex-1 max-w-[80%]">
        {/* Expert header - Name + affiliation icon badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold">
            {message.participantName}
          </span>
          {expert && (() => {
            const badge = affiliationBadges[message.participantType as ExpertType];
            const IconComponent = badge.icon;
            return (
              <>
                <span className={cn("h-4 w-4 rounded flex items-center justify-center", badge.bgColor)}>
                  <IconComponent className="h-2.5 w-2.5 text-white" />
                </span>
                <span className="h-4 w-4 rounded flex items-center justify-center bg-gray-500">
                  <Bot className="h-2.5 w-2.5 text-white" />
                </span>
              </>
            );
          })()}
        </div>
        {/* Expert role */}
        {expert && (
          <p className="text-xs text-muted-foreground mb-1.5">
            {expert.role}
          </p>
        )}

        {/* Reply context - shows quoted message being replied to */}
        {replyToMessage && (
          <div className="flex items-center gap-1.5 mb-2">
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/80 border-s-2 border-primary/50">
              <Reply className="h-3 w-3 text-muted-foreground" />
              <span className="text-xs text-foreground/80 font-medium">
                {replyToMessage.participantName}
              </span>
              <span className="text-xs text-muted-foreground truncate max-w-[200px]">
                {replyToMessage.content}
              </span>
            </div>
          </div>
        )}

        {/* Message content */}
        <div className={cn(
          "rounded-2xl rounded-ss-sm px-4 py-3 shadow-sm bg-muted",
          replyToMessage && "border-s-2 border-primary/30"
        )}>
          <div dir="auto" className="text-sm leading-relaxed">
            <MarkdownBlock>{message.content}</MarkdownBlock>
            {isStreaming && (
              <span className="inline-block w-0.5 h-4 ms-0.5 bg-primary animate-pulse rounded-full" />
            )}
          </div>
        </div>

        {/* Footer with time, copy, and reply button */}
        <div className="flex items-center gap-2 mt-1.5">
          <p className="text-[11px] text-muted-foreground">
            {formatTime(message.createdAt)}
          </p>
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "h-6 w-6 md:w-auto md:px-2 text-[11px] text-muted-foreground hover:text-foreground transition-opacity md:opacity-0 md:group-hover:opacity-100",
              isHovered ? "opacity-100" : "opacity-0"
            )}
            onClick={handleCopy}
          >
            {isCopied ? (
              <Check className="h-3 w-3 md:me-1 text-green-500" />
            ) : (
              <Copy className="h-3 w-3 md:me-1" />
            )}
            <span className="hidden md:inline">{isCopied ? "Copied" : "Copy"}</span>
          </Button>
          {onReply && (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground transition-opacity md:opacity-0 md:group-hover:opacity-100",
                isHovered ? "opacity-100" : "opacity-0"
              )}
              onClick={() => onReply(message)}
            >
              <Reply className="h-3 w-3 me-1" />
              Reply
            </Button>
          )}
        </div>
      </div>
      </motion.div>
    </div>
  );
}

interface StreamingMessageBubbleProps {
  participantType: Exclude<ParticipantType, "user">;
  participantName: string;
  content: string;
}

export function StreamingMessageBubble({
  participantType,
  participantName,
  content,
}: StreamingMessageBubbleProps) {
  const expert = expertPersonas[participantType];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3"
    >
      <div className="flex-shrink-0 pt-1">
        <ExpertAvatar participantType={participantType} name={participantName} size="md" />
      </div>

      <div className="flex-1 max-w-[80%]">
        {/* Expert header - Name + affiliation icon badge */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold">
            {participantName}
          </span>
          {(() => {
            const badge = affiliationBadges[participantType];
            const IconComponent = badge.icon;
            return (
              <>
                <span className={cn("h-4 w-4 rounded flex items-center justify-center", badge.bgColor)}>
                  <IconComponent className="h-2.5 w-2.5 text-white" />
                </span>
                <span className="h-4 w-4 rounded flex items-center justify-center bg-gray-500">
                  <Bot className="h-2.5 w-2.5 text-white" />
                </span>
              </>
            );
          })()}
        </div>
        {/* Expert role */}
        {expert && (
          <p className="text-xs text-muted-foreground mb-1.5">
            {expert.role}
          </p>
        )}

        {/* Message content */}
        <div className="rounded-2xl rounded-ss-sm px-4 py-3 shadow-sm bg-muted">
          <div dir="auto" className="text-sm leading-relaxed">
            <MarkdownBlock>{content}</MarkdownBlock>
            <span className="inline-block w-0.5 h-4 ms-0.5 bg-primary animate-pulse rounded-full" />
          </div>
        </div>
      </div>
    </motion.div>
  );
}

// Single bubble for split expert messages (no avatar/header for continuation bubbles)
interface ExpertBubbleChunkProps {
  content: string;
  isFirst: boolean;
  isLast: boolean;
  participantType: Exclude<ParticipantType, "user">;
  participantName: string;
  createdAt: string;
  index: number;
  onCopy: () => void;
  isCopied: boolean;
}

function ExpertBubbleChunk({
  content,
  isFirst,
  isLast,
  participantType,
  participantName,
  createdAt,
  index,
  onCopy,
  isCopied,
}: ExpertBubbleChunkProps) {
  const expert = expertPersonas[participantType];

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.15 }}
      className={cn("flex gap-3", !isFirst && "mt-2")}
    >
      {/* Avatar column - only show avatar for first chunk */}
      <div className="flex-shrink-0 w-9">
        {isFirst ? (
          <div className="pt-1">
            <ExpertAvatar participantType={participantType} name={participantName} size="md" />
          </div>
        ) : null}
      </div>

      <div className="max-w-[80%]">
        {/* Header only for first chunk */}
        {isFirst && (
          <>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold">{participantName}</span>
              {expert && (() => {
                const badge = affiliationBadges[participantType];
                const IconComponent = badge.icon;
                return (
                  <>
                    <span className={cn("h-4 w-4 rounded flex items-center justify-center", badge.bgColor)}>
                      <IconComponent className="h-2.5 w-2.5 text-white" />
                    </span>
                    <span className="h-4 w-4 rounded flex items-center justify-center bg-gray-500">
                      <Bot className="h-2.5 w-2.5 text-white" />
                    </span>
                  </>
                );
              })()}
            </div>
            {expert && (
              <p className="text-xs text-muted-foreground mb-1.5">{expert.role}</p>
            )}
          </>
        )}

        {/* Message bubble */}
        <div className={cn(
          "inline-block rounded-2xl px-4 py-2.5 shadow-sm bg-muted",
          isFirst && "rounded-ss-sm"
        )}>
          <div dir="auto" className="text-sm leading-relaxed">
            <MarkdownBlock>{content}</MarkdownBlock>
          </div>
        </div>

        {/* Time and copy only on last chunk */}
        {isLast && (
          <div className="flex items-center gap-2 mt-1.5">
            <p className="text-[11px] text-muted-foreground">{formatTime(createdAt)}</p>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 md:w-auto md:px-2 text-[11px] text-muted-foreground hover:text-foreground"
              onClick={onCopy}
            >
              {isCopied ? (
                <Check className="h-3 w-3 md:me-1 text-green-500" />
              ) : (
                <Copy className="h-3 w-3 md:me-1" />
              )}
              <span className="hidden md:inline">{isCopied ? "Copied" : "Copy"}</span>
            </Button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// Wrapper component that splits expert messages into multiple bubbles
interface SplitMessageBubbleProps {
  message: DiscussionMessage;
  replyToMessage?: DiscussionMessage;
  isCurrentUser?: boolean;
  onReply?: (message: DiscussionMessage) => void;
  className?: string;
}

export function SplitMessageBubble({
  message,
  replyToMessage,
  isCurrentUser = true,
  onReply,
  className,
}: SplitMessageBubbleProps) {
  const [isCopied, setIsCopied] = useState(false);
  const isUser = message.participantType === "user";

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // Only split expert messages, not user messages
  if (isUser) {
    return (
      <MessageBubble
        message={message}
        replyToMessage={replyToMessage}
        isCurrentUser={isCurrentUser}
        onReply={onReply}
        className={className}
      />
    );
  }

  // Split expert message into chunks
  const chunks = splitMessageIntoChunks(message.content);

  // If only one chunk, use regular MessageBubble
  if (chunks.length === 1) {
    return (
      <MessageBubble
        message={message}
        replyToMessage={replyToMessage}
        onReply={onReply}
        className={className}
      />
    );
  }

  // Render multiple bubbles for split message
  return (
    <div className={className}>
      {/* Reply context only shown once at the top */}
      {replyToMessage && (
        <div className="flex items-center gap-1.5 mb-2 ms-12">
          <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted/80 border-s-2 border-primary/50">
            <Reply className="h-3 w-3 text-muted-foreground" />
            <span className="text-xs text-foreground/80 font-medium">
              {replyToMessage.participantName}
            </span>
            <span className="text-xs text-muted-foreground truncate max-w-[200px]">
              {replyToMessage.content}
            </span>
          </div>
        </div>
      )}

      {chunks.map((chunk, index) => (
        <ExpertBubbleChunk
          key={`${message.id}-chunk-${index}`}
          content={chunk}
          isFirst={index === 0}
          isLast={index === chunks.length - 1}
          participantType={message.participantType as Exclude<ParticipantType, "user">}
          participantName={message.participantName}
          createdAt={message.createdAt}
          index={index}
          onCopy={handleCopy}
          isCopied={isCopied}
        />
      ))}

      {/* Reply button after all chunks */}
      {onReply && (
        <div className="ms-12 mt-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground opacity-0 hover:opacity-100 transition-opacity"
            onClick={() => onReply(message)}
          >
            <Reply className="h-3 w-3 me-1" />
            Reply
          </Button>
        </div>
      )}
    </div>
  );
}
