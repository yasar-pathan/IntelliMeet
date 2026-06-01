import * as React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import api from '@/lib/axios';

const RECORDING_UPLOAD_TIMEOUT_MS = 5 * 60 * 1000;

const pickRecorderMimeType = () => {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type));
};

function getApiErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { status?: number; data?: { message?: string } };
    message?: string;
    code?: string;
  };
  if (err.response?.data?.message) {
    return err.response.data.message;
  }
  if (err.response?.status) {
    return `Upload failed (HTTP ${err.response.status})`;
  }
  if (err.code === 'ECONNABORTED') {
    return 'Upload timed out — try a shorter recording or check your connection';
  }
  if (err.message === 'Network Error') {
    return 'Upload failed — connection was interrupted. Keep the meeting open until upload finishes.';
  }
  return err.message || fallback;
}

export function useMeetingRecording(
  meetingId: string | undefined,
  localStream: MediaStream | null,
  isHost: boolean
) {
  const queryClient = useQueryClient();
  const mediaRecorderRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const startedAtRef = React.useRef<number>(0);

  const [isRecording, setIsRecording] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);

  const startRecording = React.useCallback(async () => {
    if (!meetingId || !localStream || !isHost) return;

    try {
      await api.post(`/meetings/${meetingId}/recording/start`);

      const mimeType = pickRecorderMimeType();
      if (!mimeType) {
        toast.error('This browser does not support meeting recording');
        return;
      }

      const recorder = new MediaRecorder(localStream, { mimeType });
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.start(1000);
      mediaRecorderRef.current = recorder;
      startedAtRef.current = Date.now();
      setIsRecording(true);
      toast.success('Recording started');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to start recording'));
    }
  }, [isHost, localStream, meetingId]);

  const stopRecording = React.useCallback(async () => {
    if (!meetingId || !mediaRecorderRef.current) return;

    const recorder = mediaRecorderRef.current;
    setIsUploading(true);

    const uploadBlob = async () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      if (!blob.size) {
        throw new Error('Recording is empty — record for at least a few seconds');
      }

      const durationSeconds = Math.max(
        1,
        Math.round((Date.now() - startedAtRef.current) / 1000)
      );

      const mimeBase = (recorder.mimeType || 'video/webm').split(';')[0].trim();
      const recordingFile = new File([blob], `meeting-${meetingId}.webm`, {
        type: mimeBase || 'video/webm',
      });

      const formData = new FormData();
      formData.append('recording', recordingFile);
      formData.append('duration', String(durationSeconds));

      await api.post(`/meetings/${meetingId}/recording/upload`, formData, {
        timeout: RECORDING_UPLOAD_TIMEOUT_MS,
      });
    };

    try {
      await new Promise<void>((resolve, reject) => {
        recorder.onstop = () => {
          uploadBlob().then(resolve).catch(reject);
        };
        recorder.stop();
      });

      setIsRecording(false);
      mediaRecorderRef.current = null;
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
      if (meetingId) {
        queryClient.invalidateQueries({ queryKey: ['meetings', 'detail', meetingId] });
        queryClient.invalidateQueries({ queryKey: ['meetings', 'recording-playback', meetingId] });
      }
      toast.success('Recording saved — view it on the meeting summary page');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to save recording'));
      setIsRecording(false);
      mediaRecorderRef.current = null;
    } finally {
      setIsUploading(false);
    }
  }, [meetingId, queryClient]);

  const toggleRecording = React.useCallback(async () => {
    if (isUploading) return;
    if (isRecording) {
      await stopRecording();
      return;
    }
    await startRecording();
  }, [isRecording, isUploading, startRecording, stopRecording]);

  React.useEffect(() => {
    return () => {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  return {
    isRecording,
    isUploading,
    toggleRecording,
  };
}
