# Feature Specification: AI Panel Discussion

## Overview

Enable users to engage in real-time panel discussions about analyzed projects with AI-powered expert personas. Each analyzed report can have one associated panel discussion where multiple AI experts debate and discuss the project's feasibility from their domain perspectives, while users can participate by asking questions or contributing insights.

---

## Problem Statement

Currently, users receive a static feasibility report that provides scores and recommendations across six categories. However, users may want to:

- Explore specific aspects of the analysis in more depth
- Understand trade-offs between different expert perspectives
- Ask follow-up questions about recommendations
- Challenge assumptions made in the analysis
- Get real-time expert opinions on alternative approaches

---

## Solution

A real-time panel discussion feature where AI personas representing different domains (economic, technical, legal, environmental, social, operational) engage in dynamic discourse about the analyzed project. Users can observe the discussion, inject questions, and receive targeted responses from relevant experts.

---

## AI Expert Personas

### Panel Composition

| Persona | Role | Focus Areas | Personality Traits |
|---------|------|-------------|-------------------|
| **Dr. Economist** | Economic Expert | Budget analysis, ROI, funding, market dynamics | Data-driven, pragmatic, cost-conscious |
| **Chief Engineer** | Technical Expert | Infrastructure, implementation, technology stack | Solution-oriented, detail-focused, realistic |
| **Legal Counsel** | Legal Expert | Regulations, compliance, permits, liability | Risk-aware, thorough, precedent-based |
| **Dr. Environmentalist** | Environmental Expert | Climate impact, sustainability, ecological effects | Long-term focused, conservation-minded |
| **Community Advocate** | Social Expert | Public benefit, displacement, equity, accessibility | People-first, inclusive, empathetic |
| **Operations Director** | Operational Expert | Logistics, maintenance, staffing, scalability | Efficiency-focused, practical, process-oriented |

### Persona Behavior Guidelines

- Each persona should maintain consistent viewpoint aligned with their domain
- Personas can agree, disagree, or build upon other experts' points
- Responses should reference specific data from the original report
- Personas should acknowledge uncertainty when data is limited
- Natural conversation flow with occasional cross-expert dialogue

---

## User Experience

### Entry Points

1. **From Report Page**: "Start Panel Discussion" button on analyzed reports
2. **Direct URL**: `/{country}/report/{slug}/discussion`
3. **Report History**: Discussion indicator badge on reports with active discussions

### Discussion Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    PANEL DISCUSSION                         │
│  Project: Solar Farm Development in Colombo                 │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🎓 Dr. Economist                              2:34pm │   │
│  │ The projected ROI of 12% over 15 years assumes      │   │
│  │ stable energy prices. Given Sri Lanka's current     │   │
│  │ economic volatility, we should factor in...         │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔧 Chief Engineer                             2:35pm │   │
│  │ I agree with the economic concerns, but the         │   │
│  │ technical infrastructure is actually favorable...   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 👤 You                                        2:36pm │   │
│  │ What about the grid capacity in that region?        │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │ 🔧 Chief Engineer                             2:36pm │   │
│  │ Great question. The Colombo grid currently has...   │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐   │
│  │ Type your question or comment...              [Send] │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  Quick Actions: [Ask All Experts] [Challenge Score]        │
│                 [Request Deep Dive] [Summarize Discussion] │
└─────────────────────────────────────────────────────────────┘
```

### Interaction Modes

1. **Observe Mode**: Watch AI experts discuss automatically
2. **Participate Mode**: Ask questions, add comments, direct questions to specific experts
3. **Moderate Mode**: Guide discussion topics, request focus on specific categories

### Quick Actions

| Action | Description |
|--------|-------------|
| **Ask All Experts** | Pose a question that all personas respond to |
| **Challenge Score** | Request justification for a specific category score |
| **Request Deep Dive** | Ask for detailed analysis on a specific aspect |
| **Summarize Discussion** | Get AI-generated summary of key points and consensus |
| **Export Transcript** | Download discussion as PDF/Markdown |

---

## Technical Architecture

### Database Schema Extensions

```sql
-- Panel discussions table
CREATE TABLE panel_discussions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  report_slug TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',  -- active, paused, concluded
  started_at TEXT NOT NULL,
  concluded_at TEXT,
  summary TEXT,  -- AI-generated summary when concluded
  FOREIGN KEY (report_slug) REFERENCES reports(slug)
);

