import * as React from 'react';

export interface FloatingReaction {
  id: string;
  emoji: string;
  left: number; // percentage
  drift: number; // horizontal drift in px
}

interface ReactionOverlayProps {
  reactions: FloatingReaction[];
}

export const ReactionOverlay: React.FC<ReactionOverlayProps> = ({ reactions }) => {
  return (
    <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden select-none">
      {/* Dynamic Keyframe style injector */}
      <style>{`
        @keyframes reactionFloatUp {
          0% {
            transform: translateY(100%) scale(0.6);
            opacity: 0;
          }
          15% {
            opacity: 1;
            transform: translateY(80%) scale(1.3);
          }
          100% {
            transform: translateY(-10vh) translateX(var(--drift)) scale(0.8);
            opacity: 0;
          }
        }
        .floating-reaction-item {
          position: absolute;
          bottom: 0;
          font-size: 2.2rem;
          animation: reactionFloatUp 2.8s cubic-bezier(0.08, 0.82, 0.17, 1) forwards;
        }
      `}</style>

      {reactions.map((r) => (
        <div
          key={r.id}
          className="floating-reaction-item"
          style={
            {
              left: `${r.left}%`,
              '--drift': `${r.drift}px`,
            } as React.CSSProperties
          }
        >
          {r.emoji}
        </div>
      ))}
    </div>
  );
};
