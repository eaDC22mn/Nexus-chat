import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Room, Message, User } from '@shared/schema';
import { useWebSocket } from '@/hooks/use-websocket';
import { Sidebar } from '@/components/chat/sidebar';
import { ChatHeader } from '@/components/chat/chat-header';
import { MessageList } from '@/components/chat/message-list';
import { MessageInput } from '@/components/chat/message-input';
import { RightPanel } from '@/components/chat/right-panel';
import { uploadFile } from '@/lib/file-utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';

export default function Chat() {
  const [currentRoom, setCurrentRoom] = useState<Room | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [username, setUsername] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { isConnected, lastMessage, sendMessage } = useWebSocket('/ws');

  const { data: onlineUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users/online'],
    refetchInterval: 10000,
  });

  const { data: roomMessages = [] } = useQuery<Message[]>({
    queryKey: ['/api/rooms', currentRoom?.id, 'messages'],
    enabled: !!currentRoom?.id,
  });

  useEffect(() => {
    if (roomMessages) {
      setMessages(roomMessages);
    }
  }, [roomMessages]);


  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'new_message':
          if (lastMessage.message.roomId === currentRoom?.id) {
            setMessages(prev => [...prev, lastMessage.message]);
          }
          break;
        case 'user_joined':
          if (lastMessage.roomId === currentRoom?.id) {
            // Handle user joined notification
          }
          break;
        case 'user_left':
          if (lastMessage.roomId === currentRoom?.id) {
            // Handle user left notification
          }
          break;
      }
    }
  }, [lastMessage, currentRoom?.id]);

  const handleLogin = async () => {
    if (!username.trim()) return;

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setShowLoginModal(false);
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login');
    }
  };

  const handleRoomChange = useCallback(async (room: Room) => {
    setCurrentRoom(room);
    setMessages([]);

    if (currentUser && isConnected) {
      // Join room on server
      try {
        await fetch(`/api/rooms/${room.id}/join`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });

        // Send WebSocket join message
        sendMessage({
          type: 'join_room',
          userId: currentUser.id,
          roomId: room.id,
        });
      } catch (error) {
        console.error('Failed to join room:', error);
      }
    }
  }, [currentUser, isConnected, sendMessage]);

  const handleSendMessage = (content: string, type: string = 'text', metadata?: any) => {
    if (!currentUser || !currentRoom || !isConnected) return;

    sendMessage({
      type: 'send_message',
      roomId: currentRoom.id,
      userId: currentUser.id,
      content,
      messageType: type,
      metadata,
    });
  };

  const handleFileUpload = async (files: FileList) => {
    if (!currentUser || !currentRoom) return;

    Array.from(files).forEach(async (file) => {
      try {
        const fileInfo = await uploadFile(file);
        handleSendMessage('', 'file', fileInfo);
      } catch (error) {
        console.error('File upload error:', error);
      }
    });
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar
        currentRoom={currentRoom}
        onRoomChange={handleRoomChange}
        currentUser={currentUser}
      />

      <div className="flex-1 flex flex-col">
        <ChatHeader
          room={currentRoom}
          onlineCount={onlineUsers.length}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        />

        <MessageList
          roomId={currentRoom?.id || null}
          messages={messages}
          onDrop={handleFileUpload}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          isConnected={isConnected}
          onlineCount={onlineUsers.length}
        />
      </div>

      <RightPanel onQuickFileUpload={() => {}} />

      <Dialog open={showLoginModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Welcome to StreamChat</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">Choose a username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                onKeyPress={(e) => e.key === 'Enter' && handleLogin()}
                data-testid="input-username"
              />
            </div>
            <Button onClick={handleLogin} className="w-full" data-testid="button-login">
              Join Chat
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