-- Discussion messages table
CREATE TABLE discussion_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  discussion_id INTEGER NOT NULL,
  participant_type TEXT NOT NULL,  -- 'user' | 'ai_economist' | 'ai_engineer' | etc.
  participant_name TEXT NOT NULL,
  content TEXT NOT NULL,
  reply_to_id INTEGER,  -- For threaded responses
  metadata TEXT,  -- JSON: sentiment, references, etc.
  created_at TEXT NOT NULL,
  FOREIGN KEY (discussion_id) REFERENCES panel_discussions(id),
  FOREIGN KEY (reply_to_id) REFERENCES discussion_messages(id)
);

-- Indexes
CREATE INDEX idx_discussion_report ON panel_discussions(report_slug);
CREATE INDEX idx_messages_discussion ON discussion_messages(discussion_id);
CREATE INDEX idx_messages_created ON discussion_messages(created_at);
```

### Drizzle ORM Schema

```typescript
// db/schema.ts additions

export const panelDiscussions = sqliteTable('panel_discussions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  reportSlug: text('report_slug').notNull().unique(),
  status: text('status').notNull().default('active'),
  startedAt: text('started_at').notNull().$defaultFn(() => new Date().toISOString()),
  concludedAt: text('concluded_at'),
  summary: text('summary'),
});

export const discussionMessages = sqliteTable('discussion_messages', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  discussionId: integer('discussion_id').notNull(),
  participantType: text('participant_type').notNull(),
  participantName: text('participant_name').notNull(),
  content: text('content').notNull(),
  replyToId: integer('reply_to_id'),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull().$defaultFn(() => new Date().toISOString()),
});

export type PanelDiscussion = typeof panelDiscussions.$inferSelect;
export type NewPanelDiscussion = typeof panelDiscussions.$inferInsert;
export type DiscussionMessage = typeof discussionMessages.$inferSelect;
export type NewDiscussionMessage = typeof discussionMessages.$inferInsert;
```

### API Endpoints

#### Start/Get Discussion

```typescript
// POST /api/discussion/start
// Request
{
  "reportSlug": "solar-colombo-a1b2"
}

// Response
{
  "discussionId": 1,
  "status": "active",
  "startedAt": "2024-01-15T10:30:00Z"
}
```

#### Stream Discussion

```typescript
// GET /api/discussion/:slug/stream
// SSE Response Events

// New message event
event: message
data: {
  "id": 1,
  "participantType": "ai_economist",
  "participantName": "Dr. Economist",
  "content": "Looking at the budget allocation...",
  "createdAt": "2024-01-15T10:31:00Z"
}

// Typing indicator event
event: typing
data: {
  "participant": "ai_engineer",
  "participantName": "Chief Engineer"
}

// Discussion status event
event: status
data: {
  "status": "active",
  "participantCount": 6
}
```

#### Send User Message

```typescript
// POST /api/discussion/:slug/message
// Request
{
  "content": "What about grid capacity?",
  "targetExpert": "ai_engineer"  // Optional: direct to specific expert
}

