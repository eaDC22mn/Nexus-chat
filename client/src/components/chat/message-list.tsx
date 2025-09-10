import { useEffect, useRef } from 'react';
import { Message, User } from '@shared/schema';
import { MessageBubble } from './message-bubble';
import { useQuery } from '@tanstack/react-query';

interface MessageListProps {
  roomId: string | null;
  messages: Message[];
  onDrop: (files: FileList) => void;
}

export function MessageList({ roomId, messages, onDrop }: MessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ['/api/users/online'],
    refetchInterval: 10000,
  });

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.add('drag-over');
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.currentTarget.classList.remove('drag-over');
    
    if (e.dataTransfer.files) {
      onDrop(e.dataTransfer.files);
    }
  };

  const getUserById = (userId: string) => {
    return users.find(user => user.id === userId);
  };

  if (!roomId) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mb-2">
            <i className="fas fa-comments text-primary"></i>
          </div>
          <h3 className="font-medium text-foreground">Welcome to StreamChat!</h3>
          <p className="text-sm text-muted-foreground">Select a room to start chatting.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar drag-area"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      data-testid="chat-messages"
    >
      {messages.length === 0 ? (
        <div className="text-center py-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-primary/20 rounded-full mb-2">
            <i className="fas fa-comments text-primary"></i>
          </div>
          <h3 className="font-medium text-foreground">No messages yet</h3>
          <p className="text-sm text-muted-foreground">Start sharing messages, files, links, and games.</p>
        </div>
      ) : (
        messages.map((message) => (
          <MessageBubble
            key={message.id}
            message={message}
            user={getUserById(message.userId)}
          />
        ))
      )}
    </div>
  );
}
