import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FileUploadModal } from './file-upload-modal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Message } from '@shared/schema';

interface MessageInputProps {
  onSendMessage: (content: string, type?: string, metadata?: any, replyTo?: string) => void;
  isConnected: boolean;
  onlineCount: number;
  replyingTo?: Message | null;
  onCancelReply?: () => void;
}

export function MessageInput({ onSendMessage, isConnected, onlineCount, replyingTo, onCancelReply }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [isFileModalOpen, setIsFileModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isGameModalOpen, setIsGameModalOpen] = useState(false);
  const [linkUrl, setLinkUrl] = useState('');
  const [gameUrl, setGameUrl] = useState('');
  const [gameTitle, setGameTitle] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSendMessage = () => {
    if (message.trim() && isConnected) {
      onSendMessage(message.trim(), 'text', undefined, replyingTo?.id);
      setMessage('');
      if (onCancelReply) {
        onCancelReply();
      }
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleFileUpload = (files: File[]) => {
    files.forEach(async (file) => {
      try {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/files/upload', {
          method: 'POST',
          body: formData,
        });

        if (response.ok) {
          const fileInfo = await response.json();
          onSendMessage('', 'file', fileInfo, replyingTo?.id);
        }
      } catch (error) {
        console.error('File upload error:', error);
      }
    });
    setIsFileModalOpen(false);
  };

  const handleLinkShare = async () => {
    if (!linkUrl.trim()) return;

    try {
      const response = await fetch('/api/links/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: linkUrl }),
      });

      if (response.ok) {
        const preview = await response.json();
        onSendMessage('Shared a link', 'link', preview, replyingTo?.id);
        setLinkUrl('');
        setIsLinkModalOpen(false);
      }
    } catch (error) {
      console.error('Link preview error:', error);
    }
  };

  const handleGameShare = () => {
    if (!gameUrl.trim() || !gameTitle.trim()) return;

    const gameData = {
      url: gameUrl,
      title: gameTitle,
    };

    onSendMessage(`Shared a game: ${gameTitle}`, 'game', gameData, replyingTo?.id);
    setGameUrl('');
    setGameTitle('');
    setIsGameModalOpen(false);
  };

  return (
    <div className="bg-card border-t border-border p-4">
      {/* Reply Context */}
      {replyingTo && (
        <div className="mb-3 p-3 bg-muted rounded-lg border border-border">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-muted-foreground">
              Replying to @{replyingTo.userId}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={onCancelReply}
              className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
              data-testid="button-cancel-reply"
            >
              <i className="fas fa-times text-xs"></i>
            </Button>
          </div>
          <div className="text-sm text-muted-foreground truncate">
            {replyingTo.content}
          </div>
        </div>
      )}

      {/* Message Input Area */}
      <div className="flex items-end space-x-3">
        {/* File Actions */}
        <div className="flex space-x-1">
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground"
            onClick={() => setIsFileModalOpen(true)}
            data-testid="button-upload-file"
          >
            <i className="fas fa-paperclip"></i>
          </Button>

          <Dialog open={isGameModalOpen} onOpenChange={setIsGameModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-share-game"
              >
                <i className="fas fa-gamepad"></i>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share a Game</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="game-title">Game Title</Label>
                  <Input
                    id="game-title"
                    value={gameTitle}
                    onChange={(e) => setGameTitle(e.target.value)}
                    placeholder="Enter game title"
                    data-testid="input-game-title"
                  />
                </div>
                <div>
                  <Label htmlFor="game-url">Game URL</Label>
                  <Input
                    id="game-url"
                    value={gameUrl}
                    onChange={(e) => setGameUrl(e.target.value)}
                    placeholder="Enter game URL"
                    data-testid="input-game-url"
                  />
                </div>
                <Button onClick={handleGameShare} data-testid="button-share-game-submit">
                  Share Game
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
            <DialogTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground hover:text-foreground"
                data-testid="button-share-link"
              >
                <i className="fas fa-link"></i>
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share a Link</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="link-url">URL</Label>
                  <Input
                    id="link-url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="Enter URL to share"
                    data-testid="input-link-url"
                  />
                </div>
                <Button onClick={handleLinkShare} data-testid="button-share-link-submit">
                  Share Link
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Message Input */}
        <div className="flex-1 relative">
          <Input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Type your message..."
            className="pr-12"
            data-testid="input-message"
          />
          <button className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors">
            <i className="fas fa-smile"></i>
          </button>
        </div>

        {/* Send Button */}
        <Button
          onClick={handleSendMessage}
          disabled={!message.trim() || !isConnected}
          data-testid="button-send"
        >
          <i className="fas fa-paper-plane"></i>
        </Button>
      </div>

      {/* Quick Actions */}
      <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
        <div className="flex items-center space-x-4">
          <span>Press Enter to send, Shift+Enter for new line</span>
        </div>
        <div className="flex items-center space-x-2">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 bg-accent rounded-full"></span>
            <span data-testid="text-online-users">{onlineCount} online</span>
          </span>
          <span>•</span>
          <span className={isConnected ? 'text-accent' : 'text-destructive'} data-testid="text-connection-status">
            {isConnected ? 'Connected' : 'Disconnected'}
          </span>
        </div>
      </div>

      <FileUploadModal
        isOpen={isFileModalOpen}
        onClose={() => setIsFileModalOpen(false)}
        onUpload={handleFileUpload}
      />
    </div>
  );
}
