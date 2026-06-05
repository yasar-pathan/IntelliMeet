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
  const intentionallyStopped = React.useRef(true);
  const retryCount = React.useRef(0);

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
      retryCount.current = 0;
    };

    rec.onend = () => {
      setIsListening(false);
      if (!intentionallyStopped.current && retryCount.current < 5) {
        retryCount.current += 1;
        setTimeout(() => {
          if (recognitionRef.current && !intentionallyStopped.current) {
            try {
              recognitionRef.current.start();
            } catch (err) {}
          }
        }, 500);
      }
    };

    rec.onerror = (event: any) => {
      console.error('[SpeechRecognition] Error occurred:', event.error);
      const isRecoverable = event.error === 'network' || event.error === 'aborted';
      if (!isRecoverable) {
        intentionallyStopped.current = true;
      }
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
      intentionallyStopped.current = true;
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [meetingId, socket, user, appendTranscript]);

  const startTranscript = React.useCallback(() => {
    intentionallyStopped.current = false;
    retryCount.current = 0;
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start SpeechRecognition:', err);
      }
    }
  }, [isListening]);

  const stopTranscript = React.useCallback(() => {
    intentionallyStopped.current = true;
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
