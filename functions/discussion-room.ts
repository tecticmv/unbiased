/**
 * Discussion Room Durable Object
 * Handles WebSocket connections for real-time discussion features
 */

interface Participant {
  sessionId: string;
  name: string;
  websocket: WebSocket;
  joinedAt: Date;
}

interface WebSocketMessage {
  type: string;
  [key: string]: unknown;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Env = any;

export class DiscussionRoom {
  private state: DurableObjectState;
  private participants: Map<string, Participant> = new Map();

  constructor(state: DurableObjectState, _env: Env) {
    this.state = state;
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // WebSocket upgrade
    if (path.endsWith("/ws")) {
      return this.handleWebSocket(request, url);
    }

    // Broadcast endpoint (called by API)
    if (path.endsWith("/broadcast") && request.method === "POST") {
      return this.handleBroadcast(request);
    }

    // Get participants (HTTP fallback)
    if (path.endsWith("/participants") && request.method === "GET") {
      return this.handleGetParticipants();
    }

    return new Response("Not Found", { status: 404 });
  }

  private async handleWebSocket(request: Request, url: URL): Promise<Response> {
    const upgradeHeader = request.headers.get("Upgrade");
    if (upgradeHeader !== "websocket") {
      return new Response("Expected WebSocket", { status: 426 });
    }

    const sessionId = url.searchParams.get("sessionId") || crypto.randomUUID();
    const name = url.searchParams.get("name") || "Guest";

    const { 0: client, 1: server } = new WebSocketPair();

    // Accept the WebSocket connection
    this.state.acceptWebSocket(server);

    // Store participant info
    const participant: Participant = {
      sessionId,
      name,
      websocket: server,
      joinedAt: new Date(),
    };
    this.participants.set(sessionId, participant);

    // Send current participants list to the new connection
    const participantsList = Array.from(this.participants.values()).map((p) => ({
      id: p.sessionId,
      sessionId: p.sessionId,
      name: p.name,
      joinedAt: p.joinedAt.toISOString(),
    }));

    server.send(
      JSON.stringify({
        type: "participants_list",
        participants: participantsList,
      })
    );

    // Notify all other participants about the new join
    this.broadcast(
      {
        type: "participant_joined",
        participant: {
          id: sessionId,
          sessionId,
          name,
          joinedAt: participant.joinedAt.toISOString(),
        },
      },
      sessionId // Exclude the new participant
    );

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer): Promise<void> {
    try {
      const data =
        typeof message === "string" ? JSON.parse(message) : JSON.parse(new TextDecoder().decode(message));

      switch (data.type) {
        case "ping":
          ws.send(JSON.stringify({ type: "pong" }));
          break;

        case "get_participants":
          // Client explicitly requesting participants list (after onmessage handler is set up)
          // This avoids the race condition where we send before client is ready
          const participantsList = Array.from(this.participants.values()).map((p) => ({
            id: p.sessionId,
            sessionId: p.sessionId,
            name: p.name,
            joinedAt: p.joinedAt.toISOString(),
          }));
          ws.send(
            JSON.stringify({
              type: "participants_list",
              participants: participantsList,
            })
          );
          break;

        case "update_name":
          // Find the participant by websocket
          for (const [sessionId, participant] of this.participants.entries()) {
            if (participant.websocket === ws) {
              participant.name = data.name;
              this.broadcast({
                type: "participant_updated",
                participant: {
                  id: sessionId,
                  sessionId,
                  name: data.name,
                },
              });
              break;
            }
          }
          break;

        default:
          // Broadcast other messages to all participants
          this.broadcast(data);
      }
    } catch (error) {
      console.error("Error processing WebSocket message:", error);
    }
  }

  async webSocketClose(ws: WebSocket): Promise<void> {
    this.handleDisconnect(ws);
  }

  async webSocketError(ws: WebSocket, error: unknown): Promise<void> {
    console.error("WebSocket error:", error);
    this.handleDisconnect(ws);
  }

  private handleDisconnect(ws: WebSocket): void {
    // Find and remove the disconnected participant
    for (const [sessionId, participant] of this.participants.entries()) {
      if (participant.websocket === ws) {
        this.participants.delete(sessionId);
        this.broadcast({
          type: "participant_left",
          sessionId,
        });
        break;
      }
    }
  }

  private async handleBroadcast(request: Request): Promise<Response> {
    try {
      const message = await request.json<WebSocketMessage>();
      this.broadcast(message);
      return new Response(JSON.stringify({ success: true }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid message" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
  }

  private handleGetParticipants(): Response {
    const participantsList = Array.from(this.participants.values()).map((p) => ({
      id: p.sessionId,
      sessionId: p.sessionId,
      name: p.name,
      joinedAt: p.joinedAt.toISOString(),
    }));

    return new Response(JSON.stringify({ participants: participantsList }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  private broadcast(message: WebSocketMessage, excludeSessionId?: string): void {
    const messageStr = JSON.stringify(message);

    for (const [sessionId, participant] of this.participants.entries()) {
      if (sessionId === excludeSessionId) continue;

      try {
        participant.websocket.send(messageStr);
      } catch (error) {
        console.error(`Failed to send to ${sessionId}:`, error);
        // Clean up dead connections
        this.participants.delete(sessionId);
      }
    }
  }
}
