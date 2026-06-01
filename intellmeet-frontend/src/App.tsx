import * as React from 'react';
import { Toaster } from 'sonner';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { QueryProvider } from '@/app/providers/QueryProvider';
import { AuthProvider } from '@/app/providers/AuthProvider';
import { SocketProvider } from '@/app/providers/SocketProvider';
import { AppRouter } from '@/app/Router';
import { ErrorBoundary } from '@/components/common/ErrorBoundary';

function App() {
  return (
    <ErrorBoundary>
      <QueryProvider>
        <ThemeProvider>
          <AuthProvider>
            <SocketProvider>
              <AppRouter />
              <Toaster
                closeButton
                position="top-right"
                richColors
                theme="system"
              />
            </SocketProvider>
          </AuthProvider>
        </ThemeProvider>
      </QueryProvider>
    </ErrorBoundary>
  );
}

export default App;
