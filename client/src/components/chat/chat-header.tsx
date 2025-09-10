import { Room } from '@shared/schema';

interface ChatHeaderProps {
  room: Room | null;
  onlineCount: number;
  onToggleSidebar?: () => void;
}

export function ChatHeader({ room, onlineCount, onToggleSidebar }: ChatHeaderProps) {
  return (
    <div className="bg-card border-b border-border p-4 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <button 
          className="lg:hidden text-muted-foreground hover:text-foreground"
          onClick={onToggleSidebar}
          data-testid="button-toggle-sidebar"
        >
          <i className="fas fa-bars"></i>
        </button>
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
        <button 
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          data-testid="button-search"
        >
          <i className="fas fa-search"></i>
        </button>
        <button 
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          data-testid="button-users"
        >
          <i className="fas fa-users"></i>
        </button>
        <button 
          className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-md transition-colors"
          data-testid="button-menu"
        >
          <i className="fas fa-ellipsis-v"></i>
        </button>
      </div>
    </div>
  );
}
