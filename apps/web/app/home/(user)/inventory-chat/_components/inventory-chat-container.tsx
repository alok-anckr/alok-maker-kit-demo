'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTransition } from 'react';

import { Alert, AlertDescription } from '@kit/ui/alert';
import { Card } from '@kit/ui/card';
import { Spinner } from '@kit/ui/spinner';

import { processChatMessage } from '../_lib/server/server-actions';
import { ChatInputForm } from './chat-input-form';
import { ChatMessageComponent, type ChatMessage } from './chat-message';

export function InventoryChatContainer() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: `Hello! I'm your QuickBooks Desktop inventory assistant. I can help you:

• Create new inventory items
• Update existing items
• Search and view inventory
• List items with filters
• Bulk create/update items via Excel upload

Try saying something like:
- "Create a new item called Widget with price $50"
- "Update Widget price to $75"
- "Show me all active items"
- "List items containing 'Widget'"

Or upload an Excel/CSV file with items to create/update!`,
      timestamp: new Date(),
    },
  ]);

  const [isPending, startTransition] = useTransition();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSendMessage = async (content: string, file?: File) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);

    startTransition(async () => {
      try {
        const result = await processChatMessage({ message: content, file });

        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: result.reply || 'Operation completed.',
          timestamp: new Date(),
          success: result.success,
          data: result.data,
          error: result.error,
        };

        setMessages((prev) => [...prev, assistantMessage]);
      } catch (error) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Sorry, I encountered an error: ${error instanceof Error ? error.message : 'Unknown error'}`,
          timestamp: new Date(),
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        };

        setMessages((prev) => [...prev, errorMessage]);
      }
    });
  };

  return (
    <div className="flex h-full flex-col">
      <Alert className="mb-4">
        <AlertDescription>
          Make sure QuickBooks Desktop is running and connected via Conductor
          before using this chat interface.
        </AlertDescription>
      </Alert>

      <Card className="flex flex-1 flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message) => (
            <ChatMessageComponent key={message.id} message={message} />
          ))}

          {isPending && (
            <div className="flex items-center gap-3 p-4">
              <Spinner className="h-5 w-5" />
              <span className="text-sm text-muted-foreground">
                Processing...
              </span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <div className="border-t">
          <ChatInputForm onSubmit={handleSendMessage} isLoading={isPending} />
        </div>
      </Card>
    </div>
  );
}
