import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { MessageSquare, Loader2, Send } from 'lucide-react';
import { Avatar } from '@/components/common/Avatar';
import { Button } from '@/components/ui/Button';
import { formatRelativeTime } from '@/lib/utils';
import api from '@/lib/axios';
import type { TaskComment, User } from '@/types/models';

interface TaskCommentsProps {
  taskId: string;
  comments: TaskComment[];
}

export const TaskComments: React.FC<TaskCommentsProps> = ({ taskId, comments }) => {
  const queryClient = useQueryClient();
  const [content, setContent] = React.useState('');

  const commentMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/tasks/${taskId}/comments`, { content });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Comment added successfully');
      setContent('');
    },
    onError: () => {
      toast.error('Failed to post comment');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    commentMutation.mutate();
  };

  return (
    <div className="space-y-4 text-left select-none">
      <div className="flex items-center gap-1.5 border-b border-border/30 pb-2">
        <MessageSquare className="h-4 w-4 text-primary" />
        <span className="text-sm font-bold text-foreground">Comments</span>
        <span className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full font-bold">
          {comments.length}
        </span>
      </div>

      {/* Input Form */}
      <form onSubmit={handleSubmit} className="space-y-2">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write a comment..."
          className="flex min-h-[60px] w-full rounded-lg border border-input bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 transition-all"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            size="sm"
            disabled={!content.trim() || commentMutation.isPending}
            isLoading={commentMutation.isPending}
            className="cursor-pointer gap-1"
          >
            <Send className="h-3 w-3" /> Post Comment
          </Button>
        </div>
      </form>

      {/* Comments List */}
      <div className="space-y-3 mt-4 max-h-[300px] overflow-y-auto custom-scrollbar pr-1">
        {comments.length > 0 ? (
          comments.map((comment, idx) => {
            const commenter = typeof comment.user === 'string' ? null : (comment.user as User);
            const commenterName = commenter ? commenter.name : 'Teammate';
            const commenterAvatar = commenter ? commenter.avatar : '';

            return (
              <div key={idx} className="flex gap-3 items-start p-2 hover:bg-muted/10 rounded-lg transition-colors">
                <Avatar name={commenterName} src={commenterAvatar} size="sm" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="text-xs font-bold text-foreground truncate">{commenterName}</span>
                    <span className="text-[9px] text-muted-foreground/80 flex-shrink-0">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed leading-snug">{comment.content}</p>
                </div>
              </div>
            );
          })
        ) : (
          <p className="text-xs text-muted-foreground text-center py-6">No comments posted yet.</p>
        )}
      </div>
    </div>
  );
};
export default TaskComments;
