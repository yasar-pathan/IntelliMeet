import * as React from 'react';
import { cn } from '@/lib/utils';

interface AuthLayoutProps {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({ children, title, subtitle }) => {
  return (
    <div className="flex min-h-screen w-screen bg-background overflow-hidden select-none">
      {/* Form Section */}
      <div className="flex flex-col flex-1 justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24 bg-background z-10">
        <div className="mx-auto w-full max-w-sm lg:w-96">
          {/* Brand Logo Header */}
          <div className="text-left mb-8">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-primary text-primary-foreground font-black text-xl mb-3">
              I
            </div>
            <h1 className="text-2xl font-bold text-foreground leading-tight">{title}</h1>
            <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{subtitle}</p>
          </div>

          {/* Form Content */}
          <div className="mt-6">{children}</div>
        </div>
      </div>

      {/* Hero Visual Section (Hidden on mobile) */}
      <div className="hidden lg:block relative flex-1 w-0 bg-muted border-l border-border/40">
        <div className="absolute inset-0 bg-gradient-to-tr from-primary/10 via-primary/5 to-background z-0" />
        <div className="absolute inset-0 flex flex-col justify-between p-16 text-left z-10">
          {/* Pitch */}
          <div className="max-w-md">
            <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary mb-4">
              Enterprise SaaS
            </span>
            <h2 className="text-3xl font-extrabold text-foreground leading-tight tracking-tight">
              Intelligent Meetings. Seamless Collaboration.
            </h2>
            <p className="text-sm text-muted-foreground mt-4 leading-relaxed">
              IntellMeet brings real-time WebRTC meetings, instant transcripts, and generative AI
              summaries directly into your workspace workflow.
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
