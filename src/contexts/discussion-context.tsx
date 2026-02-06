import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
  type ReactNode,
} from "react";
import type {
  PanelDiscussion,
  DiscussionMessage,
  ExpertType,
  DiscussionStatus,
} from "@/types";

// Active guest type
export interface ActiveGuest {
  id: string;
  name: string;
  isOnline: boolean;
  joinedAt?: string;
}

// Generate a random alphanumeric string
function generateRandomId(length: number = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// Generate or retrieve guest ID - persisted in localStorage (survives browser restarts)
function getGuestId(): string {
  const key = "discussion_guest_id";
  let guestId = localStorage.getItem(key);
  if (!guestId) {
    // Generate a unique guest ID like "guest_a1b2c3d4"
    guestId = `guest_${generateRandomId(8)}`;
    localStorage.setItem(key, guestId);
  }
  return guestId;
}

// Get or set user name - persisted in localStorage
function getUserName(): string {
  const key = "discussion_user_name";
  let name = localStorage.getItem(key);
  if (!name) {
    // Generate a readable guest name like "Guest_abc123"
    name = `Guest_${generateRandomId(6)}`;
    localStorage.setItem(key, name);
  }
  return name;
}

interface TypingIndicator {
  participant: ExpertType;
  participantName: string;
}

interface StreamingMessage {
  participant: ExpertType;
  participantName: string;
  content: string;
}

// Connection state for UI feedback
type ConnectionState = "connected" | "connecting" | "reconnecting" | "disconnected";

interface DiscussionContextType {
  discussion: PanelDiscussion | null;
  messages: DiscussionMessage[];
  translatedMessages: DiscussionMessage[] | null;
  translatedDiscussion: PanelDiscussion | null;
  activeGuests: ActiveGuest[];
  currentUserSessionId: string;
  isConnected: boolean;
  connectionState: ConnectionState;
  isLoading: boolean;
  isSending: boolean;
  isAutoDiscussing: boolean;
  isTranslating: boolean;
  error: string | null;
  typingIndicator: TypingIndicator | null;
  streamingMessage: StreamingMessage | null;

  // Actions
  startDiscussion: (reportSlug: string) => Promise<boolean>;
  loadHistory: (reportSlug: string) => Promise<void>;
  loadTranslation: (reportSlug: string, lang: string) => Promise<void>;
  clearTranslation: () => void;
  sendMessage: (
    reportSlug: string,
    content: string,
    targetExpert?: ExpertType
  ) => Promise<void>;
  sendMessageStream: (
    reportSlug: string,
    content: string,
    targetExpert?: ExpertType,
    replyToId?: number
  ) => Promise<void>;
  startAutoDiscussion: (reportSlug: string, rounds?: number) => Promise<void>;
  stopAutoDiscussion: () => void;
  concludeDiscussion: (reportSlug: string) => Promise<void>;
  reset: () => void;
}

// Type definitions for API responses
interface StartDiscussionResponse {
  discussionId: number;
  status: string;
  startedAt: string;
  isExisting: boolean;
}

interface DiscussionHistoryResponse {
  discussion: PanelDiscussion;
  messages: DiscussionMessage[];
}

interface SendMessageResponse {
  userMessage: DiscussionMessage;
  aiResponses: DiscussionMessage[];
}

interface ConcludeDiscussionResponse {
  status: string;
  summary: string;
  concludedAt: string;
}

interface ErrorResponse {
  error?: string;
}

interface TranslationResponse {
  translated: boolean;
  language: string;
  discussion: PanelDiscussion;
  messages: DiscussionMessage[];
}

interface SSEEvent {
  type: string;
  message?: DiscussionMessage;
  participant?: ExpertType;
  participantName?: string;
  fullContent?: string;
  error?: string;
}

// WebSocket message types
interface WSMessage {
  type: string;
  message?: DiscussionMessage;
  participant?: ActiveGuest | ExpertType;
  participantName?: string;
  fullContent?: string;
  participants?: ActiveGuest[];
  sessionId?: string;
  name?: string;
}

// Type guard for ActiveGuest
function isActiveGuest(p: ActiveGuest | ExpertType | undefined): p is ActiveGuest {
  return typeof p === "object" && p !== null && "id" in p;
}

const DiscussionContext = createContext<DiscussionContextType | null>(null);

// WebSocket reconnection settings
const WS_RECONNECT_BASE_DELAY_MS = 1000;
const WS_RECONNECT_MAX_DELAY_MS = 30000;
const WS_MAX_RECONNECT_ATTEMPTS = 10;
const WS_PING_INTERVAL_MS = 25000;
const WS_PONG_TIMEOUT_MS = 10000;

// Silent refresh settings (like Telegram's background sync)
const SILENT_REFRESH_INTERVAL_MS = 10000; // Check for new messages every 10s
const SILENT_REFRESH_ON_FOCUS_DELAY_MS = 500; // Delay after tab focus before refresh

// Message queue item for offline/reconnecting states
interface QueuedMessage {
  reportSlug: string;
  content: string;
  targetExpert?: ExpertType;
  replyToId?: number;
  timestamp: number;
}

export function DiscussionProvider({ children }: { children: ReactNode }) {
  const [discussion, setDiscussion] = useState<PanelDiscussion | null>(null);
  const [messages, setMessages] = useState<DiscussionMessage[]>([]);
  const [translatedMessages, setTranslatedMessages] = useState<DiscussionMessage[] | null>(null);
  const [translatedDiscussion, setTranslatedDiscussion] = useState<PanelDiscussion | null>(null);
  const [activeGuests, setActiveGuests] = useState<ActiveGuest[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<ConnectionState>("disconnected");
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [typingIndicator, setTypingIndicator] = useState<TypingIndicator | null>(
    null
  );
  const [streamingMessage, setStreamingMessage] =
    useState<StreamingMessage | null>(null);
  const [isAutoDiscussing, setIsAutoDiscussing] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);
  const autoDiscussAbortRef = useRef<boolean>(false);
  const currentSlugRef = useRef<string | null>(null);
  const lastMessageIdRef = useRef<number>(0);
  // Track seen message IDs synchronously to prevent race conditions
  const seenMessageIdsRef = useRef<Set<number>>(new Set());
  // Message queue for offline/reconnecting states
  const messageQueueRef = useRef<QueuedMessage[]>([]);
  // Track if we're currently processing the queue
  const isProcessingQueueRef = useRef(false);

  // Helper to add a message, preventing duplicates using synchronous ref check
  const addMessageIfNew = useCallback((message: DiscussionMessage) => {
    // Check synchronously before React state update
    if (seenMessageIdsRef.current.has(message.id)) {
      return; // Already seen, skip
    }
    // Mark as seen immediately (synchronous)
    seenMessageIdsRef.current.add(message.id);
    // Update state - insert in correct position to maintain order by ID
    setMessages((prev: DiscussionMessage[]) => {
      const lastMessage = prev[prev.length - 1];
      // If message ID is greater than last, just append (most common case)
      if (prev.length === 0 || !lastMessage || message.id > lastMessage.id) {
        return [...prev, message];
      }
      // Otherwise insert in correct sorted position
      const newMessages = [...prev, message];
      newMessages.sort((a, b) => a.id - b.id);
      return newMessages;
    });
    // Update last message ID
    lastMessageIdRef.current = Math.max(lastMessageIdRef.current, message.id);
  }, []);

  // WebSocket refs
  const wsRef = useRef<WebSocket | null>(null);
  const wsReconnectAttemptsRef = useRef(0);
  const wsReconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsPingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wsPongTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wsIntentionalCloseRef = useRef(false);

  // Silent refresh refs (Telegram-style background sync)
  const silentRefreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silentRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isSilentRefreshingRef = useRef(false);
  const visibilityCleanupRef = useRef<(() => void) | null>(null);

  // Guest identity - persisted in localStorage
  const guestId = useRef(getGuestId());
  const userName = useRef(getUserName());

  // Track history-based guests separately so we can merge them with WebSocket participants
  const historyGuestsRef = useRef<ActiveGuest[]>([]);

  // Extract guest participants from messages (for guests who sent messages but may be offline)
  const extractGuestsFromMessages = useCallback((msgs: DiscussionMessage[]): ActiveGuest[] => {
    const guestMap = new Map<string, ActiveGuest>();

    for (const msg of msgs) {
      // Only look at user messages (not AI experts or moderator)
      if (msg.participantType !== "user") continue;
      if (msg.participantName === "Moderator") continue;

      // Get guestId from message metadata or top-level
      const messageGuestId = (msg as { guestId?: string }).guestId ||
        (msg.metadata as { guestId?: string } | undefined)?.guestId;

      if (messageGuestId && !guestMap.has(messageGuestId)) {
        guestMap.set(messageGuestId, {
          id: messageGuestId,
          name: msg.participantName,
          isOnline: false, // Will be updated when merged with WebSocket participants
          joinedAt: msg.createdAt,
        });
      }
    }

    return Array.from(guestMap.values());
  }, []);

  // Merge WebSocket participants with message-based guests
  const mergeGuestsWithHistory = useCallback((wsParticipants: ActiveGuest[], historyGuests: ActiveGuest[]): ActiveGuest[] => {
    const merged = new Map<string, ActiveGuest>();

    // Add history guests first (offline by default)
    for (const guest of historyGuests) {
      merged.set(guest.id, { ...guest, isOnline: false });
    }

    // Add/update with WebSocket participants (online)
    for (const participant of wsParticipants) {
      const existing = merged.get(participant.id);
      if (existing) {
        // Update existing with online status and potentially newer name
        merged.set(participant.id, { ...existing, ...participant, isOnline: true });
      } else {
        merged.set(participant.id, { ...participant, isOnline: true });
      }
    }

    // Sort: online first, then by joinedAt
    return Array.from(merged.values()).sort((a, b) => {
      if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
      return (a.joinedAt || "").localeCompare(b.joinedAt || "");
    });
  }, []);

  // Handle WebSocket messages
  const handleWSMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data) as WSMessage;
      console.log("[WS] Received message:", data.type, data);

      switch (data.type) {
        case "participants_list":
          if (data.participants) {
            console.log("[WS] participants_list received:", data.participants);
            // Merge WebSocket participants with history guests
            const wsParticipants: ActiveGuest[] = data.participants!.map((p: ActiveGuest) => ({
              ...p,
              isOnline: true,
            }));
            const merged = mergeGuestsWithHistory(wsParticipants, historyGuestsRef.current);
            console.log("[WS] Merged guests:", merged);
            setActiveGuests(merged);
          }
          break;

        case "participant_joined":
          console.log("[WS] participant_joined:", data.participant);
          if (data.participant && isActiveGuest(data.participant)) {
            const guest = { ...data.participant, isOnline: true };
            setActiveGuests((prev) => {
              console.log("[WS] Adding guest to prev:", prev, "new guest:", guest);
              // Check if already exists
              const existing = prev.find((p) => p.id === guest.id);
              if (existing) {
                // Update to online status
                return prev.map((p) => p.id === guest.id ? { ...p, ...guest, isOnline: true } : p);
              }
              // Add new guest and re-sort (online first)
              const updated = [...prev, guest];
              return updated.sort((a, b) => {
                if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                return (a.joinedAt || "").localeCompare(b.joinedAt || "");
              });
            });
          }
          break;

        case "participant_left":
          if (data.sessionId) {
            setActiveGuests((prev) => {
              // Check if this guest has sent messages (is in history)
              const isInHistory = historyGuestsRef.current.some((g) => g.id === data.sessionId);
              if (isInHistory) {
                // Mark as offline instead of removing
                const updated = prev.map((p) =>
                  p.id === data.sessionId ? { ...p, isOnline: false } : p
                );
                // Re-sort: online first
                return updated.sort((a, b) => {
                  if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
                  return (a.joinedAt || "").localeCompare(b.joinedAt || "");
                });
              }
              // Guest never sent messages, just remove them
              return prev.filter((p) => p.id !== data.sessionId);
            });
          }
          break;

        case "participant_updated":
          // Handle name updates for existing participants
          if (data.participant && isActiveGuest(data.participant)) {
            const updated = data.participant;
            setActiveGuests((prev) =>
              prev.map((p: ActiveGuest) =>
                p.id === updated.id ? { ...p, name: updated.name || p.name, isOnline: true } : p
              )
            );
          }
          break;

        case "new_message":
          if (data.message) {
            // Clear streaming message since final message arrived
            setStreamingMessage(null);
            setTypingIndicator(null);
            addMessageIfNew(data.message);
          }
          break;

        case "typing":
          // AI expert typing indicator from another user's request
          if (data.participant && data.participantName && typeof data.participant === "string") {
            setTypingIndicator({
              participant: data.participant as ExpertType,
              participantName: data.participantName,
            });
            setStreamingMessage(null);
          }
          break;

        case "ai_chunk":
          // AI streaming chunk from another user's request
          if (data.participant && data.participantName && data.fullContent && typeof data.participant === "string") {
            setTypingIndicator(null);
            setStreamingMessage({
              participant: data.participant as ExpertType,
              participantName: data.participantName,
              content: data.fullContent,
            });
          }
          break;

        case "user_typing":
          // Could show user typing indicator if needed
          break;

        case "user_stop_typing":
          break;

        case "pong":
          // Keep-alive response received - clear timeout
          if (wsPongTimeoutRef.current) {
            clearTimeout(wsPongTimeoutRef.current);
            wsPongTimeoutRef.current = null;
          }
          break;
      }
    } catch (err) {
      console.error("Error parsing WebSocket message:", err);
    }
  }, [addMessageIfNew]);

  // Refresh participants list from the Durable Object
  // Merges WebSocket participants with history-based guests
  const refreshParticipants = useCallback(async () => {
    const slug = currentSlugRef.current;
    if (!slug) return;

    try {
      // In development, use wrangler dev server on port 8787
      const isDev = window.location.hostname === "localhost" && window.location.port === "5173";
      const baseUrl = isDev ? "http://localhost:8787" : "";
      const response = await fetch(`${baseUrl}/api/discussion/${slug}/participants`);
      if (!response.ok) return;

      const data = (await response.json()) as { participants: ActiveGuest[] };
      if (data.participants) {
        const wsParticipants: ActiveGuest[] = data.participants.map((p: ActiveGuest) => ({ ...p, isOnline: true }));
        const merged = mergeGuestsWithHistory(wsParticipants, historyGuestsRef.current);
        setActiveGuests(merged);
      }
    } catch (err) {
      console.debug("Failed to refresh participants:", err);
    }
  }, [mergeGuestsWithHistory]);

  // Silent refresh - fetch new messages from server without UI indication
  // This catches any messages that might have been missed due to WebSocket race conditions
  const silentRefresh = useCallback(async () => {
    const slug = currentSlugRef.current;
    if (!slug || isSilentRefreshingRef.current) return;

    isSilentRefreshingRef.current = true;

    try {
      // Fetch only messages newer than our last known message
      const afterId = lastMessageIdRef.current;
      const url = afterId > 0
        ? `/api/discussion/${slug}/history?after=${afterId}`
        : `/api/discussion/${slug}/history`;

      const response = await fetch(url);
      if (!response.ok) return;

      const data = (await response.json()) as DiscussionHistoryResponse;

      // Silently add any new messages we don't have
      if (data.messages && data.messages.length > 0) {
        for (const msg of data.messages) {
          addMessageIfNew(msg);
        }
      }

      // Also refresh participants list to catch any missed join/leave events
      await refreshParticipants();
    } catch (err) {
      // Silent failure - don't disrupt the user
      console.debug("Silent refresh failed:", err);
    } finally {
      isSilentRefreshingRef.current = false;
    }
  }, [addMessageIfNew, refreshParticipants]);

  // Start silent refresh interval
  const startSilentRefresh = useCallback(() => {
    // Clear any existing interval
    if (silentRefreshIntervalRef.current) {
      clearInterval(silentRefreshIntervalRef.current);
    }

    // Clean up previous visibility listener if any
    if (visibilityCleanupRef.current) {
      visibilityCleanupRef.current();
      visibilityCleanupRef.current = null;
    }

    // Start periodic silent refresh
    silentRefreshIntervalRef.current = setInterval(() => {
      silentRefresh();
    }, SILENT_REFRESH_INTERVAL_MS);

    // Also refresh on tab/window focus (user coming back to the app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Small delay to let WebSocket reconnect first if needed
        if (silentRefreshTimeoutRef.current) {
          clearTimeout(silentRefreshTimeoutRef.current);
        }
        silentRefreshTimeoutRef.current = setTimeout(() => {
          silentRefresh();
        }, SILENT_REFRESH_ON_FOCUS_DELAY_MS);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Store cleanup function
    visibilityCleanupRef.current = () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [silentRefresh]);

  // Stop silent refresh interval
  const stopSilentRefresh = useCallback(() => {
    if (silentRefreshIntervalRef.current) {
      clearInterval(silentRefreshIntervalRef.current);
      silentRefreshIntervalRef.current = null;
    }
    if (silentRefreshTimeoutRef.current) {
      clearTimeout(silentRefreshTimeoutRef.current);
      silentRefreshTimeoutRef.current = null;
    }
    // Clean up visibility listener
    if (visibilityCleanupRef.current) {
      visibilityCleanupRef.current();
      visibilityCleanupRef.current = null;
    }
  }, []);

  // Process queued messages when connection is restored
  const processMessageQueue = useCallback(async () => {
    if (isProcessingQueueRef.current || messageQueueRef.current.length === 0) {
      return;
    }

    isProcessingQueueRef.current = true;

    while (messageQueueRef.current.length > 0) {
      const queuedMessage = messageQueueRef.current[0];

      // Safety check
      if (!queuedMessage) {
        messageQueueRef.current.shift();
        continue;
      }

      // Skip messages older than 5 minutes
      if (Date.now() - queuedMessage.timestamp > 5 * 60 * 1000) {
        messageQueueRef.current.shift();
        continue;
      }

      // Check if still connected
      if (wsRef.current?.readyState !== WebSocket.OPEN) {
        break;
      }

      try {
        // Send the queued message via HTTP (the SSE stream will handle it)
        const response = await fetch(
          `/api/discussion/${queuedMessage.reportSlug}/message/stream`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              content: queuedMessage.content,
              targetExpert: queuedMessage.targetExpert,
              replyToId: queuedMessage.replyToId,
              guestId: guestId.current,
              guestName: userName.current,
            }),
          }
        );

        if (response.ok) {
          // Successfully sent, remove from queue
          messageQueueRef.current.shift();

          // Process the SSE response (simplified - just drain it)
          const reader = response.body?.getReader();
          if (reader) {
            while (true) {
              const { done } = await reader.read();
              if (done) break;
            }
          }
        } else {
          // Failed, keep in queue and retry later
          console.error("Failed to send queued message, will retry");
          break;
        }
      } catch (err) {
        console.error("Error processing queued message:", err);
        break;
      }
    }

    isProcessingQueueRef.current = false;
  }, []);

  // Connect to WebSocket
  const connectWebSocket = useCallback((reportSlug: string, isReconnect = false) => {
    // Reset intentional close flag since we're connecting
    wsIntentionalCloseRef.current = false;

    // Update connection state
    setConnectionState(isReconnect ? "reconnecting" : "connecting");

    // Close existing connection
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    // Clear any pending reconnect timeout
    if (wsReconnectTimeoutRef.current) {
      clearTimeout(wsReconnectTimeoutRef.current);
      wsReconnectTimeoutRef.current = null;
    }

    // Clear ping interval
    if (wsPingIntervalRef.current) {
      clearInterval(wsPingIntervalRef.current);
      wsPingIntervalRef.current = null;
    }

    // Clear pong timeout
    if (wsPongTimeoutRef.current) {
      clearTimeout(wsPongTimeoutRef.current);
      wsPongTimeoutRef.current = null;
    }

    // Build WebSocket URL
    // In development, connect to wrangler dev server on port 8787
    // In production, use the same host
    const isDev = import.meta.env.DEV;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = isDev ? "localhost:8787" : window.location.host;
    const wsPath = `/api/discussion/${reportSlug}/ws?sessionId=${encodeURIComponent(guestId.current)}&name=${encodeURIComponent(userName.current)}`;
    const wsUrl = `${protocol}//${wsHost}${wsPath}`;

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log("WebSocket connected");
        wsReconnectAttemptsRef.current = 0;
        setIsConnected(true);
        setConnectionState("connected");

        // Request participants list now that WebSocket handlers are set up
        // This avoids the race condition where server sends participants_list
        // before our onmessage handler is attached
        ws.send(JSON.stringify({ type: "get_participants" }));

        // Process any queued messages
        processMessageQueue();

        // Start silent refresh for Telegram-style background sync
        startSilentRefresh();

        // Do an immediate silent refresh to catch any messages missed during reconnect
        silentRefresh();

        // Start ping interval to keep connection alive with pong timeout detection
        wsPingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: "ping" }));

            // Set timeout for pong response - if no pong received, connection may be dead
            wsPongTimeoutRef.current = setTimeout(() => {
              console.warn("WebSocket pong timeout - connection may be dead");
              // Force close and reconnect
              if (ws.readyState === WebSocket.OPEN) {
                ws.close(4000, "Pong timeout");
              }
            }, WS_PONG_TIMEOUT_MS);
          }
        }, WS_PING_INTERVAL_MS);
      };

      ws.onmessage = handleWSMessage;

      ws.onclose = (event) => {
        console.log("WebSocket closed:", event.code, event.reason);
        setIsConnected(false);

        // Stop silent refresh when disconnected
        stopSilentRefresh();

        // Clear ping interval
        if (wsPingIntervalRef.current) {
          clearInterval(wsPingIntervalRef.current);
          wsPingIntervalRef.current = null;
        }

        // Clear pong timeout
        if (wsPongTimeoutRef.current) {
          clearTimeout(wsPongTimeoutRef.current);
          wsPongTimeoutRef.current = null;
        }

        // Attempt reconnection if not intentionally closed
        if (
          currentSlugRef.current &&
          wsReconnectAttemptsRef.current < WS_MAX_RECONNECT_ATTEMPTS &&
          !wsIntentionalCloseRef.current
        ) {
          setConnectionState("reconnecting");
          wsReconnectAttemptsRef.current++;
          // Exponential backoff with jitter
          const baseDelay = WS_RECONNECT_BASE_DELAY_MS * Math.pow(2, wsReconnectAttemptsRef.current - 1);
          const jitter = Math.random() * 500;
          const delay = Math.min(baseDelay + jitter, WS_RECONNECT_MAX_DELAY_MS);
          console.log(`WebSocket reconnecting in ${Math.round(delay)}ms (attempt ${wsReconnectAttemptsRef.current}/${WS_MAX_RECONNECT_ATTEMPTS})`);

          wsReconnectTimeoutRef.current = setTimeout(() => {
            if (currentSlugRef.current && !wsIntentionalCloseRef.current) {
              connectWebSocket(currentSlugRef.current, true);
            }
          }, delay);
        } else {
          setConnectionState("disconnected");
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      wsRef.current = ws;
    } catch (err) {
      console.error("Failed to create WebSocket:", err);
      setConnectionState("disconnected");
    }
  }, [handleWSMessage, processMessageQueue, startSilentRefresh, stopSilentRefresh, silentRefresh]);

  // Disconnect WebSocket
  const disconnectWebSocket = useCallback(() => {
    // Mark as intentional close to prevent reconnection
    wsIntentionalCloseRef.current = true;

    // Stop silent refresh
    stopSilentRefresh();

    // Clear any pending reconnect timeout
    if (wsReconnectTimeoutRef.current) {
      clearTimeout(wsReconnectTimeoutRef.current);
      wsReconnectTimeoutRef.current = null;
    }

    if (wsPingIntervalRef.current) {
      clearInterval(wsPingIntervalRef.current);
      wsPingIntervalRef.current = null;
    }

    if (wsPongTimeoutRef.current) {
      clearTimeout(wsPongTimeoutRef.current);
      wsPongTimeoutRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close(1000, "User disconnected"); // Normal closure
      wsRef.current = null;
    }

    wsReconnectAttemptsRef.current = WS_MAX_RECONNECT_ATTEMPTS; // Prevent reconnection
    setIsConnected(false);
    setConnectionState("disconnected");
  }, [stopSilentRefresh]);


  const loadHistoryInternal = async (reportSlug: string) => {
    try {
      const response = await fetch(`/api/discussion/${reportSlug}/history`);
      if (!response.ok) {
        throw new Error("Failed to load discussion history");
      }

      const data = (await response.json()) as DiscussionHistoryResponse;
      setDiscussion(data.discussion);
      setMessages(data.messages);

      // Extract guests from message history
      const historyGuests = extractGuestsFromMessages(data.messages);
      historyGuestsRef.current = historyGuests;

      // Set initial guests from history (will be merged with WebSocket participants later)
      setActiveGuests(historyGuests);

      // Update seen message IDs to prevent duplicates from WebSocket
      for (const msg of data.messages) {
        seenMessageIdsRef.current.add(msg.id);
      }

      // Update last message ID
      if (data.messages.length > 0) {
        lastMessageIdRef.current = Math.max(...data.messages.map((m) => m.id));
      }
    } catch (err) {
      console.error("Error loading history:", err);
    }
  };

  const startDiscussion = useCallback(async (reportSlug: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/discussion/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reportSlug }),
      });

      if (!response.ok) {
        const data = (await response.json()) as ErrorResponse;
        throw new Error(data.error || "Failed to start discussion");
      }

      const data = (await response.json()) as StartDiscussionResponse;
      setDiscussion({
        id: data.discussionId,
        reportSlug,
        status: data.status as DiscussionStatus,
        startedAt: data.startedAt,
      });

      // Store current slug first
      currentSlugRef.current = reportSlug;

      // Connect WebSocket FIRST to catch any real-time messages
      // This ensures we don't miss messages between history load and WS connect
      connectWebSocket(reportSlug);

      // Then load history - messages will be deduplicated by seenMessageIdsRef
      if (data.isExisting) {
        await loadHistoryInternal(reportSlug);
      }

      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start discussion");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [connectWebSocket]);

  const loadHistory = useCallback(async (reportSlug: string) => {
    setIsLoading(true);
    setError(null);

    try {
      await loadHistoryInternal(reportSlug);
      setIsConnected(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load discussion"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadTranslation = useCallback(async (reportSlug: string, lang: string) => {
    if (lang === 'en' || lang.startsWith('en-')) {
      setTranslatedMessages(null);
      setTranslatedDiscussion(null);
      return;
    }

    setIsTranslating(true);

    try {
      const response = await fetch(`/api/discussion/${reportSlug}/translate/${lang}`);
      if (!response.ok) {
        throw new Error("Failed to translate discussion");
      }

      const data = (await response.json()) as TranslationResponse;
      setTranslatedMessages(data.messages);
      setTranslatedDiscussion(data.discussion);
    } catch (err) {
      console.error("Translation error:", err);
      setTranslatedMessages(null);
      setTranslatedDiscussion(null);
    } finally {
      setIsTranslating(false);
    }
  }, []);

  const clearTranslation = useCallback(() => {
    setTranslatedMessages(null);
    setTranslatedDiscussion(null);
  }, []);

  const sendMessage = useCallback(
    async (
      reportSlug: string,
      content: string,
      targetExpert?: ExpertType
    ) => {
      setIsSending(true);
      setError(null);

      try {
        const response = await fetch(`/api/discussion/${reportSlug}/message`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content, targetExpert }),
        });

        if (!response.ok) {
          const data = (await response.json()) as ErrorResponse;
          throw new Error(data.error || "Failed to send message");
        }

        const data = (await response.json()) as SendMessageResponse;

        // Add user message
        setMessages((prev) => [...prev, data.userMessage]);

        // Add AI responses
        for (const aiResponse of data.aiResponses) {
          setMessages((prev) => [...prev, aiResponse]);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send message");
      } finally {
        setIsSending(false);
      }
    },
    []
  );

  const sendMessageStream = useCallback(
    async (
      reportSlug: string,
      content: string,
      targetExpert?: ExpertType,
      replyToId?: number
    ) => {
      // If disconnected, queue the message for later
      if (connectionState === "disconnected" || connectionState === "reconnecting") {
        messageQueueRef.current.push({
          reportSlug,
          content,
          targetExpert,
          replyToId,
          timestamp: Date.now(),
        });
        setError("Message queued - will send when reconnected");
        return;
      }

      setIsSending(true);
      setError(null);
      setTypingIndicator(null);
      setStreamingMessage(null);

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      // Retry logic for transient failures
      const maxRetries = 3;
      let lastError: Error | null = null;

      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          const response = await fetch(
            `/api/discussion/${reportSlug}/message/stream`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                content,
                targetExpert,
                replyToId,
                guestId: guestId.current,
                guestName: userName.current,
              }),
              signal: abortControllerRef.current.signal,
            }
          );

          if (!response.ok) {
            const data = (await response.json()) as ErrorResponse;
            throw new Error(data.error || "Failed to send message");
          }

          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let buffer = "";

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            // Decode chunk and add to buffer
            buffer += decoder.decode(value, { stream: true });

            // SSE events are separated by double newlines
            const parts = buffer.split("\n\n");
            // Keep the last incomplete part in buffer
            buffer = parts.pop() || "";

            for (const eventBlock of parts) {
              // Skip empty blocks and heartbeat comments
              const trimmed = eventBlock.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;

              // Parse SSE event block - find the data line
              const lines = trimmed.split("\n");
              const dataLine = lines.find(line => line.startsWith("data:"));
              if (!dataLine) continue;

              // Extract JSON after "data:" (handle both "data: " and "data:")
              const jsonStr = dataLine.startsWith("data: ")
                ? dataLine.slice(6)
                : dataLine.slice(5);

              try {
                const event = JSON.parse(jsonStr) as SSEEvent;

                switch (event.type) {
                  case "user_message":
                    if (event.message) {
                      addMessageIfNew(event.message);
                    }
                    break;

                  case "typing":
                    if (event.participant && event.participantName) {
                      setTypingIndicator({
                        participant: event.participant,
                        participantName: event.participantName,
                      });
                      setStreamingMessage(null);
                    }
                    break;

                  case "ai_chunk":
                    if (event.participant && event.participantName && event.fullContent) {
                      setTypingIndicator(null);
                      setStreamingMessage({
                        participant: event.participant,
                        participantName: event.participantName,
                        content: event.fullContent,
                      });
                    }
                    break;

                  case "ai_complete":
                    setStreamingMessage(null);
                    if (event.message) {
                      addMessageIfNew(event.message);
                    }
                    break;

                  case "ai_error":
                    console.error(
                      `Error from ${event.participant}:`,
                      event.error
                    );
                    break;

                  case "complete":
                    setTypingIndicator(null);
                    setStreamingMessage(null);
                    break;

                  case "error":
                    throw new Error(event.error || "Unknown error");
                }
              } catch (parseError) {
                console.error("Error parsing SSE event:", parseError);
              }
            }
          }

          // Success - break out of retry loop
          lastError = null;
          break;
        } catch (err) {
          if (err instanceof Error && err.name === "AbortError") {
            return;
          }

          lastError = err instanceof Error ? err : new Error("Unknown error");

          // Don't retry on non-transient errors (4xx)
          if (lastError.message.includes("Failed to send message")) {
            break;
          }

          // Wait before retrying (exponential backoff)
          if (attempt < maxRetries - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
          }
        }
      }

      if (lastError) {
        setError(lastError.message);
      }

      setIsSending(false);
      setTypingIndicator(null);
      setStreamingMessage(null);
      abortControllerRef.current = null;
    },
    [addMessageIfNew, connectionState]
  );

  const stopAutoDiscussion = useCallback(() => {
    autoDiscussAbortRef.current = true;
    setIsAutoDiscussing(false);
  }, []);

  const startAutoDiscussion = useCallback(
    async (reportSlug: string, rounds: number = 3) => {
      setIsAutoDiscussing(true);
      setError(null);
      autoDiscussAbortRef.current = false;

      try {
        const response = await fetch(
          `/api/discussion/${reportSlug}/auto-discuss`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rounds }),
          }
        );

        if (!response.ok) {
          const data = (await response.json()) as ErrorResponse;
          throw new Error(data.error || "Failed to start auto discussion");
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error("No response body");
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          if (autoDiscussAbortRef.current) {
            reader.cancel();
            break;
          }

          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (autoDiscussAbortRef.current) break;

            if (line.startsWith("data: ")) {
              const jsonStr = line.slice(6);
              try {
                const event = JSON.parse(jsonStr) as SSEEvent;

                switch (event.type) {
                  case "typing":
                    if (event.participant && event.participantName) {
                      setTypingIndicator({
                        participant: event.participant,
                        participantName: event.participantName,
                      });
                      setStreamingMessage(null);
                    }
                    break;

                  case "ai_chunk":
                    if (event.participant && event.participantName && event.fullContent) {
                      setTypingIndicator(null);
                      setStreamingMessage({
                        participant: event.participant,
                        participantName: event.participantName,
                        content: event.fullContent,
                      });
                    }
                    break;

                  case "ai_complete":
                    setStreamingMessage(null);
                    if (event.message) {
                      addMessageIfNew(event.message);
                    }
                    break;

                  case "round_complete":
                    break;

                  case "complete":
                    setTypingIndicator(null);
                    setStreamingMessage(null);
                    break;

                  case "error":
                    throw new Error(event.error || "Unknown error");
                }
              } catch (parseError) {
                console.error("Error parsing SSE event:", parseError);
              }
            }
          }
        }
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
          return;
        }
        setError(err instanceof Error ? err.message : "Auto discussion failed");
      } finally {
        setIsAutoDiscussing(false);
        setTypingIndicator(null);
        setStreamingMessage(null);
        autoDiscussAbortRef.current = false;
      }
    },
    [addMessageIfNew]
  );

  const concludeDiscussion = useCallback(async (reportSlug: string) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/discussion/${reportSlug}/conclude`, {
        method: "POST",
      });

      if (!response.ok) {
        const data = (await response.json()) as ErrorResponse;
        throw new Error(data.error || "Failed to conclude discussion");
      }

      const data = (await response.json()) as ConcludeDiscussionResponse;
      setDiscussion((prev) =>
        prev
          ? {
              ...prev,
              status: "concluded" as DiscussionStatus,
              concludedAt: data.concludedAt,
              summary: data.summary,
            }
          : null
      );
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to conclude discussion"
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    // Cancel any ongoing stream
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Disconnect WebSocket
    disconnectWebSocket();

    currentSlugRef.current = null;
    // Clear seen message IDs for new session
    seenMessageIdsRef.current.clear();
    // Clear message queue
    messageQueueRef.current = [];
    isProcessingQueueRef.current = false;

    setDiscussion(null);
    setMessages([]);
    setTranslatedMessages(null);
    setTranslatedDiscussion(null);
    setActiveGuests([]);
    setIsConnected(false);
    setConnectionState("disconnected");
    setIsLoading(false);
    setIsSending(false);
    setIsTranslating(false);
    setError(null);
    setTypingIndicator(null);
    setStreamingMessage(null);
    lastMessageIdRef.current = 0;
  }, [disconnectWebSocket]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear reconnect timeout
      if (wsReconnectTimeoutRef.current) {
        clearTimeout(wsReconnectTimeoutRef.current);
        wsReconnectTimeoutRef.current = null;
      }
      disconnectWebSocket();
    };
  }, [disconnectWebSocket]);

  return (
    <DiscussionContext.Provider
      value={{
        discussion,
        messages,
        translatedMessages,
        translatedDiscussion,
        activeGuests,
        currentUserSessionId: guestId.current,
        isConnected,
        connectionState,
        isLoading,
        isSending,
        isAutoDiscussing,
        isTranslating,
        error,
        typingIndicator,
        streamingMessage,
        startDiscussion,
        loadHistory,
        loadTranslation,
        clearTranslation,
        sendMessage,
        sendMessageStream,
        startAutoDiscussion,
        stopAutoDiscussion,
        concludeDiscussion,
        reset,
      }}
    >
      {children}
    </DiscussionContext.Provider>
  );
}

export function useDiscussion() {
  const context = useContext(DiscussionContext);
  if (!context) {
    throw new Error("useDiscussion must be used within DiscussionProvider");
  }
  return context;
}
