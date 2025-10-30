import { CheckCircle, XCircle, User, Bot } from 'lucide-react';

import { cn } from '@kit/ui/utils';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  success?: boolean;
  data?: unknown;
  error?: string;
}

interface ChatMessageProps {
  message: ChatMessage;
}

export function ChatMessageComponent({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';

  return (
    <div
      className={cn('flex gap-3 p-4', isUser ? 'justify-end' : 'justify-start')}
    >
      {!isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary">
          <Bot className="h-5 w-5 text-primary-foreground" />
        </div>
      )}

      <div
        className={cn(
          'max-w-[80%] space-y-2 rounded-lg p-3',
          isUser
            ? 'bg-primary text-primary-foreground'
            : 'bg-muted text-foreground',
        )}
      >
        <div className="whitespace-pre-wrap break-words text-sm">
          {message.content}
        </div>

        {!isUser && message.success !== undefined && (
          <div
            className={cn(
              'flex items-center gap-1 text-xs',
              message.success ? 'text-green-600' : 'text-red-600',
            )}
          >
            {message.success ? (
              <>
                <CheckCircle className="h-3 w-3" />
                <span>Success</span>
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3" />
                <span>Failed</span>
              </>
            )}
          </div>
        )}

        <div className="text-xs opacity-70">
          {message.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </div>
      </div>

      {isUser && (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
          <User className="h-5 w-5" />
        </div>
      )}
    </div>
  );
}