// Response
{
  "messageId": 5,
  "acknowledged": true
}
```

#### Get Discussion History

```typescript
// GET /api/discussion/:slug/history
// Response
{
  "discussion": {
    "id": 1,
    "reportSlug": "solar-colombo-a1b2",
    "status": "active",
    "startedAt": "2024-01-15T10:30:00Z"
  },
  "messages": [
    {
      "id": 1,
      "participantType": "ai_economist",
      "participantName": "Dr. Economist",
      "content": "...",
      "createdAt": "2024-01-15T10:31:00Z"
    }
  ]
}
```

#### Conclude Discussion

```typescript
// POST /api/discussion/:slug/conclude
// Response
{
  "status": "concluded",
  "summary": "The panel reached consensus on...",
  "concludedAt": "2024-01-15T11:00:00Z"
}
```

### AI Orchestration

```typescript
// Simplified orchestration flow
interface DiscussionOrchestrator {
  // Initialize discussion with report context
  initializeDiscussion(report: FeasibilityReport): Promise<void>;

  // Generate next AI response based on conversation state
  generateExpertResponse(
    expert: ExpertPersona,
    conversationHistory: Message[],
    reportContext: FeasibilityReport
  ): Promise<string>;

  // Determine which expert should respond next
  selectNextSpeaker(
    conversationHistory: Message[],
    lastMessage: Message
  ): ExpertPersona;

  // Handle user question routing
  routeUserQuestion(
    question: string,
    targetExpert?: ExpertPersona
  ): ExpertPersona[];
}
```

### System Prompt Template

```typescript
const expertSystemPrompt = (expert: ExpertPersona, report: FeasibilityReport) => `
You are ${expert.name}, a ${expert.role} participating in a panel discussion
about a ${report.detectedProjectType} project.

PROJECT CONTEXT:
- Location: ${report.location}
- Overall Feasibility Score: ${report.overallScore}/100
- Your Domain Score (${expert.category}): ${report.categories[expert.categoryIndex].score}/100
- Key Concerns in Your Domain: ${report.categories[expert.categoryIndex].cons.join(', ')}

YOUR PERSONALITY:
${expert.personalityTraits.join(', ')}

DISCUSSION GUIDELINES:
1. Stay in character as ${expert.name}
2. Reference specific data from the report when making points
3. Acknowledge other experts' valid points while maintaining your perspective
4. When users ask questions, provide helpful, domain-specific answers
5. Be concise - aim for 2-4 sentences per response unless deep dive requested
6. If uncertain, acknowledge limitations in available data

CURRENT DISCUSSION CONTEXT:
{conversationHistory}

Respond naturally as ${expert.name} would in a professional panel discussion.
`;
```

---

## Frontend Components

### New Components Required

```
src/components/
├── discussion/
│   ├── panel-discussion.tsx      # Main discussion container
│   ├── message-bubble.tsx        # Individual message component
│   ├── expert-avatar.tsx         # Expert persona avatar with status
│   ├── typing-indicator.tsx      # Shows when AI is "thinking"
│   ├── message-input.tsx         # User input with quick actions
│   ├── expert-selector.tsx       # Direct question to specific expert
│   ├── discussion-summary.tsx    # Concluded discussion summary
│   └── discussion-skeleton.tsx   # Loading state
```

### Component Specifications

#### PanelDiscussion

```typescript
interface PanelDiscussionProps {
  reportSlug: string;
  report: FeasibilityReport;
}

// Features:
// - Auto-scroll to latest message
// - Lazy load older messages
// - Real-time SSE connection
// - Mobile-responsive layout
```

#### MessageBubble

```typescript
interface MessageBubbleProps {
  message: DiscussionMessage;
  isUser: boolean;
  expertConfig?: ExpertPersona;
  onReply?: (messageId: number) => void;
}

// Features:
// - Expert-specific styling/colors
// - Timestamp display
// - Reply threading indicator
// - Copy message action
```

#### MessageInput

```typescript
interface MessageInputProps {
  onSend: (content: string, targetExpert?: string) => void;
  disabled?: boolean;
  quickActions: QuickAction[];
}

// Features:
// - Auto-resize textarea
// - Expert mention (@economist)
// - Quick action buttons
// - Send on Enter (Shift+Enter for newline)
```

### Context Provider

```typescript
// src/contexts/discussion-context.tsx

