import * as React from 'react';
import { Loader2, Send } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useMeetingAiChatHistory, useAskAiQuestion } from '@/features/meetings/hooks/useAiChat';
import { useAuthStore } from '@/stores/authStore';
import { format } from 'date-fns';

interface MeetingAiChatProps {
  meetingId: string;
}

export const MeetingAiChat: React.FC<MeetingAiChatProps> = ({ meetingId }) => {
  const { data: chatHistory, isLoading: historyLoading } = useMeetingAiChatHistory(meetingId);
  const askMutation = useAskAiQuestion(meetingId);
  const [question, setQuestion] = React.useState('');
  const messagesEndRef = React.useRef<HTMLDivElement>(null);
  const { user } = useAuthStore();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  React.useEffect(() => {
    scrollToBottom();
  }, [chatHistory, askMutation.isPending]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;
    askMutation.mutate(question, {
      onSuccess: () => setQuestion(''),
    });
  };

  if (historyLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground mt-3 font-semibold">Loading chat history...</span>
      </div>
    );
  }

  return (
    <Card className="flex flex-col h-[600px] border-border/40 shadow-sm">
      <CardHeader className="border-b border-border/30 pb-4">
        <CardTitle className="text-lg font-bold text-primary">AI Meeting Assistant</CardTitle>
        <p className="text-xs text-muted-foreground">Ask anything about this meeting based on the transcript.</p>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {(!chatHistory || chatHistory.length === 0) && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground italic">
              No questions asked yet. Be the first to ask!
            </div>
          )}
          {chatHistory?.map((msg) => (
            <div key={msg._id} className="space-y-4">
              {/* User Question */}
              <div className="flex flex-col items-end">
                <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%]">
                  <p className="text-sm">{msg.question}</p>
                </div>
                <span className="text-[10px] text-muted-foreground mt-1">
                  {format(new Date(msg.createdAt), 'h:mm a')}
                </span>
              </div>

              {/* AI Answer */}
              <div className="flex flex-col items-start">
                <div className="bg-muted text-foreground px-4 py-2 rounded-2xl rounded-tl-none max-w-[85%]">
                  <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.answer}</p>
                </div>
              </div>
            </div>
          ))}

          {askMutation.isPending && (
            <div className="flex flex-col items-end space-y-4 opacity-70">
              <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl rounded-tr-none max-w-[80%]">
                <p className="text-sm">{question}</p>
              </div>
              <div className="flex items-start self-start">
                <div className="bg-muted px-4 py-2 rounded-2xl rounded-tl-none flex items-center gap-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">AI is typing...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t border-border/30 bg-card/50">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about this meeting..."
              className="flex-1 bg-background"
              disabled={askMutation.isPending}
            />
            <Button
              type="submit"
              disabled={!question.trim() || askMutation.isPending}
              size="icon"
              className="rounded-xl h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </CardContent>
    </Card>
  );
};
