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
  const [messages, setMessages] = useState<(Message & { replyToMessage?: Message })[]>([]);
  const [showLoginModal, setShowLoginModal] = useState(true);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { isConnected, lastMessage, sendMessage } = useWebSocket('/ws');

  const { data: onlineUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users/online'],
    refetchInterval: 10000,
  });

  // Check for saved user session on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('chatUser');
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setShowLoginModal(false);
      } catch (error) {
        console.error('Failed to parse saved user:', error);
        localStorage.removeItem('chatUser');
      }
    }
  }, []);

  // Save user to localStorage when currentUser changes
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('chatUser', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('chatUser');
    }
  }, [currentUser]);

  const { data: roomMessages = [] } = useQuery<(Message & { replyToMessage?: Message })[]>({
    queryKey: ['/api/rooms', currentRoom?.id, 'messages'],
    enabled: !!currentRoom?.id,
  });

  // Initialize messages when room changes or when roomMessages are first loaded
  useEffect(() => {
    if (roomMessages.length > 0 && currentRoom?.id) {
      setMessages(roomMessages);
    }
  }, [roomMessages, currentRoom?.id]);

  // Handle real-time WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'new_message':
          if (lastMessage.message.roomId === currentRoom?.id) {
            setMessages(prev => {
              // Prevent duplicate messages
              const messageExists = prev.some(msg => msg.id === lastMessage.message.id);
              if (messageExists) return prev;
              
              // Enrich the message with reply context if it's a reply
              const enrichedMessage = {
                ...lastMessage.message,
                replyToMessage: lastMessage.message.replyTo 
                  ? prev.find(m => m.id === lastMessage.message.replyTo) 
                  : undefined
              };
              
              return [...prev, enrichedMessage];
            });
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

  const handleAuth = async () => {
    if (!username.trim() || !password.trim()) {
      alert('Please fill in all fields');
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = isRegistering ? '/api/auth/register' : '/api/auth/login';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          username: username.trim(), 
          password: password.trim() 
        }),
      });

      if (response.ok) {
        const user = await response.json();
        setCurrentUser(user);
        setShowLoginModal(false);
        setPassword(''); // Clear password for security
      } else {
        const error = await response.json();
        alert(error.message);
      }
    } catch (error) {
      console.error('Authentication error:', error);
      alert(`Failed to ${isRegistering ? 'register' : 'login'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      try {
        // Call logout API to properly close WebSocket connections and set user offline
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId: currentUser.id }),
        });
      } catch (error) {
        console.error('Logout error:', error);
        // Continue with logout even if API call fails
      }
    }

    // Clear local state
    setCurrentUser(null);
    setCurrentRoom(null);
    setMessages([]);
    setUsername('');
    setPassword('');
    setShowLoginModal(true);
    localStorage.removeItem('chatUser');
  };

  const toggleAuthMode = () => {
    setIsRegistering(!isRegistering);
    setPassword('');
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

  const handleSendMessage = (content: string, type: string = 'text', metadata?: any, replyTo?: string) => {
    if (!currentUser || !currentRoom || !isConnected) return;

    sendMessage({
      type: 'send_message',
      roomId: currentRoom.id,
      userId: currentUser.id,
      content,
      messageType: type,
      metadata,
      replyTo,
    });
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleCancelReply = () => {
    setReplyingTo(null);
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
          currentUser={currentUser}
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onLogout={handleLogout}
        />

        <MessageList
          roomId={currentRoom?.id || null}
          messages={messages}
          onDrop={handleFileUpload}
          onReply={handleReply}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          isConnected={isConnected}
          onlineCount={onlineUsers.length}
          replyingTo={replyingTo}
          onCancelReply={handleCancelReply}
        />
      </div>

      <RightPanel onQuickFileUpload={() => {}} />

      <Dialog open={showLoginModal} onOpenChange={() => {}}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {isRegistering ? 'Create Account' : 'Welcome Back'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="username">
                {isRegistering ? 'Choose a username' : 'Username'}
              </Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                data-testid="input-username"
              />
            </div>
            <div>
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={isRegistering ? 'Create a password (min 6 characters)' : 'Enter your password'}
                onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                disabled={isLoading}
                data-testid="input-password"
              />
            </div>
            <Button 
              onClick={handleAuth} 
              className="w-full" 
              disabled={isLoading}
              data-testid={isRegistering ? "button-register" : "button-login"}
            >
              {isLoading 
                ? (isRegistering ? 'Creating Account...' : 'Logging in...') 
                : (isRegistering ? 'Create Account' : 'Login')
              }
            </Button>
            <div className="text-center">
              <Button 
                variant="link" 
                onClick={toggleAuthMode}
                disabled={isLoading}
                data-testid="button-toggle-auth"
              >
                {isRegistering 
                  ? 'Already have an account? Login' 
                  : "Don't have an account? Register"
                }
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
