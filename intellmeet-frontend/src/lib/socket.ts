import { io, type Socket } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

let socket: Socket | null = null;

/**
 * Get or create the Socket.io client singleton.
 * Pass the access token for authentication.
 */
export function getSocket(token: string): Socket {
  if (socket) {
    const currentToken = (socket.auth as { token?: string } | undefined)?.token;
    if (currentToken !== token) {
      socket.auth = { token };
      if (socket.connected) {
        socket.disconnect();
      }
      socket.connect();
    }
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 20000,
  });

  socket.on('connect', () => {
    console.log('[Socket] Connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket] Disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('[Socket] Connection error:', error.message);
  });

  return socket;
}

/**
 * Disconnect and cleanup the socket instance.
 */
export function disconnectSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
}

/**
 * Get the current socket instance (may be null).
 */
export function getCurrentSocket(): Socket | null {
  return socket;
}
