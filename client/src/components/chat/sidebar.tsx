import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Room, User } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';
import { ProfilePicture } from '@/components/ui/profile-picture';
import { ProfilePictureUpload } from '@/components/ui/profile-picture-upload';

interface SidebarProps {
  currentRoom: Room | null;
  onRoomChange: (room: Room) => void;
  currentUser: User | null;
  onUserUpdate?: (user: User) => void;
}

const roomColors = [
  '#4F46E5', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', 
  '#3B82F6', '#06B6D4', '#84CC16', '#F97316', '#EC4899'
];

export function Sidebar({ currentRoom, onRoomChange, currentUser, onUserUpdate }: SidebarProps) {
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [isJoinRoomOpen, setIsJoinRoomOpen] = useState(false);
  const [isProfileSettingsOpen, setIsProfileSettingsOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomType, setRoomType] = useState('personal');
  const [joinCode, setJoinCode] = useState('');
  const [selectedColor, setSelectedColor] = useState(roomColors[0]);
  const queryClient = useQueryClient();

  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['/api/rooms', currentUser?.id],
    queryFn: async () => {
      if (!currentUser?.id) return [];
      const response = await fetch(`/api/rooms?userId=${currentUser.id}`);
      if (!response.ok) throw new Error('Failed to fetch rooms');
      return response.json();
    },
    enabled: !!currentUser?.id,
  });

  const { data: onlineUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users/online'],
    refetchInterval: 10000,
  });

  const createRoomMutation = useMutation({
    mutationFn: async (roomData: any) => {
      const response = await apiRequest('POST', '/api/rooms', roomData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', currentUser?.id] });
      setIsCreateRoomOpen(false);
      setRoomName('');
      setRoomDescription('');
      setRoomType('personal');
      setSelectedColor(roomColors[0]);
    },
  });

  const createDirectMessageMutation = useMutation({
    mutationFn: async (targetUserId: string) => {
      const response = await apiRequest('POST', '/api/rooms/direct', { 
        user1Id: currentUser?.id, 
        user2Id: targetUserId 
      });
      return response.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', currentUser?.id] });
      onRoomChange(room);
    },
  });

  const joinRoomMutation = useMutation({
    mutationFn: async (joinCode: string) => {
      const response = await fetch('/api/rooms/join-with-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({ 
          userId: currentUser?.id, 
          joinCode 
        })
      });
      if (!response.ok) throw new Error('Failed to join room');
      return response.json();
    },
    onSuccess: (room) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', currentUser?.id] });
      setIsJoinRoomOpen(false);
      setJoinCode('');
      onRoomChange(room);
    },
  });

  const leaveRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await fetch(`/api/rooms/${roomId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Id': currentUser?.id || ''
        },
        body: JSON.stringify({ userId: currentUser?.id })
      });
      if (!response.ok) throw new Error('Failed to leave room');
      return { roomId };
    },
    onSuccess: ({ roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', currentUser?.id] });
      // If user left the current room, redirect to first available global room
      if (currentRoom?.id === roomId) {
        const globalRoom = rooms.find(room => room.type === 'global' && room.isActive === 1);
        if (globalRoom) {
          onRoomChange(globalRoom);
        }
      }
    },
  });

  const deleteRoomMutation = useMutation({
    mutationFn: async (roomId: string) => {
      const response = await fetch(`/api/rooms/${roomId}`, {
        method: 'DELETE',
        headers: {
          'X-User-Id': currentUser?.id || ''
        }
      });
      if (!response.ok) throw new Error('Failed to delete room');
      return { roomId };
    },
    onSuccess: ({ roomId }) => {
      queryClient.invalidateQueries({ queryKey: ['/api/rooms', currentUser?.id] });
      // If user deleted the current room, redirect to first available global room
      if (currentRoom?.id === roomId) {
        const globalRoom = rooms.find(room => room.type === 'global' && room.isActive === 1);
        if (globalRoom) {
          onRoomChange(globalRoom);
        }
      }
    },
  });

  const generateJoinCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const handleCreateRoom = () => {
    if (!roomName.trim() || !currentUser) return;
    
    const roomData: any = {
      name: roomName.trim(),
      description: roomDescription.trim(),
      type: roomType,
      color: selectedColor,
      createdBy: currentUser.id,
    };

    // Add join code for private rooms
    if (roomType === 'private') {
      roomData.joinCode = generateJoinCode();
    }
    
    createRoomMutation.mutate(roomData);
  };

  const handleJoinRoom = () => {
    if (!joinCode.trim() || !currentUser) return;
    joinRoomMutation.mutate(joinCode.trim());
  };

  const handleStartDirectMessage = (targetUser: User) => {
    if (!currentUser || targetUser.id === currentUser.id) return;
    createDirectMessageMutation.mutate(targetUser.id);
  };

  const handleAvatarUpdate = (avatarUrl: string) => {
    if (currentUser && onUserUpdate) {
      onUserUpdate({ ...currentUser, avatar: avatarUrl });
    }
    queryClient.invalidateQueries({ queryKey: ['/api/users/online'] });
  };

  const handleLeaveRoom = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    if (!currentUser || room.type === 'global') return;
    
    const confirmMessage = room.type === 'direct' 
      ? `Leave this conversation with ${room.name}?`
      : `Leave room "${room.name}"?`;
    
    if (confirm(confirmMessage)) {
      leaveRoomMutation.mutate(room.id);
    }
  };

  const handleDeleteRoom = (e: React.MouseEvent, room: Room) => {
    e.stopPropagation();
    if (!currentUser || room.type === 'global' || room.createdBy !== currentUser.id) return;
    
    if (confirm(`Delete room "${room.name}"? This action cannot be undone.`)) {
      deleteRoomMutation.mutate(room.id);
    }
  };

  return (
    <div className="w-64 bg-card border-r border-border flex flex-col lg:flex hidden">
      {/* Sidebar Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-comments text-primary-foreground text-sm"></i>
          </div>
          <div>
            <h1 className="font-semibold text-sm">StreamChat</h1>
            <p className="text-xs text-muted-foreground">Lightweight Platform</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 p-2 space-y-1">
        <div className="sidebar-item flex items-center space-x-3 p-3 rounded-md cursor-pointer bg-muted">
          <i className="fas fa-comments text-primary"></i>
          <span className="text-sm font-medium">Chat Rooms</span>
        </div>
        <div className="sidebar-item flex items-center space-x-3 p-3 rounded-md cursor-pointer">
          <i className="fas fa-file-alt text-muted-foreground"></i>
          <span className="text-sm">Shared Files</span>
        </div>
        <div className="sidebar-item flex items-center space-x-3 p-3 rounded-md cursor-pointer">
          <i className="fas fa-gamepad text-muted-foreground"></i>
          <span className="text-sm">Games</span>
        </div>
        <div className="sidebar-item flex items-center space-x-3 p-3 rounded-md cursor-pointer">
          <i className="fas fa-link text-muted-foreground"></i>
          <span className="text-sm">Shared Links</span>
        </div>

        <div className="pt-4">
          <div className="flex items-center justify-between mb-2 px-3">
            <h3 className="text-xs text-muted-foreground font-medium">ROOMS</h3>
            <div className="flex space-x-1">
              <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Create Room"
                    data-testid="button-create-room"
                  >
                    <i className="fas fa-plus text-xs"></i>
                  </Button>
                </DialogTrigger>
              </Dialog>
              
              <Dialog open={isJoinRoomOpen} onOpenChange={setIsJoinRoomOpen}>
                <DialogTrigger asChild>
                  <Button 
                    size="sm" 
                    variant="ghost" 
                    className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                    title="Join Room with Code"
                    data-testid="button-join-room"
                  >
                    <i className="fas fa-sign-in-alt text-xs"></i>
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Join Private Room</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="join-code">Join Code</Label>
                      <Input
                        id="join-code"
                        value={joinCode}
                        onChange={(e) => setJoinCode(e.target.value)}
                        placeholder="Enter room join code"
                        data-testid="input-join-code"
                      />
                    </div>
                    <Button 
                      onClick={handleJoinRoom} 
                      disabled={!joinCode.trim() || joinRoomMutation.isPending}
                      data-testid="button-join-room-submit"
                    >
                      {joinRoomMutation.isPending ? 'Joining...' : 'Join Room'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Create Room Dialog */}
          <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Room</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="room-name">Room Name</Label>
                  <Input
                    id="room-name"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    placeholder="Enter room name"
                    data-testid="input-room-name"
                  />
                </div>
                <div>
                  <Label htmlFor="room-description">Description</Label>
                  <Input
                    id="room-description"
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    placeholder="Enter room description (optional)"
                    data-testid="input-room-description"
                  />
                </div>
                <div>
                  <Label>Room Type</Label>
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      className={`px-3 py-2 text-sm rounded-md border ${
                        roomType === 'personal' ? 'bg-primary text-primary-foreground' : 'bg-background border-border'
                      }`}
                      onClick={() => setRoomType('personal')}
                      data-testid="room-type-personal"
                    >
                      Personal
                    </button>
                    <button
                      type="button"
                      className={`px-3 py-2 text-sm rounded-md border ${
                        roomType === 'private' ? 'bg-primary text-primary-foreground' : 'bg-background border-border'
                      }`}
                      onClick={() => setRoomType('private')}
                      data-testid="room-type-private"
                    >
                      Private
                    </button>
                  </div>
                  {roomType === 'private' && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Private rooms require a join code to access
                    </p>
                  )}
                </div>
                <div>
                  <Label>Room Color</Label>
                  <div className="flex gap-2 mt-2">
                    {roomColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        className={`w-6 h-6 rounded-full border-2 ${
                          selectedColor === color ? 'border-foreground' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color }}
                        onClick={() => setSelectedColor(color)}
                        data-testid={`color-${color}`}
                      />
                    ))}
                  </div>
                </div>
                <Button 
                  onClick={handleCreateRoom} 
                  disabled={!roomName.trim() || createRoomMutation.isPending}
                  data-testid="button-create-room-submit"
                >
                  {createRoomMutation.isPending ? 'Creating...' : 'Create Room'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
          </div>
          <div className="space-y-1">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`sidebar-item group flex items-center space-x-3 p-2 rounded-md cursor-pointer ${
                  currentRoom?.id === room.id ? 'bg-muted' : ''
                }`}
                onClick={() => onRoomChange(room)}
                data-testid={`room-${room.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span 
                  className={`w-3 h-3 rounded-full flex-shrink-0`}
                  style={{ backgroundColor: room.color || '#4F46E5' }}
                ></span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm truncate">{room.name}</span>
                    {room.type === 'global' && (
                      <i className="fas fa-globe text-xs text-accent"></i>
                    )}
                    {room.type === 'direct' && (
                      <i className="fas fa-user text-xs text-muted-foreground"></i>
                    )}
                  </div>
                </div>
                
                {/* Room Management Buttons */}
                <div className="flex items-center space-x-1">
                  {currentRoom?.id === room.id && onlineUsers.length > 0 && (
                    <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                      {onlineUsers.length}
                    </span>
                  )}
                  
                  {/* Show appropriate management buttons based on room type and ownership */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex space-x-1">
                    {room.type !== 'global' && (
                      <>
                        {room.createdBy === currentUser?.id ? (
                          <button
                            onClick={(e) => handleDeleteRoom(e, room)}
                            className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                            title="Delete room"
                            data-testid={`delete-room-${room.id}`}
                          >
                            <i className="fas fa-trash text-xs"></i>
                          </button>
                        ) : (
                          <button
                            onClick={(e) => handleLeaveRoom(e, room)}
                            className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                            title="Leave room"
                            data-testid={`leave-room-${room.id}`}
                          >
                            <i className="fas fa-sign-out-alt text-xs"></i>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Online Users for Direct Messages */}
        <div className="pt-4">
          <h3 className="text-xs text-muted-foreground font-medium mb-2 px-3">ONLINE USERS</h3>
          <div className="space-y-1">
            {onlineUsers.filter(user => user.id !== currentUser?.id).map((user) => (
              <div 
                key={user.id} 
                className="sidebar-item flex items-center space-x-2 p-2 rounded-md cursor-pointer"
                onClick={() => handleStartDirectMessage(user)}
                data-testid={`user-${user.username}`}
              >
                <div className="relative">
                  <ProfilePicture 
                    src={user.avatar} 
                    username={user.username} 
                    size="xs"
                  />
                  <div className="absolute -bottom-0.5 -right-0.5 w-2 h-2 bg-accent rounded-full border border-background"></div>
                </div>
                <span className="text-xs font-medium truncate">{user.username}</span>
                <button 
                  className="ml-auto opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-foreground transition-all"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleStartDirectMessage(user);
                  }}
                  data-testid={`dm-${user.username}`}
                >
                  <i className="fas fa-comment text-xs"></i>
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
<div>
  {/* User Profile section */}
  {currentUser && (
    <div className="p-4 border-t border-border">
      <Dialog open={isProfileSettingsOpen} onOpenChange={setIsProfileSettingsOpen}>
        <DialogTrigger asChild>
          <div className="flex items-center space-x-3 cursor-pointer hover:bg-muted/50 p-2 rounded-md -m-2 transition-colors">
            <div className="relative">
              <ProfilePicture 
                src={currentUser?.avatar} 
                username={currentUser?.username || ''} 
                size="sm"
              />
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 online-indicator rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser?.username}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
            <div className="text-muted-foreground hover:text-foreground transition-colors">
              <i className="fas fa-cog text-sm"></i>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Profile Settings</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="flex flex-col items-center space-y-4">
              <ProfilePictureUpload
                currentAvatar={currentUser?.avatar}
                username={currentUser?.username || ''}
                userId={currentUser?.id || ''}
                authenticatedUserId={currentUser?.id || ''}
                onAvatarUpdate={handleAvatarUpdate}
                size="lg"
              />
              <div className="text-center">
                <p className="font-medium">{currentUser?.username}</p>
                <p className="text-sm text-muted-foreground">Online since login</p>
              </div>
            </div>
            <div className="flex justify-end">
              <Button 
                variant="outline" 
                onClick={() => setIsProfileSettingsOpen(false)}
                data-testid="button-close-profile"
              >
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )}
</div>