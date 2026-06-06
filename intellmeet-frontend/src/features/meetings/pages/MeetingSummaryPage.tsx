import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Calendar, Users, FileText, CheckSquare, Sparkles, Loader2, ArrowLeft, BrainCircuit, Film } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/Tabs';
import { Avatar } from '@/components/common/Avatar';
import { DateDisplay } from '@/components/common/DateDisplay';
import { formatDuration } from '@/lib/utils';
import api from '@/lib/axios';
import { useAuthStore } from '@/stores/authStore';
import { DeleteMeetingButton } from '@/features/meetings/components/DeleteMeetingButton';
import { MeetingAiChat } from '@/features/meetings/components/MeetingAiChat';
import { getMeetingHostId } from '@/features/meetings/api/meetingsApi';
import type { ApiResponse } from '@/types/api';
import type { Meeting } from '@/types/models';

export const MeetingSummaryPage: React.FC = () => {
  const { meetingId } = useParams<{ meetingId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = React.useState('summary');

  // Fetch past meeting details
  const { data: meetingData, isLoading: meetingLoading } = useQuery<ApiResponse<Meeting>>({
    queryKey: ['meetings', 'detail', meetingId],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Meeting>>(`/meetings/${meetingId}`);
      return response.data;
    },
    enabled: !!meetingId,
  });

  const meeting = meetingData?.data;
  const hasRecording = Boolean(meeting?.recording?.s3Key || meeting?.recording?.s3Url);

  const { data: playbackData, isLoading: playbackLoading } = useQuery<
    ApiResponse<{ playbackUrl: string; duration: number; storage?: string }>
  >({
    queryKey: ['meetings', 'recording-playback', meetingId],
    queryFn: async () => {
      const response = await api.get<
        ApiResponse<{ playbackUrl: string; duration: number; storage?: string }>
      >(`/meetings/${meetingId}/recording/playback`);
      return response.data;
    },
    enabled: !!meetingId && hasRecording,
  });

  const playbackUrl = playbackData?.data?.playbackUrl || meeting?.recording?.s3Url;
  const usesAuthStream =
    playbackData?.data?.storage === 'local' ||
    (playbackUrl && playbackUrl.includes('/recording/stream'));

  const { data: recordingBlobUrl } = useQuery<string, Error>({
    queryKey: ['meetings', 'recording-blob', meetingId],
    queryFn: async () => {
      const response = await api.get(`/meetings/${meetingId}/recording/stream`, {
        responseType: 'blob',
        timeout: 120000,
      });
      return URL.createObjectURL(response.data);
    },
    enabled: Boolean(meetingId && hasRecording && usesAuthStream),
    staleTime: Infinity,
  });

  React.useEffect(() => {
    return () => {
      if (recordingBlobUrl) {
        URL.revokeObjectURL(recordingBlobUrl);
      }
    };
  }, [recordingBlobUrl]);

  const recordingSrc = usesAuthStream ? recordingBlobUrl : playbackUrl;

  const isLocalFallbackStoredSummary = (text?: string) =>
    !!text &&
    /generated locally|temporarily unavailable|fallback summary|summary generation failed/i.test(text);

  const isHost = Boolean(user?._id && meeting && getMeetingHostId(meeting) === user._id);

  const regenerateSummaryMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post<
        ApiResponse<{ summary: string; keyPoints: string[]; decisions: string[]; sentiment: string }>
      >(`/ai/summarize/${meetingId}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('AI notes updated');
      queryClient.invalidateQueries({ queryKey: ['meetings', 'detail', meetingId] });
      queryClient.invalidateQueries({ queryKey: ['meetings', 'summary', meetingId] });
    },
    onError: () => {
      toast.error('Failed to regenerate AI notes. Check GEMINI_API_KEY and restart the backend.');
    },
  });

  const { data: summaryData, isLoading: summaryLoading, refetch: generateSummary } = useQuery<
    ApiResponse<{ summary: string; keyPoints: string[]; decisions: string[]; sentiment: string }>
  >({
    queryKey: ['meetings', 'summary', meetingId],
    queryFn: async () => {
      const response = await api.post<
        ApiResponse<{ summary: string; keyPoints: string[]; decisions: string[]; sentiment: string }>
      >(`/ai/summarize/${meetingId}`);
      return response.data;
    },
    enabled:
      !!meetingId &&
      activeTab === 'summary' &&
      !meeting?.aiSummary?.summary &&
      !isLocalFallbackStoredSummary(meeting?.aiSummary?.summary) &&
      !regenerateSummaryMutation.isPending,
  });

  const aiSummary = meeting?.aiSummary || summaryData?.data;
  const hasWeakSummary =
    !!aiSummary?.summary &&
    (isLocalFallbackStoredSummary(aiSummary.summary) ||
      aiSummary.keyPoints?.some((p) => /could not be generated/i.test(p)));
  const hasRealAiSummary = !!aiSummary?.summary && !hasWeakSummary;

  // Mutation to convert an action item to a Kanban task
  const convertTaskMutation = useMutation({
    mutationFn: async ({ text }: { text: string }) => {
      await api.post('/tasks', {
        title: text,
        description: `AI-extracted action item from meeting: ${meeting?.title}`,
        status: 'todo',
        priority: 'medium',
        meeting: meetingId,
      });
    },
    onSuccess: () => {
      toast.success('Action item successfully converted to a task!');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
    onError: () => {
      toast.error('Failed to convert action item to task');
    },
  });

  if (meetingLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <span className="text-xs text-muted-foreground mt-3 font-semibold">Loading meeting logs...</span>
      </div>
    );
  }

  if (!meeting) {
    return (
      <PageContainer>
        <div className="text-center py-12">
          <p className="text-sm text-destructive font-semibold">Meeting not found</p>
          <Button onClick={() => navigate('/meetings')} variant="outline" className="mt-4">
            Back to Meetings
          </Button>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      {/* Top Navigation */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => navigate('/meetings')}
          className="p-1.5 rounded-lg border border-border/60 hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-xs text-muted-foreground font-semibold">Back to meetings list</span>
      </div>

      {/* Title Details Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left pb-6 border-b border-border/40">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">{meeting.title}</h1>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              <DateDisplay date={meeting.startedAt || meeting.createdAt} formatType="display" />
            </span>
            {meeting.duration && (
              <span>Duration: {formatDuration(meeting.duration)}</span>
            )}
            <span>{meeting.participants?.length || 0} participants</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(!hasRealAiSummary || hasWeakSummary) && (
            <Button
              onClick={() =>
                hasWeakSummary || meeting?.aiSummary?.summary
                  ? regenerateSummaryMutation.mutate()
                  : generateSummary()
              }
              isLoading={summaryLoading || regenerateSummaryMutation.isPending}
              className="gap-1.5 cursor-pointer"
            >
              <BrainCircuit className="h-4 w-4" />
              {hasWeakSummary ? 'Regenerate with Gemini' : 'Generate AI Notes'}
            </Button>
          )}
          {isHost && meetingId && (
            <DeleteMeetingButton
              meetingId={meetingId}
              meetingTitle={meeting.title}
              hasRecording={hasRecording}
            />
          )}
        </div>
      </div>

      {/* Main Tabs Layout */}
      <Tabs defaultValue="summary" value={activeTab} onValueChange={setActiveTab}>
        <div className="flex justify-start mb-6">
          <TabsList>
            <TabsTrigger value="summary">AI Notes & Summary</TabsTrigger>
            <TabsTrigger value="aiChat">AI Assistant Q&A</TabsTrigger>
            {hasRecording && <TabsTrigger value="recording">Recording</TabsTrigger>}
            <TabsTrigger value="actionItems">Action Items</TabsTrigger>
            <TabsTrigger value="transcript">Full Transcript</TabsTrigger>
          </TabsList>
        </div>

        {hasRecording && (
          <TabsContent value="recording">
            <Card className="overflow-hidden">
              <CardHeader className="pb-3 border-b border-border/30">
                <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <Film className="h-4 w-4" /> Meeting Recording
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4">
                {playbackLoading || (usesAuthStream && !recordingSrc) ? (
                  <div className="flex flex-col items-center justify-center min-h-[200px] text-muted-foreground">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                    <span className="text-xs font-semibold">Loading recording...</span>
                  </div>
                ) : recordingSrc ? (
                  <>
                    <video
                      src={recordingSrc}
                      controls
                      className="w-full max-h-[480px] rounded-lg bg-black"
                      preload="metadata"
                    >
                      Your browser does not support video playback.
                    </video>
                    {!usesAuthStream && playbackUrl && (
                      <a
                        href={playbackUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block mt-3 text-xs font-semibold text-primary hover:underline"
                      >
                        Open recording in new tab
                      </a>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">
                    Recording metadata exists but the file could not be loaded.
                  </p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Tab: AI Chat */}
        <TabsContent value="aiChat">
          <div className="max-w-4xl mx-auto">
            <MeetingAiChat meetingId={meetingId!} />
          </div>
        </TabsContent>

        {/* Tab 1: AI Summary & Notes */}
        <TabsContent value="summary">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Summary Details Left Area */}
            <div className="lg:col-span-2 space-y-6">
              {summaryLoading ? (
                <Card className="p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                  <Loader2 className="h-6 w-6 animate-spin text-primary mb-2" />
                  <p className="text-xs text-muted-foreground font-semibold">AI is analyzing transcript...</p>
                </Card>
              ) : aiSummary ? (
                <div className="space-y-6 text-left">
                  {hasWeakSummary && (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-900 dark:text-amber-100">
                      This overview used a local fallback because Gemini was unavailable (outdated model
                      name or API key). Click <strong>Regenerate with Gemini</strong> after restarting the
                      backend with updated model settings.
                    </div>
                  )}
                  {/* Summary Card */}
                  <Card>
                    <CardHeader className="pb-3 border-b border-border/30">
                      <CardTitle className="text-sm font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                        <Sparkles className="h-4 w-4" /> AI Overview
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 text-sm leading-relaxed text-foreground/80 space-y-4">
                      <p>{aiSummary.summary}</p>
                    </CardContent>
                  </Card>

                  {/* Key Points */}
                  {aiSummary.keyPoints && aiSummary.keyPoints.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3 border-b border-border/30">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                          Key Takeaways
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="list-disc list-inside space-y-2 text-sm text-foreground/85">
                          {aiSummary.keyPoints.map((pt, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {pt}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}

                  {/* Decisions */}
                  {aiSummary.decisions && aiSummary.decisions.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3 border-b border-border/30">
                        <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                          Decisions Made
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pt-4">
                        <ul className="list-disc list-inside space-y-2 text-sm text-foreground/85">
                          {aiSummary.decisions.map((dec, idx) => (
                            <li key={idx} className="leading-relaxed">
                              {dec}
                            </li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  )}
                </div>
              ) : (
                <Card className="p-8 text-center flex flex-col items-center justify-center min-h-[200px]">
                  <BrainCircuit className="h-8 w-8 text-muted-foreground opacity-40 mb-3" />
                  <p className="text-sm font-bold text-foreground">No AI notes generated yet</p>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                    Click the generate button above to run Gemini AI analysis over the transcript.
                  </p>
                </Card>
              )}
            </div>

            {/* Sidebar Details Area (Sentiment, Participants list) */}
            <div className="space-y-6">
              {aiSummary?.sentiment && (
                <Card className="text-left">
                  <CardHeader className="pb-2 border-b border-border/30">
                    <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
                      Meeting Sentiment
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-muted text-foreground border border-border/30 capitalize">
                      {aiSummary.sentiment}
                    </span>
                  </CardContent>
                </Card>
              )}

              {/* Participants list */}
              <Card className="text-left">
                <CardHeader className="pb-3 border-b border-border/30">
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Users className="h-4 w-4 text-primary" /> Attended Peers
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-4 max-h-[300px] overflow-y-auto custom-scrollbar p-0">
                  {meeting.participants?.map((p, idx) => {
                    const u = typeof p.user === 'string' ? null : p.user;
                    if (!u) return null;
                    return (
                      <div
                        key={idx}
                        className="flex items-center gap-3 px-4 py-2 hover:bg-muted/30 transition-colors"
                      >
                        <Avatar name={u.name} src={u.avatar} size="sm" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-foreground truncate">{u.name}</p>
                          <p className="text-[9px] text-muted-foreground capitalize truncate">
                            {p.role}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Tab 2: Action Items */}
        <TabsContent value="actionItems">
          <Card className="text-left">
            <CardHeader className="pb-3 border-b border-border/30 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <CheckSquare className="h-4 w-4 text-primary" /> Action Items Checklist
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {meeting.actionItems && meeting.actionItems.length > 0 ? (
                <div className="divide-y divide-border/30">
                  {meeting.actionItems.map((act, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between py-3.5 hover:bg-muted/10 px-2 rounded-lg transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="flex-shrink-0 text-muted-foreground text-xs font-semibold">
                          {idx + 1}.
                        </span>
                        <span className="text-sm font-semibold text-foreground/80 leading-relaxed">
                          {act.text}
                        </span>
                      </div>
                      <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => convertTaskMutation.mutate({ text: act.text })}
                        disabled={convertTaskMutation.isPending}
                        className="cursor-pointer"
                      >
                        Convert to Task
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No action items extracted for this meeting.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3: Full Transcript Logs */}
        <TabsContent value="transcript">
          <Card className="text-left">
            <CardHeader className="pb-3 border-b border-border/30">
              <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <FileText className="h-4 w-4 text-primary" /> Persisted Meeting Transcript
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              {meeting.transcript ? (
                <div className="bg-muted/40 p-4 rounded-xl border border-border/30 font-sans text-sm text-foreground/85 whitespace-pre-wrap leading-relaxed max-h-[500px] overflow-y-auto custom-scrollbar">
                  {meeting.transcript}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No transcript logs captured for this meeting session.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
};

export default MeetingSummaryPage;
