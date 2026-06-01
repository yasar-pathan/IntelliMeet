import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, Camera, Trash2, ShieldAlert, Key, Settings, Loader2 } from 'lucide-react';
import { PageContainer } from '@/components/layout/PageContainer';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Select } from '@/components/ui/Select';
import { Checkbox } from '@/components/ui/Checkbox';
import { Avatar } from '@/components/common/Avatar';
import { ConfirmDialog } from '@/components/common/ConfirmDialog';
import { useAuthStore } from '@/stores/authStore';
import { useLogout } from '@/hooks/useAuth';
import api from '@/lib/axios';
import type { ApiResponse } from '@/types/api';
import type { User, UserPreferences } from '@/types/models';

export const SettingsPage: React.FC = () => {
  const queryClient = useQueryClient();
  const { user, updateUser } = useAuthStore();
  const logoutMutation = useLogout();

  // Profile forms
  const [name, setName] = React.useState('');
  const [notifications, setNotifications] = React.useState(true);
  const [theme, setTheme] = React.useState<'light' | 'dark' | 'system'>('system');
  const [language, setLanguage] = React.useState('en');
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setNotifications(user.preferences?.notifications ?? true);
      setTheme(user.preferences?.theme ?? 'system');
      setLanguage(user.preferences?.language ?? 'en');
    }
  }, [user]);

  // Update profile details mutation
  const updateProfileMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch<ApiResponse<User>>('/users/me', { name });
      return response.data.data;
    },
    onSuccess: (data) => {
      updateUser({ name: data.name });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Profile details updated successfully');
    },
    onError: () => {
      toast.error('Failed to update profile details');
    },
  });

  // Update preferences mutation
  const updatePreferencesMutation = useMutation({
    mutationFn: async () => {
      const prefs: UserPreferences = { notifications, theme, language };
      const response = await api.patch<ApiResponse<{ preferences: UserPreferences }>>(
        '/users/me/preferences',
        prefs
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      updateUser({ preferences: data.preferences });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Preferences updated!');

      // Propagates theme changes globally
      const root = window.document.documentElement;
      root.classList.remove('light', 'dark');
      if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        root.classList.add(systemTheme);
      } else {
        root.classList.add(theme);
      }
      localStorage.setItem('theme', theme);
    },
    onError: () => {
      toast.error('Failed to update preferences');
    },
  });

  // Avatar upload mutation
  const uploadAvatarMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('avatar', file);

      const response = await api.patch<ApiResponse<{ avatar: string }>>(
        '/users/me/avatar',
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      );
      return response.data.data;
    },
    onSuccess: (data) => {
      updateUser({ avatar: data.avatar });
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      toast.success('Avatar uploaded successfully!');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to upload avatar image');
    },
  });

  // Account soft deletion mutation
  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      await api.delete('/users/me');
    },
    onSuccess: () => {
      toast.success('Your account has been deleted.');
      setDeleteConfirmOpen(false);
      logoutMutation.mutate();
    },
    onError: () => {
      toast.error('Failed to delete account');
    },
  });

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      uploadAvatarMutation.mutate(file);
    }
  };

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    updateProfileMutation.mutate();
  };

  const handlePreferencesSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferencesMutation.mutate();
  };

  if (!user) return null;

  return (
    <PageContainer>
      <div className="text-left mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Customize profile details, notification preferences, themes, and passwords.
        </p>
      </div>

      <div className="space-y-6">
        {/* Profile Card Section */}
        <Card className="text-left">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              User Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col md:flex-row gap-8">
            {/* Avatar Uploader left */}
            <div className="flex flex-col items-center gap-3 shrink-0">
              <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                <Avatar name={user.name} src={user.avatar} size="xl" className="shadow-md" />
                <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <Camera className="h-6 w-6 text-white" />
                </div>
              </div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleAvatarChange}
                accept="image/*"
                className="hidden"
              />
              <Button
                size="sm"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                isLoading={uploadAvatarMutation.isPending}
                className="text-xs cursor-pointer"
              >
                Change Photo
              </Button>
            </div>

            {/* Profile fields right */}
            <form onSubmit={handleProfileSubmit} className="flex-1 space-y-4">
              <div>
                <Label htmlFor="emailInput">Email Address</Label>
                <div className="mt-1.5">
                  <Input id="emailInput" value={user.email} disabled />
                </div>
                <p className="text-[10px] text-muted-foreground mt-1">
                  Email addresses are managed by your administrator and cannot be modified.
                </p>
              </div>

              <div>
                <Label htmlFor="nameInput" required>
                  Display Name
                </Label>
                <div className="mt-1.5">
                  <Input
                    id="nameInput"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={updateProfileMutation.isPending}
                  className="gap-1.5 cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Save Profile
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preferences Section */}
        <Card className="text-left">
          <CardHeader className="pb-3 border-b border-border/30">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
              User Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handlePreferencesSubmit} className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-muted/10">
                <div className="pr-4">
                  <Label htmlFor="notifToggle" className="text-sm font-bold text-foreground">
                    Email Notifications
                  </Label>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    Receive inbox updates on task assignments, team invites, and ready summaries.
                  </p>
                </div>
                <Checkbox
                  id="notifToggle"
                  checked={notifications}
                  onCheckedChange={setNotifications}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="themeSelect">Theme Preference</Label>
                  <div className="mt-1.5">
                    <Select
                      id="themeSelect"
                      value={theme}
                      onChange={(e) => setTheme(e.target.value as any)}
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                      <option value="system">System Default</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label htmlFor="langSelect">Language</Label>
                  <div className="mt-1.5">
                    <Select
                      id="langSelect"
                      value={language}
                      onChange={(e) => setLanguage(e.target.value)}
                    >
                      <option value="en">English (US)</option>
                      <option value="es">Español</option>
                      <option value="fr">Français</option>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  type="submit"
                  isLoading={updatePreferencesMutation.isPending}
                  className="gap-1.5 cursor-pointer"
                >
                  <Save className="h-4 w-4" /> Save Preferences
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Account Deletion (Danger Zone) */}
        <Card className="border-destructive/40 bg-destructive/5 text-left">
          <CardHeader className="pb-3 border-b border-destructive/25">
            <CardTitle className="text-sm font-bold uppercase tracking-wider text-destructive flex items-center gap-1.5">
              <ShieldAlert className="h-4 w-4" /> Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-foreground">Delete account</p>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-lg leading-relaxed">
                Deleting your account will immediately revoke access, remove you from workspaces,
                and blacklist active sessions. Meeting logs and audit trails will remain intact.
              </p>
            </div>
            <Button
              variant="danger"
              onClick={() => setDeleteConfirmOpen(true)}
              className="gap-1.5 cursor-pointer shrink-0 self-start sm:self-center"
            >
              <Trash2 className="h-4 w-4" /> Delete Account
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Account Deletion Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={() => deleteAccountMutation.mutate()}
        title="Delete Account?"
        description="Are you sure you want to deactivate your IntellMeet account? This soft-deletes profile access."
        isLoading={deleteAccountMutation.isPending}
      />
    </PageContainer>
  );
};

export default SettingsPage;
