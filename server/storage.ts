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

  // Message operations
  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByRoom(roomId: string, limit?: number): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Room member operations
  addRoomMember(member: InsertRoomMember): Promise<RoomMember>;
  getRoomMembers(roomId: string): Promise<User[]>;
  isUserInRoom(userId: string, roomId: string): Promise<boolean>;
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
    const generalRoom = await this.createRoom({
      name: "General",
      description: "General discussion room",
      isActive: 1,
    });

    await this.createRoom({
      name: "Gaming",
      description: "Gaming discussions and sharing",
      isActive: 1,
    });

    await this.createRoom({
      name: "File Sharing",
      description: "Share and discuss files",
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
      isActive: insertRoom.isActive || 1,
      createdAt: new Date(),
    };
    this.rooms.set(id, room);
    return room;
  }

  async getAllRooms(): Promise<Room[]> {
    return Array.from(this.rooms.values()).filter(room => room.isActive === 1);
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

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = { 
      ...insertMessage, 
      id,
      content: insertMessage.content || null,
      type: insertMessage.type || 'text',
      metadata: insertMessage.metadata || null,
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
