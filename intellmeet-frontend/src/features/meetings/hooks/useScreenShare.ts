import * as React from 'react';
import { useMeetingStore } from '@/stores/meetingStore';

export function useScreenShare() {
  const {
    screenStream,
    isScreenSharing,
    setScreenStream,
    setScreenSharing,
    localStream,
  } = useMeetingStore();

  const startScreenShare = React.useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });

      setScreenStream(stream);
      setScreenSharing(true);

      // Listen for browser's native "Stop Sharing" button click
      stream.getVideoTracks()[0].onended = () => {
        stopScreenShare();
      };

      return stream;
    } catch (error) {
      console.error('Failed to get screen share stream:', error);
      setScreenSharing(false);
      return null;
    }
  }, [setScreenStream, setScreenSharing]);

  const stopScreenShare = React.useCallback(() => {
    if (screenStream) {
      screenStream.getTracks().forEach((track) => track.stop());
      setScreenStream(null);
    }
    setScreenSharing(false);
  }, [screenStream, setScreenStream, setScreenSharing]);

  return {
    screenStream,
    isScreenSharing,
    startScreenShare,
    stopScreenShare,
  };
}
