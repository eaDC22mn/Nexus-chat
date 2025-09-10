import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Room, User } from '@shared/schema';

interface SidebarProps {
  currentRoom: Room | null;
  onRoomChange: (room: Room) => void;
  currentUser: User | null;
}

export function Sidebar({ currentRoom, onRoomChange, currentUser }: SidebarProps) {
  const { data: rooms = [] } = useQuery<Room[]>({
    queryKey: ['/api/rooms'],
  });

  const { data: onlineUsers = [] } = useQuery<User[]>({
    queryKey: ['/api/users/online'],
    refetchInterval: 10000,
  });

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
          <h3 className="text-xs text-muted-foreground font-medium mb-2 px-3">ACTIVE ROOMS</h3>
          <div className="space-y-1">
            {rooms.map((room) => (
              <div
                key={room.id}
                className={`sidebar-item flex items-center space-x-3 p-2 rounded-md cursor-pointer ${
                  currentRoom?.id === room.id ? 'bg-muted' : ''
                }`}
                onClick={() => onRoomChange(room)}
                data-testid={`room-${room.name.toLowerCase()}`}
              >
                <span className={`w-2 h-2 rounded-full ${
                  currentRoom?.id === room.id ? 'bg-accent' : 'bg-muted-foreground'
                }`}></span>
                <span className="text-sm">{room.name}</span>
                {currentRoom?.id === room.id && onlineUsers.length > 0 && (
                  <span className="ml-auto text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full">
                    {onlineUsers.length}
                  </span>
                )}
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
