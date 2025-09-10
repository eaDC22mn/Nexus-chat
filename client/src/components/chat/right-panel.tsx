import { useQuery } from '@tanstack/react-query';
import { User } from '@shared/schema';

interface RightPanelProps {
  onQuickFileUpload: () => void;
}

export function RightPanel({ onQuickFileUpload }: RightPanelProps) {
  const { data: onlineUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users/online'],
    refetchInterval: 10000,
  });

  const handleQuickGame = (gameType: string) => {
    let gameUrl = '';
    let gameTitle = '';

    switch (gameType) {
      case 'dice':
        gameUrl = 'https://dice-roller.netlify.app/';
        gameTitle = 'Dice Roller';
        break;
      case 'trivia':
        gameUrl = 'https://trivia-game.netlify.app/';
        gameTitle = 'Quick Trivia';
        break;
    }

    if (gameUrl) {
      window.open(gameUrl, '_blank');
    }
  };

  return (
    <div className="w-64 bg-card border-l border-border hidden xl:flex flex-col">
      {/* Panel Header */}
      <div className="p-4 border-b border-border">
        <h3 className="font-semibold text-sm">Quick Actions</h3>
      </div>

      {/* Quick Share Section */}
      <div className="flex-1 p-4 space-y-4">
        {/* File Drop Zone */}
        <div 
          className="drag-area border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center transition-all cursor-pointer hover:border-primary/50"
          onClick={onQuickFileUpload}
          data-testid="quick-file-upload"
        >
          <i className="fas fa-cloud-upload-alt text-2xl text-muted-foreground mb-2"></i>
          <p className="text-sm font-medium text-foreground">Drop files here</p>
          <p className="text-xs text-muted-foreground">or click to browse</p>
        </div>

        {/* Quick Game Access */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">QUICK GAMES</h4>
          <div className="space-y-2">
            <button 
              className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
              onClick={() => handleQuickGame('dice')}
              data-testid="button-quick-dice"
            >
              <div className="flex items-center space-x-2">
                <i className="fas fa-dice text-accent text-sm"></i>
                <span className="text-xs">Dice Roller</span>
              </div>
            </button>
            <button 
              className="w-full text-left p-2 rounded-md hover:bg-muted transition-colors"
              onClick={() => handleQuickGame('trivia')}
              data-testid="button-quick-trivia"
            >
              <div className="flex items-center space-x-2">
                <i className="fas fa-question-circle text-primary text-sm"></i>
                <span className="text-xs">Quick Trivia</span>
              </div>
            </button>
          </div>
        </div>

        {/* Active Users */}
        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">ONLINE USERS</h4>
          <div className="space-y-2">
            {onlineUsers.map((user) => (
              <div key={user.id} className="flex items-center space-x-2" data-testid={`user-${user.username}`}>
                <div className="relative">
                  <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-accent-foreground text-xs">
                      {user.username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full border border-background"></div>
                </div>
                <span className="text-xs font-medium">{user.username}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
