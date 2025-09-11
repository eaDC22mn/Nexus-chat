import { Room, User } from '@shared/schema';
import { Button } from '@/components/ui/button';
import { LogOut, Menu, Search, Users } from 'lucide-react';
import { ProfilePicture } from '@/components/ui/profile-picture';

interface ChatHeaderProps {
  room: Room | null;
  onlineCount: number;
  currentUser: User | null;
  onToggleSidebar?: () => void;
  onLogout?: () => void;
}

export function ChatHeader({ room, onlineCount, currentUser, onToggleSidebar, onLogout }: ChatHeaderProps) {
  return (
    <div className="bg-card border-b border-border p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <Button
          variant="ghost"
          size="sm"
          className="lg:hidden"
          onClick={onToggleSidebar}
          data-testid="button-toggle-sidebar"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <div>
          <h2 className="font-semibold" data-testid="text-room-name">
            {room?.name || 'Select a room'}
          </h2>
          <p className="text-xs text-muted-foreground" data-testid="text-online-count">
            {onlineCount} members online
          </p>
        </div>
      </div>
      <div className="flex items-center space-x-2">
        {currentUser && (
          <div className="flex items-center space-x-3 mr-4">
            <ProfilePicture 
              src={currentUser.avatar} 
              username={currentUser.username} 
              size="sm"
            />
            <div className="flex items-center space-x-2">
              <span className="text-sm text-muted-foreground" data-testid="text-current-user">
                Welcome, {currentUser.username}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={onLogout}
                data-testid="button-logout"
              >
                <LogOut className="h-4 w-4 mr-1" />
                Logout
              </Button>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          data-testid="button-search"
        >
          <Search className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          data-testid="button-users"
        >
          <Users className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
