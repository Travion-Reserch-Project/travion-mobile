/**
 * Chat-related types for the mobile app
 */

// Chat message from user or assistant
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  metadata?: ChatMessageMetadata;
}

// A single source link (web search result or MCP result)
export interface SourceLink {
  title: string;
  url: string;
}

// Metadata attached to assistant messages
export interface ChatMessageMetadata {
  intent?: string;
  reasoningLoops?: number;
  documentsRetrieved?: number;
  webSearchUsed?: boolean;
  /** Web / MCP search result links shown in the sources panel */
  sourceUrls?: SourceLink[];
  /** Knowledge-base document locations used for this response */
  kbSources?: string[];
}

// Chat session
export interface ChatSession {
  sessionId: string;
  locationName: string;
  messages: ChatMessage[];
  messageCount: number;
  lastActivity: Date;
  status: 'active' | 'closed' | 'archived';
}

// Location chat request
export interface LocationChatRequest {
  locationName: string;
  message: string;
}

// Location chat response from API
export interface LocationChatResponse {
  sessionId: string;
  locationName: string;
  response: string;
  intent?: string;
  metadata?: {
    reasoning_loops: number;
    documents_retrieved: number;
    web_search_used: boolean;
    target_location: string;
    /** Web / MCP result links */
    source_urls?: SourceLink[];
    /** KB document location names */
    kb_sources?: string[];
  };
  messageCount: number;
}

// Get location session response
export interface GetLocationSessionResponse {
  session: ChatSession | null;
  hasSession: boolean;
}

// Clear messages response
export interface ClearMessagesResponse {
  session: ChatSession;
}
