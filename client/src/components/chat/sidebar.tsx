import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Room, User } from '@shared/schema';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/queryClient';

interface SidebarProps {
  currentRoom: Room | null;
  onRoomChange: (room: Room) => void;
  currentUser: User | null;
}

const roomColors = [
  '#4F46E5', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', 
  '#3B82F6', '#06B6D4', '#84CC16', '#F97316', '#EC4899'
];

export function Sidebar({ currentRoom, onRoomChange, currentUser }: SidebarProps) {
  const [isCreateRoomOpen, setIsCreateRoomOpen] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
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

  const handleCreateRoom = () => {
    if (!roomName.trim() || !currentUser) return;
    
    createRoomMutation.mutate({
      name: roomName.trim(),
      description: roomDescription.trim(),
      type: 'personal',
      color: selectedColor,
      createdBy: currentUser.id,
    });
  };

  const handleStartDirectMessage = (targetUser: User) => {
    if (!currentUser || targetUser.id === currentUser.id) return;
    createDirectMessageMutation.mutate(targetUser.id);
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
            <Dialog open={isCreateRoomOpen} onOpenChange={setIsCreateRoomOpen}>
              <DialogTrigger asChild>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
                  data-testid="button-create-room"
                >
                  <i className="fas fa-plus text-xs"></i>
                </Button>
              </DialogTrigger>
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
                className={`sidebar-item flex items-center space-x-3 p-2 rounded-md cursor-pointer ${
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
                {currentRoom?.id === room.id && onlineUsers.length > 0 && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                    {onlineUsers.length}
                  </span>
                )}
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
                  <div className="w-6 h-6 bg-accent rounded-full flex items-center justify-center">
                    <span className="text-accent-foreground text-xs">
                      {user.username.slice(0, 2).toUpperCase()}
                    </span>
                  </div>
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

      {/* User Profile */}
      {currentUser && (
        <div className="p-4 border-t border-border">
          <div className="flex items-center space-x-3">
            <div className="relative">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                <span className="text-primary-foreground text-xs font-medium">
                  {currentUser.username.slice(0, 2).toUpperCase()}
                </span>
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 online-indicator rounded-full"></div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{currentUser.username}</p>
              <p className="text-xs text-muted-foreground">Online</p>
            </div>
            <button className="text-muted-foreground hover:text-foreground transition-colors">
              <i className="fas fa-cog text-sm"></i>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
