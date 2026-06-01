import * as React from 'react';
import { Languages, HelpCircle } from 'lucide-react';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { useMeetingStore } from '@/stores/meetingStore';
import { format } from 'date-fns';

export const LiveTranscript: React.FC = () => {
  const { transcriptChunks } = useMeetingStore();
  const bottomRef = React.useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcriptChunks]);

  const formatChunkTime = (isoString: string) => {
    try {
      return format(new Date(isoString), 'h:mm:ss a');
    } catch {
      return '';
    }
  };

  return (
    <div className="w-80 h-full bg-card border-l border-border flex flex-col select-none">
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center gap-2 shrink-0">
        <Languages className="h-4 w-4 text-primary" />
        <span className="font-bold text-sm text-foreground">Live Captions</span>
      </div>

      {/* Transcription Scroll Area */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4 text-left">
          {transcriptChunks.length > 0 ? (
            transcriptChunks.map((chunk, idx) => (
              <div key={idx} className="space-y-1 bg-muted/30 border border-border/30 rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-foreground truncate">{chunk.speakerName}</span>
                  <span className="text-[9px] text-muted-foreground/80 flex-shrink-0">
                    {formatChunkTime(chunk.timestamp)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed leading-snug">{chunk.text}</p>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-muted-foreground space-y-2">
              <HelpCircle className="h-6 w-6 mx-auto opacity-40" />
              <p className="text-xs">No live captions captured yet.</p>
              <p className="text-[10px] opacity-75">Start speaking, and live transcriptions will stream here.</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </ScrollArea>
    </div>
  );
};
export default LiveTranscript;