interface DiscussionContextType {
  discussion: PanelDiscussion | null;
  messages: DiscussionMessage[];
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;

  // Actions
  startDiscussion: (reportSlug: string) => Promise<void>;
  sendMessage: (content: string, targetExpert?: string) => Promise<void>;
  concludeDiscussion: () => Promise<void>;
  loadHistory: () => Promise<void>;
}
```

---

## State Management

### Discussion State Machine

```
┌─────────┐     Start      ┌────────┐
│  Idle   │ ─────────────> │ Active │
└─────────┘                └────────┘
                               │
                    ┌──────────┼──────────┐
                    │          │          │
                    ▼          ▼          ▼
              ┌─────────┐ ┌────────┐ ┌───────────┐
              │ Paused  │ │ Error  │ │ Concluded │
              └─────────┘ └────────┘ └───────────┘
                    │                      │
                    │      Resume          │
                    └──────────────────────┘
```

### Message Flow

```
User Input
    │
    ▼
┌─────────────────┐
│ POST /message   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Store in DB     │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Broadcast SSE   │ ───> All connected clients
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ AI Orchestrator │
│ - Select expert │
│ - Generate resp │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Store AI resp   │
└─────────────────┘
    │
    ▼
┌─────────────────┐
│ Broadcast SSE   │ ───> All connected clients
└─────────────────┘
```

---

## UI/UX Specifications

### Color Coding for Experts

| Expert | Primary Color | Badge Color | Icon |
|--------|--------------|-------------|------|
| Economist | Blue (#3B82F6) | blue-100 | 📊 |
| Engineer | Orange (#F97316) | orange-100 | 🔧 |
| Legal | Purple (#8B5CF6) | purple-100 | ⚖️ |
| Environmental | Green (#22C55E) | green-100 | 🌱 |
| Social | Pink (#EC4899) | pink-100 | 👥 |
| Operations | Slate (#64748B) | slate-100 | ⚙️ |
| User | Primary theme | primary-100 | 👤 |

### Responsive Breakpoints

- **Mobile (< 640px)**: Full-width messages, bottom input, collapsed expert list
- **Tablet (640px - 1024px)**: Side-by-side layout, expert cards in header
- **Desktop (> 1024px)**: Three-column layout with expert panel sidebar

### Animation Specifications

```typescript
// Message entry animation
const messageAnimation = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.3, ease: "easeOut" }
};

