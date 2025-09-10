import { Message, User } from '@shared/schema';
import { formatFileSize, getFileIcon, getFileColor, isImageFile } from '@/lib/file-utils';
import { format } from 'date-fns';

interface FileMetadata {
  id: string;
  originalName: string;
  mimetype: string;
  size: number;
  path: string;
  uploadedAt: string;
}

interface LinkMetadata {
  url: string;
  title: string;
  description: string;
  image?: string | null;
  domain: string;
}

interface GameMetadata {
  url: string;
  title: string;
}

// Type guards
const isFileMetadata = (metadata: unknown): metadata is FileMetadata => {
  return metadata !== null && 
         typeof metadata === 'object' && 
         'id' in metadata && 
         'originalName' in metadata && 
         'mimetype' in metadata;
};

const isLinkMetadata = (metadata: unknown): metadata is LinkMetadata => {
  return metadata !== null && 
         typeof metadata === 'object' && 
         'url' in metadata && 
         'title' in metadata && 
         'domain' in metadata;
};

const isGameMetadata = (metadata: unknown): metadata is GameMetadata => {
  return metadata !== null && 
         typeof metadata === 'object' && 
         'url' in metadata && 
         'title' in metadata;
};

interface MessageBubbleProps {
  message: Message;
  user?: User;
}

export function MessageBubble({ message, user }: MessageBubbleProps) {
  const timestamp = format(new Date(message.timestamp!), 'h:mm a');

  if (message.type === 'system') {
    return (
      <div className="text-center py-2">
        <span className="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-full">
          {message.content}
        </span>
      </div>
    );
  }

  return (
    <div className="chat-bubble flex items-start space-x-3" data-testid={`message-${message.id}`}>
      <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
        <span className="text-primary-foreground text-xs font-medium">
          {user?.username?.slice(0, 2).toUpperCase() || 'U'}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline space-x-2 mb-1">
          <span className="font-medium text-sm" data-testid="text-username">
            {user?.username || 'Unknown User'}
          </span>
          <span className="text-xs text-muted-foreground message-time" data-testid="text-timestamp">
            {timestamp}
          </span>
        </div>

        {message.type === 'text' && (
          <p className="text-sm text-foreground" data-testid="text-content">
            {message.content}
          </p>
        )}

        {message.type === 'file' && isFileMetadata(message.metadata) && (
          <>
            {message.content && (
              <p className="text-sm text-foreground mb-2">{message.content}</p>
            )}
            <div className="file-preview bg-muted rounded-lg p-3 border border-border max-w-md">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-muted rounded-lg flex items-center justify-center">
                  <i className={`${getFileIcon(message.metadata.mimetype)} ${getFileColor(message.metadata.mimetype)}`}></i>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate" data-testid="text-filename">
                    {message.metadata.originalName}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatFileSize(message.metadata.size)} • {message.metadata.mimetype.split('/')[1].toUpperCase()}
                  </p>
                </div>
                <a
                  href={`/api/files/${message.metadata.id}`}
                  download={message.metadata.originalName}
                  className="p-1.5 text-muted-foreground hover:text-foreground hover:bg-background rounded transition-colors"
                  data-testid="button-download"
                >
                  <i className="fas fa-download text-sm"></i>
                </a>
              </div>
              {isImageFile(message.metadata.mimetype) && (
                <div className="mt-3">
                  <img
                    src={`/api/files/${message.metadata.id}`}
                    alt={message.metadata.originalName}
                    className="max-w-full h-auto rounded-md"
                    data-testid="img-preview"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {message.type === 'link' && isLinkMetadata(message.metadata) && (
          <>
            {message.content && (
              <p className="text-sm text-foreground mb-2">{message.content}</p>
            )}
            <div className="bg-muted rounded-lg border border-border max-w-md overflow-hidden">
              <div className="h-32 bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <i className="fas fa-external-link-alt text-2xl text-muted-foreground"></i>
              </div>
              <div className="p-3">
                <h4 className="font-medium text-sm text-foreground mb-1" data-testid="text-link-title">
                  {message.metadata.title}
                </h4>
                <p className="text-xs text-muted-foreground mb-2" data-testid="text-link-description">
                  {message.metadata.description}
                </p>
                <div className="flex items-center space-x-2">
                  <span className="text-xs text-muted-foreground">{message.metadata.domain}</span>
                  <a
                    href={message.metadata.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline"
                    data-testid="link-visit"
                  >
                    Visit Site
                  </a>
                </div>
              </div>
            </div>
          </>
        )}

        {message.type === 'game' && isGameMetadata(message.metadata) && (() => {
          const gameData = message.metadata;
          return (
            <>
              {message.content && (
                <p className="text-sm text-foreground mb-2">{message.content}</p>
              )}
              <div className="bg-muted rounded-lg border border-border max-w-md overflow-hidden">
                <div className="h-40 bg-gradient-to-br from-primary/30 to-accent/30 flex items-center justify-center relative">
                  <div className="text-center">
                    <i className="fas fa-gamepad text-3xl text-foreground mb-2"></i>
                    <p className="text-sm font-medium" data-testid="text-game-title">{gameData.title}</p>
                  </div>
                  <button 
                    className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity"
                    onClick={() => window.open(gameData.url, '_blank')}
                    data-testid="button-play-game"
                  >
                    <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
                      <i className="fas fa-play text-primary-foreground"></i>
                    </div>
                  </button>
                </div>
                <div className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-sm">{gameData.title}</h4>
                      <p className="text-xs text-muted-foreground">Browser Game • Free to Play</p>
                    </div>
                    <button 
                      className="px-3 py-1.5 bg-primary text-primary-foreground text-xs rounded-md hover:bg-primary/90 transition-colors"
                      onClick={() => window.open(gameData.url, '_blank')}
                      data-testid="button-play-now"
                    >
                      Play Now
                    </button>
                  </div>
                </div>
              </div>
            </>
          );
        })()}
      </div>
    </div>
  );
}
