import * as React from 'react';
import { Send, MessageSquare, Loader2 } from 'lucide-react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Button } from '@/components/ui/Button';
import { useChatSocket } from '@/features/chat/hooks/useChatSocket';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChatPanelProps {
  meetingId: string;
  meetingCode: string;
}

export const ChatPanel: React.FC<ChatPanelProps> = ({ meetingId, meetingCode }) => {
  const { user: currentUser } = useAuthStore();
  const { messages, typingUsers, isLoading, sendMessage, startTyping, stopTyping } =
    useChatSocket(meetingId, meetingCode);

  const [text, setText] = React.useState('');
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const typingTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll on new messages
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    sendMessage(text);
    setText('');
    stopTyping();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setText(e.target.value);

    // Broadcast typing start
    startTyping();

    // Debounce typing stop broadcast after 2 seconds
    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      stopTyping();
    }, 2000);
  };

  const formatTime = (isoString: string) => {
    try {
      return format(new Date(isoString), 'h:mm a');
    } catch {
      return '';
    }
  };

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col select-none">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center gap-2 shrink-0">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="font-bold text-sm text-foreground">Chat</span>
      </div>

      {/* Messages scrolling list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground flex flex-col items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <span>Loading messages...</span>
            </div>
          ) : messages.length > 0 ? (
            messages.map((msg) => {
              const sender = typeof msg.sender === 'string' ? null : msg.sender;
              const senderName = sender ? sender.name : 'User';
              const isMe = sender ? sender._id === currentUser?._id : false;

              return (
                <div
                  key={msg._id}
                  className={cn('flex flex-col text-left max-w-[85%] rounded-2xl p-3 space-y-1', {
                    'ml-auto bg-primary text-primary-foreground rounded-tr-none': isMe,
                    'mr-auto bg-muted text-foreground rounded-tl-none border border-border/30': !isMe,
                  })}
                >
                  {!isMe && (
                    <span className="text-[10px] font-bold text-muted-foreground truncate block">
                      {senderName}
                    </span>
                  )}
                  <p className="text-xs leading-relaxed break-words">{msg.content}</p>
                  <span
                    className={cn('text-[8px] text-right block mt-1 opacity-70', {
                      'text-primary-foreground': isMe,
                      'text-muted-foreground': !isMe,
                    })}
                  >
                    {formatTime(msg.createdAt)}
                  </span>
                </div>
              );
            })
          ) : (
            <div className="p-12 text-center text-xs text-muted-foreground">
              No messages yet. Send a message to start conversing!
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>

      {/* Typing indicator & Input Bar */}
      <div className="p-3 border-t border-border/50 bg-card/60">
        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="text-[10px] text-muted-foreground text-left px-1 mb-1.5 animate-pulse">
            {typingUsers.map((u) => u.name).join(', ')}{' '}
            {typingUsers.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}

        <form onSubmit={handleSend} className="flex gap-2">
          <input
            type="text"
            value={text}
            onChange={handleInputChange}
            placeholder="Type a message..."
            className="flex-1 h-9 bg-background border border-input rounded-lg px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 dark:focus-visible:ring-primary/45 transition-all"
          />
          <Button type="submit" size="icon" className="h-9 w-9 shrink-0 cursor-pointer">
            <Send className="h-3.5 w-3.5" />
          </Button>
        </form>
      </div>
    </div>
  );
};
export default ChatPanel;
