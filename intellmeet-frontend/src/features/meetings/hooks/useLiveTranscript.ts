import * as React from 'react';
import { useSocket } from '@/hooks/useSocket';
import { useAuthStore } from '@/stores/authStore';
import { useMeetingStore } from '@/stores/meetingStore';

export function useLiveTranscript(meetingId: string) {
  const socket = useSocket();
  const { user } = useAuthStore();
  const { appendTranscript } = useMeetingStore();
  const [isListening, setIsListening] = React.useState(false);
  const recognitionRef = React.useRef<any>(null);

  React.useEffect(() => {
    // Check SpeechRecognition compatibility
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn('[SpeechRecognition] Browser does not support speech recognition.');
      return;
    }

    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = 'en-US';

    rec.onstart = () => {
      setIsListening(true);
    };

    rec.onend = () => {
      setIsListening(false);
    };

    rec.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error occurred:', event.error);
    };

    rec.onresult = (event: any) => {
      const lastResultIndex = event.results.length - 1;
      const text = event.results[lastResultIndex][0].transcript.trim();

      if (!text || !socket || !user) return;

      const chunk = {
        meetingId,
        text,
        timestamp: new Date().toISOString(),
        speakerName: user.name,
      };

      // Emit chunk to backend for append/persistence
      socket.emit('meeting:transcript-chunk', chunk);
      
      // Optimistically append locally
      appendTranscript(chunk);
    };

    recognitionRef.current = rec;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [meetingId, socket, user, appendTranscript]);

  const startTranscript = React.useCallback(() => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start SpeechRecognition:', err);
      }
    }
  }, [isListening]);

  const stopTranscript = React.useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
    }
  }, [isListening]);

  return {
    isSupported: !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition),
    isListening,
    startTranscript,
    stopTranscript,
  };
}
