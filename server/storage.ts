import { type User, type Room, type Message, type RoomMember, type InsertUser, type InsertRoom, type InsertMessage, type InsertRoomMember } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUserOnlineStatus(id: string, isOnline: number): Promise<void>;
  getOnlineUsers(): Promise<User[]>;

  // Room operations
  getRoom(id: string): Promise<Room | undefined>;
  getRoomByName(name: string): Promise<Room | undefined>;
  createRoom(room: InsertRoom): Promise<Room>;
  getAllRooms(): Promise<Room[]>;
  getUserRooms(userId: string): Promise<Room[]>;
  getOrCreateDirectRoom(user1Id: string, user2Id: string): Promise<Room>;

  // Message operations
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByRoom(roomId: string, limit?: number): Promise<Message[]>;
  getMessagesWithReplies(roomId: string, limit?: number): Promise<(Message & { replyToMessage?: Message })[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Room member operations
  addRoomMember(member: InsertRoomMember): Promise<RoomMember>;
  getRoomMembers(roomId: string): Promise<User[]>;
  isUserInRoom(userId: string, roomId: string): Promise<boolean>;
  joinGlobalRooms(userId: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private rooms: Map<string, Room>;
  private messages: Map<string, Message>;
  private roomMembers: Map<string, RoomMember>;

  constructor() {
    this.users = new Map();
    this.rooms = new Map();
    this.messages = new Map();
    this.roomMembers = new Map();

    // Initialize default rooms
    this.initializeDefaultData();
  }

  private async initializeDefaultData() {
    // Create global chat room
    const globalRoom = await this.createRoom({
      name: "Global Chat",
      description: "Welcome to the global chat! Chat with everyone here.",
      type: "global",
      color: "#10B981",
      isActive: 1,
    });

    // Create other default rooms
    await this.createRoom({
      name: "General",
      description: "General discussion room",
      type: "personal",
      color: "#4F46E5",
      isActive: 1,
    });

    await this.createRoom({
      name: "Gaming",
      description: "Gaming discussions and sharing",
      type: "personal", 
      color: "#8B5CF6",
      isActive: 1,
    });

    await this.createRoom({
      name: "File Sharing",
      description: "Share and discuss files",
      type: "personal",
      color: "#F59E0B",
      isActive: 1,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id,
      avatar: insertUser.avatar || null,
      lastSeen: new Date(),
      isOnline: 1,
    };
    this.users.set(id, user);
    return user;
  }

  async updateUserOnlineStatus(id: string, isOnline: number): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date();
      this.users.set(id, user);
    }
  }

  async getOnlineUsers(): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.isOnline === 1);
  }

  async getRoom(id: string): Promise<Room | undefined> {
    return this.rooms.get(id);
  }

  async getRoomByName(name: string): Promise<Room | undefined> {
    return Array.from(this.rooms.values()).find(
      (room) => room.name === name,
    );
  }

  async createRoom(insertRoom: InsertRoom): Promise<Room> {
    const id = randomUUID();
    const room: Room = { 
      ...insertRoom, 
      id,
      description: insertRoom.description || null,
      type: insertRoom.type || 'personal',
      color: insertRoom.color || '#4F46E5',
      createdBy: insertRoom.createdBy || null,
      isActive: insertRoom.isActive || 1,
      createdAt: new Date(),
    };
    this.rooms.set(id, room);
    return room;
  }

  async getAllRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values()).filter(room => room.isActive === 1);
  }

  async getUserRooms(userId: string): Promise<Room[]> {
    const userRoomIds = Array.from(this.roomMembers.values())
      .filter(member => member.userId === userId)
      .map(member => member.roomId);
    
    return Array.from(this.rooms.values())
      .filter(room => room.isActive === 1 && userRoomIds.includes(room.id))
      .sort((a, b) => {
        // Global rooms first, then by creation date
        if (a.type === 'global' && b.type !== 'global') return -1;
        if (b.type === 'global' && a.type !== 'global') return 1;
        return new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime();
      });
  }

  async getOrCreateDirectRoom(user1Id: string, user2Id: string): Promise<Room> {
    // Look for existing direct message room between these users
    const existingRoom = Array.from(this.rooms.values()).find(room => {
      if (room.type !== 'direct') return false;
      
      const members = Array.from(this.roomMembers.values())
        .filter(member => member.roomId === room.id)
        .map(member => member.userId);
      
      return members.length === 2 && 
             members.includes(user1Id) && 
             members.includes(user2Id);
    });

    if (existingRoom) {
      return existingRoom;
    }

    // Create new direct message room
    const user1 = await this.getUser(user1Id);
    const user2 = await this.getUser(user2Id);
    
    const roomName = `${user1?.username} & ${user2?.username}`;
    const room = await this.createRoom({
      name: roomName,
      description: `Direct messages between ${user1?.username} and ${user2?.username}`,
      type: 'direct',
      color: '#6B7280',
      createdBy: user1Id,
    });

    // Add both users to the room
    await this.addRoomMember({ roomId: room.id, userId: user1Id });
    await this.addRoomMember({ roomId: room.id, userId: user2Id });

    return room;
  }

  async joinGlobalRooms(userId: string): Promise<void> {
    const globalRooms = Array.from(this.rooms.values())
      .filter(room => room.type === 'global' && room.isActive === 1);
    
    for (const room of globalRooms) {
      const isAlreadyMember = await this.isUserInRoom(userId, room.id);
      if (!isAlreadyMember) {
        await this.addRoomMember({ roomId: room.id, userId });
      }
    }
  }

  async getMessage(id: string): Promise<Message | undefined> {
    return this.messages.get(id);
  }

  async getMessagesByRoom(roomId: string, limit: number = 50): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.roomId === roomId)
      .sort((a, b) => new Date(a.timestamp!).getTime() - new Date(b.timestamp!).getTime())
      .slice(-limit);
  }

  async getMessagesWithReplies(roomId: string, limit: number = 50): Promise<(Message & { replyToMessage?: Message })[]> {
    const messages = await this.getMessagesByRoom(roomId, limit);
    
    return messages.map(message => {
      const replyToMessage = message.replyTo ? this.messages.get(message.replyTo) : undefined;
      return {
        ...message,
        replyToMessage,
      };
    });
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id,
      content: insertMessage.content || null,
      type: insertMessage.type || 'text',
      metadata: insertMessage.metadata || null,
      replyTo: insertMessage.replyTo || null,
      timestamp: new Date(),
    };
    this.messages.set(id, message);
    return message;
  }

  async addRoomMember(insertMember: InsertRoomMember): Promise<RoomMember> {
    const id = randomUUID();
    const member: RoomMember = { 
      ...insertMember, 
      id,
      joinedAt: new Date(),
    };
    this.roomMembers.set(id, member);
    return member;
  }

  async getRoomMembers(roomId: string): Promise<User[]> {
    const memberIds = Array.from(this.roomMembers.values())
      .filter(member => member.roomId === roomId)
      .map(member => member.userId);
    
    return memberIds
      .map(id => this.users.get(id))
      .filter((user): user is User => user !== undefined);
  }

  async isUserInRoom(userId: string, roomId: string): Promise<boolean> {
    return Array.from(this.roomMembers.values()).some(
      member => member.userId === userId && member.roomId === roomId
    );
  }
}

export const storage = new MemStorage();
