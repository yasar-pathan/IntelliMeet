import * as React from 'react';
import { useMeetingStore } from '@/stores/meetingStore';

export interface MediaStartOptions {
  video?: boolean;
  audio?: boolean;
}

export function useMediaDevices() {
  const {
    localStream,
    isVideoOn,
    isAudioOn,
    setLocalStream,
    setVideoOn,
    setAudioOn,
  } = useMeetingStore();

  const startMedia = React.useCallback(
    async (options: MediaStartOptions = { video: true, audio: true }) => {
      const wantVideo = options.video ?? true;
      const wantAudio = options.audio ?? true;

      if (!wantVideo && !wantAudio) {
        setLocalStream(null);
        setVideoOn(false);
        setAudioOn(false);
        return null;
      }

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: wantVideo,
          audio: wantAudio,
        });
        setLocalStream(stream);
        setVideoOn(wantVideo && stream.getVideoTracks().some((t) => t.enabled));
        setAudioOn(wantAudio && stream.getAudioTracks().some((t) => t.enabled));
        return stream;
      } catch (error) {
        console.warn('Could not acquire requested media. Trying fallbacks...', error);

        if (wantAudio) {
          try {
            const audioStream = await navigator.mediaDevices.getUserMedia({
              video: false,
              audio: true,
            });
            setLocalStream(audioStream);
            setVideoOn(false);
            setAudioOn(true);
            return audioStream;
          } catch (audioErr) {
            console.error('Failed to get audio:', audioErr);
          }
        }

        if (wantVideo) {
          try {
            const videoStream = await navigator.mediaDevices.getUserMedia({
              video: true,
              audio: false,
            });
            setLocalStream(videoStream);
            setVideoOn(true);
            setAudioOn(false);
            return videoStream;
          } catch (videoErr) {
            console.error('Failed to get video:', videoErr);
          }
        }

        setVideoOn(false);
        setAudioOn(false);
        return null;
      }
    },
    [setLocalStream, setVideoOn, setAudioOn]
  );

  const stopMedia = React.useCallback(() => {
    const stream = useMeetingStore.getState().localStream;
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setLocalStream(null);
    }
    setVideoOn(false);
    setAudioOn(false);
  }, [setLocalStream, setVideoOn, setAudioOn]);

  const toggleVideo = React.useCallback(async (): Promise<boolean> => {
    const stream = useMeetingStore.getState().localStream;

    if (!stream) {
      const newStream = await startMedia({ video: true, audio: useMeetingStore.getState().isAudioOn });
      return newStream ? newStream.getVideoTracks().some(t => t.enabled) : false;
    }

    const videoTrack = stream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.enabled = !videoTrack.enabled;
      setVideoOn(videoTrack.enabled);
      return videoTrack.enabled;
    }

    if (!useMeetingStore.getState().isVideoOn) {
      try {
        const videoOnly = await navigator.mediaDevices.getUserMedia({ video: true });
        const newTrack = videoOnly.getVideoTracks()[0];
        if (newTrack) {
          stream.addTrack(newTrack);
          const newStream = new MediaStream(stream.getTracks());
          setLocalStream(newStream);
          setVideoOn(true);
          return true;
        }
      } catch (error) {
        console.error('Failed to enable video track:', error);
      }
    }

    return useMeetingStore.getState().isVideoOn;
  }, [startMedia, setLocalStream, setVideoOn]);

  const toggleAudio = React.useCallback(async (): Promise<boolean> => {
    const stream = useMeetingStore.getState().localStream;

    if (!stream) {
      const newStream = await startMedia({ video: useMeetingStore.getState().isVideoOn, audio: true });
      return newStream ? newStream.getAudioTracks().some(t => t.enabled) : false;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = !audioTrack.enabled;
      setAudioOn(audioTrack.enabled);
      return audioTrack.enabled;
    }

    if (!useMeetingStore.getState().isAudioOn) {
      try {
        const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
        const newTrack = audioOnly.getAudioTracks()[0];
        if (newTrack) {
          stream.addTrack(newTrack);
          const newStream = new MediaStream(stream.getTracks());
          setLocalStream(newStream);
          setAudioOn(true);
          return true;
        }
      } catch (error) {
        console.error('Failed to enable audio track:', error);
      }
    }

    return useMeetingStore.getState().isAudioOn;
  }, [startMedia, setLocalStream, setAudioOn]);

  return {
    localStream,
    isVideoOn,
    isAudioOn,
    startMedia,
    stopMedia,
    toggleVideo,
    toggleAudio,
  };
}
