import * as React from 'react';
import type { Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/authStore';
import { SocketContext } from '@/hooks/useSocket';
import { getSocket, disconnectSocket } from '@/lib/socket';

interface SocketProviderProps {
  children: React.ReactNode;
}

export const SocketProvider: React.FC<SocketProviderProps> = ({ children }) => {
  const { accessToken } = useAuthStore();
  const [socket, setSocket] = React.useState<Socket | null>(null);

  React.useEffect(() => {
    if (accessToken) {
      const socketInstance = getSocket(accessToken);
      setSocket(socketInstance);
    } else {
      disconnectSocket();
      setSocket(null);
    }

    return () => {
      // Don't disconnect here on minor re-renders,
      // but let's handle cleanup on full unmount of provider if session ends
    };
  }, [accessToken]);

  // Handle final app unmount cleanup
  React.useEffect(() => {
    return () => {
      disconnectSocket();
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
