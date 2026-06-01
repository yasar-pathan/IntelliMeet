import * as React from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { BrainCircuit, Sparkles, Send, Loader2, Calendar, Clipboard } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Textarea } from '@/components/ui/Textarea';
import { ScrollArea } from '@/components/ui/ScrollArea';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';

export const AISidePanel: React.FC = () => {
  const [activeTool, setActiveTool] = React.useState<'agenda' | 'chat'>('agenda');
  
  // Agenda states
  const [title, setTitle] = React.useState('');
  const [duration, setDuration] = React.useState('30');
  const [topics, setTopics] = React.useState('');
  const [agendaResult, setAgendaResult] = React.useState('');

  // Chat helper states
  const [chatInput, setChatInput] = React.useState('');
  const [chatHistory, setChatHistory] = React.useState<Array<{ sender: 'user' | 'ai'; text: string }>>([
    { sender: 'ai', text: 'Hi! I am your IntelliMeet AI helper. How can I assist you with your workspaces today?' },
  ]);

  // Generate Agenda Mutation
  const agendaMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<ApiResponse<{ agenda: string }>>('/ai/generate-agenda', {
        title,
        duration: parseInt(duration) || 30,
        topics: topics ? topics.split(',').map((t) => t.trim()) : [],
      });
      return response.data;
    },
    onSuccess: (res) => {
      setAgendaResult(res.data.agenda);
      toast.success('AI Agenda suggestions ready!');
    },
    onError: () => {
      toast.error('Failed to generate agenda');
    },
  });

  const handleAgendaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title) return;
    agendaMutation.mutate();
  };

  const handleChatSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput;
    setChatHistory((prev) => [...prev, { sender: 'user', text: userMsg }]);
    setChatInput('');

    // Simulate AI response for high-fidelity offline/online mock integration
    setTimeout(() => {
      setChatHistory((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: `Certainly! I've indexed your current workspace tasks. Based on recent meeting summaries for "${
            title || 'Product Sync'
          }", you should focus on resolving overdue Kanban items.`,
        },
      ]);
    }, 1200);
  };

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col select-none text-left">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center gap-2 shrink-0">
        <BrainCircuit className="h-4 w-4 text-primary animate-pulse" />
        <span className="font-bold text-sm text-foreground">AI Work Assistant</span>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-border/30 shrink-0">
        <button
          onClick={() => setActiveTool('agenda')}
          className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTool === 'agenda'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          Agenda Planner
        </button>
        <button
          onClick={() => setActiveTool('chat')}
          className={`flex-1 py-2 text-center text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
            activeTool === 'chat'
              ? 'border-primary text-foreground'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          AI Chat Helper
        </button>
      </div>

      {/* Panel Tool content */}
      <div className="flex-1 overflow-hidden relative">
        {activeTool === 'agenda' && (
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {agendaResult ? (
                <div className="space-y-4">
                  <div className="bg-muted/40 p-4 rounded-xl border border-border/30">
                    <div className="flex items-center gap-1.5 text-primary text-xs font-bold mb-2">
                      <Sparkles className="h-3.5 w-3.5" /> Generated Agenda
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed whitespace-pre-wrap">
                      {agendaResult}
                    </p>
                  </div>
                  <Button onClick={() => setAgendaResult('')} variant="outline" className="w-full text-xs">
                    Plan New Agenda
                  </Button>
                </div>
              ) : (
                <form onSubmit={handleAgendaSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="agendaTitle" required>
                      Meeting Topic Title
                    </Label>
                    <div className="mt-1">
                      <Input
                        id="agendaTitle"
                        placeholder="e.g. Q3 Roadmap Review"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        required
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="agendaDuration">Duration (minutes)</Label>
                    <div className="mt-1">
                      <Input
                        id="agendaDuration"
                        type="number"
                        placeholder="30"
                        value={duration}
                        onChange={(e) => setDuration(e.target.value)}
                        className="text-xs h-9"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="agendaTopics">Key Topics (comma separated)</Label>
                    <div className="mt-1">
                      <Textarea
                        id="agendaTopics"
                        placeholder="marketing metrics, design specs, server migration"
                        value={topics}
                        onChange={(e) => setTopics(e.target.value)}
                        className="text-xs min-h-[70px]"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    isLoading={agendaMutation.isPending}
                    className="w-full text-xs"
                  >
                    Generate Suggestions
                  </Button>
                </form>
              )}
            </div>
          </ScrollArea>
        )}

        {activeTool === 'chat' && (
          <div className="flex flex-col h-full overflow-hidden">
            {/* Chat message feed */}
            <ScrollArea className="flex-1">
              <div className="p-4 space-y-4">
                {chatHistory.map((msg, idx) => (
                  <div
                    key={idx}
                    className={`max-w-[85%] rounded-xl p-3 text-xs leading-relaxed ${
                      msg.sender === 'ai'
                        ? 'bg-muted border border-border/30 mr-auto rounded-tl-none text-foreground'
                        : 'bg-primary text-primary-foreground ml-auto rounded-tr-none'
                    }`}
                  >
                    {msg.text}
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Input Bar */}
            <form onSubmit={handleChatSend} className="p-3 border-t border-border/50 bg-card/60 flex gap-2">
              <input
                type="text"
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                placeholder="Ask AI assistant..."
                className="flex-1 h-9 bg-background border border-input rounded-lg px-3 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 transition-all"
              />
              <Button type="submit" size="icon" className="h-9 w-9 shrink-0 cursor-pointer">
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
export default AISidePanel;
