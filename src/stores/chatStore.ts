/**
 * Chat Store
 * Zustand store for managing location-specific chat state
 */

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { chatService } from '../services/api';
import type { ChatMessage } from '@types';

interface LocationChatState {
  messages: ChatMessage[];
  sessionId: string | null;
  isLoading: boolean;
  isSending: boolean;
  error: string | null;
}

interface ChatState {
  // Map of locationName -> chat state
  locationChats: Record<string, LocationChatState>;

  // Current active location
  currentLocation: string | null;

  // Actions
  setCurrentLocation: (locationName: string) => void;
  loadLocationSession: (locationName: string) => Promise<void>;
  sendMessage: (locationName: string, message: string) => Promise<void>;
  clearChat: (locationName: string) => Promise<void>;
  clearError: (locationName: string) => void;

  // Selectors
  getCurrentChat: () => LocationChatState | null;
  getChatForLocation: (locationName: string) => LocationChatState | null;
}

const createEmptyLocationChat = (): LocationChatState => ({
  messages: [],
  sessionId: null,
  isLoading: false,
  isSending: false,
  error: null,
});

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      locationChats: {},
      currentLocation: null,

      setCurrentLocation: (locationName: string) => {
        set({ currentLocation: locationName });

        // Initialize chat state for this location if it doesn't exist
        const state = get();
        if (!state.locationChats[locationName]) {
          set({
            locationChats: {
              ...state.locationChats,
              [locationName]: createEmptyLocationChat(),
            },
          });
        }
      },

      loadLocationSession: async (locationName: string) => {
        const state = get();

        // Update loading state
        set({
          locationChats: {
            ...state.locationChats,
            [locationName]: {
              ...(state.locationChats[locationName] || createEmptyLocationChat()),
              isLoading: true,
              error: null,
            },
          },
        });

        try {
          // Check if we have a cached session
          const existingChat = state.locationChats[locationName];
          if (existingChat?.sessionId && existingChat.messages.length > 0) {
            // We have cached data, just mark as loaded
            set({
              locationChats: {
                ...get().locationChats,
                [locationName]: {
                  ...existingChat,
                  isLoading: false,
                },
              },
            });
            return;
          }

          // Try to load existing session from server
          const response = await chatService.getLocationSession(locationName);

          if (response.hasSession && response.session) {
            // Load messages for the session
            const messages = await chatService.getSessionMessages(
              response.session.sessionId
            );

            set({
              locationChats: {
                ...get().locationChats,
                [locationName]: {
                  messages: messages.map(msg => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                  })),
                  sessionId: response.session.sessionId,
                  isLoading: false,
                  isSending: false,
                  error: null,
                },
              },
            });
          } else {
            // No existing session, start fresh
            set({
              locationChats: {
                ...get().locationChats,
                [locationName]: {
                  ...createEmptyLocationChat(),
                  isLoading: false,
                },
              },
            });
          }
        } catch (error) {
          console.error('Failed to load location session:', error);
          set({
            locationChats: {
              ...get().locationChats,
              [locationName]: {
                ...(get().locationChats[locationName] || createEmptyLocationChat()),
                isLoading: false,
                error: 'Failed to load chat history',
              },
            },
          });
        }
      },

      sendMessage: async (locationName: string, message: string) => {
        const state = get();
        const currentChat = state.locationChats[locationName] || createEmptyLocationChat();

        // Add user message optimistically
        const userMessage: ChatMessage = {
          id: `temp-${Date.now()}`,
          role: 'user',
          content: message,
          timestamp: new Date(),
        };

        set({
          locationChats: {
            ...state.locationChats,
            [locationName]: {
              ...currentChat,
              messages: [...currentChat.messages, userMessage],
              isSending: true,
              error: null,
            },
          },
        });

        try {
          const response = await chatService.sendLocationMessage(locationName, message);

          // Add assistant message
          const assistantMessage: ChatMessage = {
            id: `msg-${Date.now()}`,
            role: 'assistant',
            content: response.response,
            timestamp: new Date(),
            metadata: {
              intent: response.intent,
              reasoningLoops: response.metadata?.reasoning_loops,
              documentsRetrieved: response.metadata?.documents_retrieved,
              webSearchUsed: response.metadata?.web_search_used,
            },
          };

          // Update the user message with proper ID and add assistant response
          const currentState = get();
          const chatState = currentState.locationChats[locationName];

          set({
            locationChats: {
              ...currentState.locationChats,
              [locationName]: {
                ...chatState,
                messages: [
                  ...chatState.messages.slice(0, -1), // Remove temp user message
                  { ...userMessage, id: `user-${Date.now()}` },
                  assistantMessage,
                ],
                sessionId: response.sessionId,
                isSending: false,
              },
            },
          });
        } catch (error) {
          console.error('Failed to send message:', error);

          // Remove optimistic user message and show error
          const currentState = get();
          const chatState = currentState.locationChats[locationName];

          set({
            locationChats: {
              ...currentState.locationChats,
              [locationName]: {
                ...chatState,
                messages: chatState.messages.slice(0, -1), // Remove failed message
                isSending: false,
                error: 'Failed to send message. Please try again.',
              },
            },
          });
        }
      },

      clearChat: async (locationName: string) => {
        const state = get();
        const currentChat = state.locationChats[locationName];

        if (!currentChat?.sessionId) {
          // No session to clear, just reset local state
          set({
            locationChats: {
              ...state.locationChats,
              [locationName]: createEmptyLocationChat(),
            },
          });
          return;
        }

        set({
          locationChats: {
            ...state.locationChats,
            [locationName]: {
              ...currentChat,
              isLoading: true,
            },
          },
        });

        try {
          await chatService.clearMessages(currentChat.sessionId);

          set({
            locationChats: {
              ...get().locationChats,
              [locationName]: {
                messages: [],
                sessionId: currentChat.sessionId, // Keep session ID
                isLoading: false,
                isSending: false,
                error: null,
              },
            },
          });
        } catch (error) {
          console.error('Failed to clear chat:', error);
          set({
            locationChats: {
              ...get().locationChats,
              [locationName]: {
                ...currentChat,
                isLoading: false,
                error: 'Failed to clear chat',
              },
            },
          });
        }
      },

      clearError: (locationName: string) => {
        const state = get();
        const currentChat = state.locationChats[locationName];
        if (currentChat) {
          set({
            locationChats: {
              ...state.locationChats,
              [locationName]: {
                ...currentChat,
                error: null,
              },
            },
          });
        }
      },

      getCurrentChat: () => {
        const state = get();
        if (!state.currentLocation) return null;
        return state.locationChats[state.currentLocation] || null;
      },

      getChatForLocation: (locationName: string) => {
        const state = get();
        return state.locationChats[locationName] || null;
      },
    }),
    {
      name: 'chat-store',
      storage: createJSONStorage(() => AsyncStorage),
      // Only persist messages and sessionId for each location
      partialize: state => ({
        locationChats: Object.fromEntries(
          Object.entries(state.locationChats).map(([key, value]) => [
            key,
            {
              messages: value.messages,
              sessionId: value.sessionId,
              isLoading: false,
              isSending: false,
              error: null,
            },
          ])
        ),
      }),
      onRehydrateStorage: () => {
        console.log('Chat store: Starting hydration...');
        return (state, error) => {
          if (error) {
            console.error('Chat store hydration error:', error);
          } else {
            console.log('Chat store: Hydration completed', {
              locationCount: Object.keys(state?.locationChats || {}).length,
            });
          }
        };
      },
    }
  )
);