// Typing indicator
const typingAnimation = {
  animate: { opacity: [0.4, 1, 0.4] },
  transition: { duration: 1.5, repeat: Infinity }
};
```

---

## Edge Cases & Error Handling

### Handled Scenarios

| Scenario | Handling |
|----------|----------|
| Network disconnect | Reconnect with exponential backoff, show offline indicator |
| Report not found | Redirect to 404, show "Report unavailable" message |
| Discussion already concluded | Show read-only transcript with summary |
| AI generation failure | Retry 3x, then show "Expert unavailable" message |
| Rate limiting | Queue messages, show "Please wait" indicator |
| Long discussions | Pagination, "Load earlier messages" button |
| Concurrent users | Real-time sync via SSE, optimistic UI updates |

### Rate Limiting

- **User messages**: Max 10 messages per minute
- **AI responses**: Staggered 2-5 second delays for natural feel
- **Discussion duration**: Auto-conclude after 1 hour of inactivity

---

## Performance Considerations

### Optimization Strategies

1. **Message Virtualization**: Only render visible messages for long discussions
2. **Lazy AI Loading**: Generate AI responses on-demand, not preemptively
3. **SSE Connection Pooling**: Single connection per client
4. **Database Indexing**: Compound indexes on (discussion_id, created_at)
5. **Response Caching**: Cache expert context summaries per discussion
6. **Debounced Typing**: Aggregate rapid user input before sending

### Metrics to Track

- Time to first AI response
- Message delivery latency
- SSE connection stability
- AI generation token usage
- User engagement (messages per session)
- Discussion completion rate

---

## Security Considerations

1. **Input Sanitization**: Sanitize all user messages before storage/display
2. **Rate Limiting**: Prevent spam and API abuse
3. **Authentication**: Optional user identification for message attribution
4. **Content Moderation**: AI-based filtering for inappropriate content
5. **Discussion Access**: Discussions tied to report slugs, no enumeration
6. **Data Retention**: Auto-delete discussions after 30 days (configurable)

---

## Future Enhancements

### Phase 2

- [ ] User accounts for discussion history
- [ ] Custom expert personas
- [ ] Discussion templates (debate mode, Q&A mode, consensus building)
- [ ] Export to PDF with formatting
- [ ] Discussion embedding for external sites

### Phase 3

- [ ] Voice input/output for accessibility
- [ ] Multi-language support
- [ ] Expert "confidence levels" displayed
- [ ] Voting/polling within discussions
- [ ] Integration with external data sources during discussion

---

## Implementation Checklist

### Backend

- [ ] Create database migrations for new tables
- [ ] Implement discussion CRUD endpoints
- [ ] Build SSE streaming infrastructure
- [ ] Create AI orchestration service
- [ ] Define expert persona configurations
- [ ] Implement rate limiting middleware
- [ ] Add discussion summary generation

### Frontend

- [ ] Create DiscussionContext provider
- [ ] Build PanelDiscussion container component
- [ ] Implement MessageBubble with expert styling
- [ ] Create MessageInput with quick actions
- [ ] Add typing indicators
- [ ] Implement SSE client connection
- [ ] Build discussion history view
- [ ] Add responsive layouts
- [ ] Create loading skeletons

### Testing

- [ ] Unit tests for orchestration logic
- [ ] Integration tests for API endpoints
- [ ] E2E tests for discussion flow
- [ ] Load testing for concurrent users
- [ ] SSE reliability testing

### Documentation

- [ ] API documentation
- [ ] Component storybook
- [ ] User guide

---

## Appendix

### Example Discussion Transcript

```
[Discussion: Solar Farm Development in Colombo]
[Started: 2024-01-15 10:30 AM]

🎓 Dr. Economist (10:31 AM):
Looking at the projected costs of $45M against Sri Lanka's current fiscal
constraints, I'm concerned about the funding gap. The report shows only 60%
budget alignment. We'd need significant international investment or PPP
arrangements.

🔧 Chief Engineer (10:32 AM):
The technical feasibility score of 78 is encouraging. The existing grid
infrastructure in Colombo can handle the projected 50MW output with minimal
upgrades. My main concern is the monsoon season impact on installation timelines.

🌱 Dr. Environmentalist (10:33 AM):
I want to highlight that while solar is inherently low-carbon, the land use
analysis shows potential displacement of 12 hectares of agricultural land.
We should explore rooftop alternatives or degraded land options.

⚖️ Legal Counsel (10:34 AM):
The regulatory framework for renewable energy in Sri Lanka is actually quite
favorable post-2022 reforms. However, the land acquisition process typically
takes 18-24 months, which should be factored into timelines.

👤 You (10:35 AM):
What about the grid capacity in that region? Can it really handle 50MW?

🔧 Chief Engineer (10:35 AM):
Good question. The Colombo grid currently operates at 65% capacity with the
Kerawalapitiya substation having 80MW of headroom. The 50MW injection is
well within safe limits. However, we'd need to upgrade the 33kV feeder lines
at an estimated cost of $2.1M.

👥 Community Advocate (10:36 AM):
I'd like to add that local employment generation is a key benefit here. The
report estimates 200 construction jobs and 35 permanent positions. This aligns
well with the Colombo district's 8.2% unemployment rate.

[Discussion continues...]
```

---

*Document Version: 1.0*
*Last Updated: January 2024*
*Status: Proposed*
