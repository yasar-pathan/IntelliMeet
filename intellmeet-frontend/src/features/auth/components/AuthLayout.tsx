import * as React from 'react';
import { cn } from '@/lib/utils';
import { Brain } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="relative flex min-h-screen w-screen overflow-hidden bg-slate-950">
      {/* Background blobs */}
      <div className="absolute top-0 left-0 h-96 w-96 rounded-full bg-blue-600/20 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.12),transparent_40%)]" />

      {/* Form Section */}
      <div className="relative z-10 flex flex-col flex-1 justify-center px-6 py-12 sm:px-8 lg:flex-none lg:px-20 xl:px-24">
        <div className="mx-auto w-full max-w-md rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl p-8 shadow-2xl">
          {/* Brand Logo Header */}
          <div className="text-left mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-r from-blue-500 to-purple-600 text-white mb-5 shadow-xl">
              <Brain className="h-7 w-7" />
            </div>
            <h1 className="text-3xl font-bold text-white leading-tight">{title}</h1>
            <p className="text-sm text-slate-400 mt-2 leading-relaxed">{subtitle}</p>
          </div>

          {/* Form Content */}
          <div className="mt-6">{children}</div>
        </div>
      </div>

      {/* Hero Visual Section (Hidden on mobile) */}
      <div className="hidden lg:flex relative flex-1 flex-col justify-center px-20">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-primary/5 to-background z-0" />
        <div className="absolute inset-0 flex flex-col justify-between p-16 text-left z-10">
          {/* Pitch */}
          <div className="max-w-xl">
            <span className="inline-flex items-center rounded-full border border-blue-500/30 bg-blue-500/10 px-4 py-2 text-xs font-semibold text-blue-400 mb-6">
              AI Powered Collaboration
            </span>
            <h2 className="text-6xl font-extrabold text-white leading-tight tracking-tight">
              Smarter Meetings.
              <br />
              Faster Decisions.
            </h2>
            <p className="text-lg text-slate-400 mt-6 leading-relaxed">
              Conduct secure meetings, generate AI summaries,
              capture action items, and collaborate with your
              entire team in real time.
            </p>
          </div>

          {/* Quote Card */}
          <div className="rounded-xl border border-border bg-card/60 backdrop-blur-md p-6 max-w-md shadow-sm">
            <p className="text-xs text-muted-foreground leading-relaxed">
              "The AI summaries have saved our product teams hours of alignment. We can instantly
              flush meeting transcripts straight into Kanban tasks."
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center text-xs font-bold text-foreground">
                SP
              </div>
              <div>
                <p className="text-xs font-bold text-foreground">Sarah Parker</p>
                <p className="text-[10px] text-muted-foreground">VP of Product, CloudScale</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
