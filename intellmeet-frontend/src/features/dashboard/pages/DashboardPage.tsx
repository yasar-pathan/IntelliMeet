import * as React from 'react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';
import { PageContainer } from '@/components/layout/PageContainer';
import { QuickActions } from '@/features/dashboard/components/QuickActions';
import { DashboardHero } from '@/features/dashboard/components/DashboardHero';
import { UpcomingMeetings } from '@/features/dashboard/components/UpcomingMeetings';
import { RecentActivity } from '@/features/dashboard/components/RecentActivity';
import { ProductivitySnapshot } from '@/features/dashboard/components/ProductivitySnapshot';
import { ActiveTeamMembers } from '@/features/dashboard/components/ActiveTeamMembers';

// Dialog components (we will import the real components as we build them)
// For now, we will declare simple modal inline forms for high UX fidelity!
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/Dialog';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Switch } from '@/components/ui/Switch';
import api from '@/lib/axios';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { invalidateDashboardStats } from '@/lib/queryClient';

export const DashboardPage: React.FC = () => {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Modal open states
  const [newMeetingOpen, setNewMeetingOpen] = React.useState(false);
  const [joinMeetingOpen, setJoinMeetingOpen] = React.useState(false);
  const [createTaskOpen, setCreateTaskOpen] = React.useState(false);
  const [createTeamOpen, setCreateTeamOpen] = React.useState(false);

  // Form states
  const [meetingTitle, setMeetingTitle] = React.useState('');
  const [meetingPass, setMeetingPass] = React.useState('');
  const [waitingRoom, setWaitingRoom] = React.useState(false);
  const [joinCode, setJoinCode] = React.useState('');
  const [taskTitle, setTaskTitle] = React.useState('');
  const [teamName, setTeamName] = React.useState('');

  const [loading, setLoading] = React.useState(false);

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meetingTitle) return;
    setLoading(true);
    try {
      const payload: any = {
        title: meetingTitle,
        isPasswordProtected: !!meetingPass,
        settings: {
          waitingRoom,
        },
      };
      
      if (meetingPass) {
        payload.password = meetingPass;
      }

      const response = await api.post('/meetings', payload);
      toast.success('Meeting scheduled successfully!');
      setNewMeetingOpen(false);
      setMeetingTitle('');
      setMeetingPass('');
      setWaitingRoom(false);
      // Navigate to the live meeting room
      navigate(`/meeting/${response.data.data.meetingCode}`);
      await invalidateDashboardStats(queryClient);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create meeting');
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode) return;
    setLoading(true);
    try {
      const response = await api.get(`/meetings/code/${joinCode}`);
      toast.success('Meeting found! Joining...');
      setJoinMeetingOpen(false);
      setJoinCode('');
      navigate(`/meeting/${joinCode}`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Meeting code not found');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;
    setLoading(true);
    try {
      await api.post('/tasks', {
        title: taskTitle,
        status: 'todo',
        priority: 'medium',
      });
      toast.success('Task created successfully!');
      setCreateTaskOpen(false);
      setTaskTitle('');
      await invalidateDashboardStats(queryClient);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!teamName) return;
    setLoading(true);
    try {
      await api.post('/teams', {
        name: teamName,
      });
      toast.success('Team workspace created!');
      setCreateTeamOpen(false);
      setTeamName('');
      await invalidateDashboardStats(queryClient);
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to create team');
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageContainer>
      <DashboardHero
        userName={user?.name}
        greeting={getGreeting()}
        onNewMeeting={() => setNewMeetingOpen(true)}
      />

      <QuickActions
        onNewMeeting={() => setNewMeetingOpen(true)}
        onJoinMeeting={() => setJoinMeetingOpen(true)}
        onCreateTask={() => setCreateTaskOpen(true)}
        onCreateTeam={() => setCreateTeamOpen(true)}
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 mb-6">
        <div className="xl:col-span-7">
          <UpcomingMeetings onCreateMeeting={() => setNewMeetingOpen(true)} />
        </div>
        <div className="xl:col-span-5">
          <ProductivitySnapshot />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <RecentActivity />
        <ActiveTeamMembers onCreateTeam={() => setCreateTeamOpen(true)} />
      </div>

      {/* New Meeting dialog overlay */}
      <Dialog isOpen={newMeetingOpen} onClose={() => setNewMeetingOpen(false)}>
        <DialogContent onClose={() => setNewMeetingOpen(false)}>
          <form onSubmit={handleCreateMeeting}>
            <DialogHeader>
              <DialogTitle>Create New Meeting</DialogTitle>
              <DialogDescription>Start an instant meeting room immediately.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 my-4 text-left">
              <div>
                <Label htmlFor="meetingTitle" required>
                  Meeting Title
                </Label>
                <Input
                  id="meetingTitle"
                  type="text"
                  placeholder="Sync on Product Launch"
                  value={meetingTitle}
                  onChange={(e) => setMeetingTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="meetingPass">Password Protection (Optional)</Label>
                <Input
                  id="meetingPass"
                  type="password"
                  placeholder="Set code room password"
                  value={meetingPass}
                  onChange={(e) => setMeetingPass(e.target.value)}
                />
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/20">
                <div>
                  <Label htmlFor="waitingRoom" className="text-sm font-bold text-foreground">
                    Ask permission to join
                  </Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Require guest permission approval before entry is allowed.
                  </p>
                </div>
                <Switch
                  id="waitingRoom"
                  checked={waitingRoom}
                  onCheckedChange={setWaitingRoom}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setNewMeetingOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Start Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Join Meeting dialog overlay */}
      <Dialog isOpen={joinMeetingOpen} onClose={() => setJoinMeetingOpen(false)}>
        <DialogContent onClose={() => setJoinMeetingOpen(false)}>
          <form onSubmit={handleJoinMeeting}>
            <DialogHeader>
              <DialogTitle>Join Meeting</DialogTitle>
              <DialogDescription>Enter the 8-character meeting code to join.</DialogDescription>
            </DialogHeader>
            <div className="my-4 text-left">
              <Label htmlFor="joinCode" required>
                Meeting Code
              </Label>
              <Input
                id="joinCode"
                type="text"
                placeholder="abcdefgh"
                maxLength={8}
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setJoinMeetingOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Join Room
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Task dialog overlay */}
      <Dialog isOpen={createTaskOpen} onClose={() => setCreateTaskOpen(false)}>
        <DialogContent onClose={() => setCreateTaskOpen(false)}>
          <form onSubmit={handleCreateTask}>
            <DialogHeader>
              <DialogTitle>Create Task</DialogTitle>
              <DialogDescription>Add a new item to your personal Kanban board.</DialogDescription>
            </DialogHeader>
            <div className="my-4 text-left">
              <Label htmlFor="taskTitle" required>
                Task Title
              </Label>
              <Input
                id="taskTitle"
                type="text"
                placeholder="Review draft design specs"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateTaskOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Create Task
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Create Team dialog overlay */}
      <Dialog isOpen={createTeamOpen} onClose={() => setCreateTeamOpen(false)}>
        <DialogContent onClose={() => setCreateTeamOpen(false)}>
          <form onSubmit={handleCreateTeam}>
            <DialogHeader>
              <DialogTitle>Create Team workspace</DialogTitle>
              <DialogDescription>Create a collaborative workspace for your teammates.</DialogDescription>
            </DialogHeader>
            <div className="my-4 text-left">
              <Label htmlFor="teamName" required>
                Team Name
              </Label>
              <Input
                id="teamName"
                type="text"
                placeholder="Engineering Core"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                required
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateTeamOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" isLoading={loading}>
                Create Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </PageContainer>
  );
};

export default DashboardPage;
