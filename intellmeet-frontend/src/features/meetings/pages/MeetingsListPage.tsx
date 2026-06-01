import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Plus, Video, History, Calendar, Radio } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { MeetingFilters } from '@/features/meetings/components/MeetingFilters';
import { MeetingCard } from '@/features/meetings/components/MeetingCard';
import { CreateMeetingDialog } from '@/features/meetings/components/CreateMeetingDialog';
import { SkeletonCard } from '@/components/common/SkeletonCard';
import { EmptyState } from '@/components/common/EmptyState';
import { Button } from '@/components/ui/Button';
import { fetchMeetings } from '@/features/meetings/api/meetingsApi';
import { cn } from '@/lib/utils';

type MeetingTab = 'all' | 'scheduled' | 'live' | 'history';

const TAB_CONFIG: { id: MeetingTab; label: string; icon: React.ElementType; status?: string }[] = [
  { id: 'all', label: 'All', icon: Video },
  { id: 'scheduled', label: 'Upcoming', icon: Calendar, status: 'scheduled' },
  { id: 'live', label: 'Live', icon: Radio, status: 'live' },
  { id: 'history', label: 'Meeting History', icon: History, status: 'ended' },
];

export const MeetingsListPage: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState<MeetingTab>('all');
  const [search, setSearch] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState('');
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);

  const tabStatus = TAB_CONFIG.find((t) => t.id === activeTab)?.status;
  const apiStatus = statusFilter || tabStatus;

  const { data, isLoading } = useQuery({
    queryKey: ['meetings', 'list', activeTab, apiStatus],
    queryFn: () => fetchMeetings({ status: apiStatus, limit: 50 }),
  });

  const meetings = data?.meetings ?? [];

  const filteredMeetings = meetings.filter((meeting) =>
    meeting.title.toLowerCase().includes(search.toLowerCase())
  );

  const emptyCopy =
    activeTab === 'history'
      ? {
          title: 'No past meetings yet',
          description:
            'Meetings you host or join appear here after everyone leaves the room. AI summaries and recordings (when saved) are available from each card.',
        }
      : {
          title: 'No meetings found',
          description: 'Schedule a collaboration session or launch an instant room to get started.',
        };

  return (
    <PageContainer>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            {activeTab === 'history' ? 'Meeting History' : 'Meetings'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {activeTab === 'history'
              ? 'Past sessions you hosted or attended — open any card for AI notes, transcript, and recordings.'
              : 'Manage scheduled meetings, join live rooms, or browse your history.'}
          </p>
        </div>
        <Button
          onClick={() => setCreateDialogOpen(true)}
          className="sm:self-center gap-1.5 self-start cursor-pointer"
        >
          <Plus className="h-4 w-4" /> Schedule Meeting
        </Button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {TAB_CONFIG.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => {
              setActiveTab(id);
              setStatusFilter('');
            }}
            className={cn(
              'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors cursor-pointer',
              activeTab === id
                ? 'bg-primary text-primary-foreground border-primary'
                : 'bg-card text-muted-foreground border-border hover:text-foreground'
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </button>
        ))}
      </div>

      <MeetingFilters
        search={search}
        onSearchChange={setSearch}
        status={statusFilter}
        onStatusChange={setStatusFilter}
        hideStatusFilter={activeTab !== 'all'}
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, idx) => (
            <SkeletonCard key={idx} />
          ))}
        </div>
      ) : filteredMeetings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredMeetings.map((meeting) => (
            <MeetingCard key={meeting._id} meeting={meeting} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={emptyCopy.title}
          description={emptyCopy.description}
          icon={activeTab === 'history' ? <History className="h-6 w-6" /> : <Video className="h-6 w-6" />}
          action={
            activeTab !== 'history' ? (
              <Button onClick={() => setCreateDialogOpen(true)} variant="primary">
                Schedule your first meeting
              </Button>
            ) : undefined
          }
        />
      )}

      <CreateMeetingDialog isOpen={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />
    </PageContainer>
  );
};

export default MeetingsListPage;
