import type { Express, Request } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertRoomSchema, insertMessageSchema, insertRoomMemberSchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";

interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

// Configure multer for file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

// Store WebSocket connections
const connections = new Map<string, { ws: WebSocket; userId?: string; roomId?: string }>();

export async function registerRoutes(app: Express): Promise<Server> {
  // Ensure uploads directory exists
  if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
  }

  // User routes
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const existingUser = await storage.getUserByUsername(userData.username);
      
      if (existingUser) {
        return res.status(400).json({ message: "Username already exists" });
      }

      const user = await storage.createUser(userData);
      
      // Automatically join global rooms
      await storage.joinGlobalRooms(user.id);
      
      res.json(user);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.get("/api/users/online", async (req, res) => {
    try {
      const users = await storage.getOnlineUsers();
      res.json(users);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Room routes
  app.get("/api/rooms", async (req, res) => {
    try {
      const { userId } = req.query;
      if (userId) {
        const rooms = await storage.getUserRooms(userId as string);
        res.json(rooms);
      } else {
        const rooms = await storage.getAllRooms();
        res.json(rooms);
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rooms", async (req, res) => {
    try {
      const roomData = insertRoomSchema.parse(req.body);
      const room = await storage.createRoom(roomData);
      
      // Add creator to the room
      if (roomData.createdBy) {
        await storage.addRoomMember({ roomId: room.id, userId: roomData.createdBy });
      }
      
      res.json(room);
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/rooms/direct", async (req, res) => {
    try {
      const { user1Id, user2Id } = req.body;
      if (!user1Id || !user2Id) {
        return res.status(400).json({ message: "Both user IDs are required" });
      }
      
      const room = await storage.getOrCreateDirectRoom(user1Id, user2Id);
      res.json(room);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.get("/api/rooms/:id/messages", async (req, res) => {
    try {
      const { id } = req.params;
      const messages = await storage.getMessagesByRoom(id);
      res.json(messages);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  app.post("/api/rooms/:id/join", async (req, res) => {
    try {
      const { id } = req.params;
      const { userId } = req.body;

      const isAlreadyMember = await storage.isUserInRoom(userId, id);
      if (!isAlreadyMember) {
        await storage.addRoomMember({ roomId: id, userId });
      }

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // File upload route
  app.post("/api/files/upload", upload.single('file'), async (req: MulterRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const fileInfo = {
        id: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: req.file.path,
        uploadedAt: new Date().toISOString(),
      };

      res.json(fileInfo);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // File download route
  app.get("/api/files/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const filePath = path.join('uploads', id);
      
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ message: "File not found" });
      }

      res.sendFile(path.resolve(filePath));
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Link preview route
  app.post("/api/links/preview", async (req, res) => {
    try {
      const { url } = req.body;
      
      // Basic URL validation
      const urlRegex = /^https?:\/\/.+/;
      if (!urlRegex.test(url)) {
        return res.status(400).json({ message: "Invalid URL" });
      }

      // Simulate link preview (in a real app, you'd fetch the actual page)
      const preview = {
        url,
        title: "Link Preview",
        description: "Preview description for the shared link",
        image: null,
        domain: new URL(url).hostname,
      };

      res.json(preview);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const httpServer = createServer(app);

  // WebSocket setup
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const connectionId = Math.random().toString(36).substring(7);
    connections.set(connectionId, { ws });

    ws.on('message', async (data: Buffer) => {
      try {
        const message = JSON.parse(data.toString());
        const connection = connections.get(connectionId);

        switch (message.type) {
          case 'join_room':
            if (connection) {
              connection.userId = message.userId;
              connection.roomId = message.roomId;
              await storage.updateUserOnlineStatus(message.userId, 1);
              
              // Broadcast user joined
              broadcastToRoom(message.roomId, {
                type: 'user_joined',
                userId: message.userId,
                roomId: message.roomId,
              });
            }
            break;

          case 'send_message':
            const newMessage = await storage.createMessage({
              roomId: message.roomId,
              userId: message.userId,
              content: message.content,
              type: message.messageType || 'text',
              metadata: message.metadata || null,
            });

            // Broadcast message to room
            broadcastToRoom(message.roomId, {
              type: 'new_message',
              message: newMessage,
            });
            break;

          case 'user_typing':
            broadcastToRoom(message.roomId, {
              type: 'user_typing',
              userId: message.userId,
              isTyping: message.isTyping,
            }, connectionId);
            break;
        }
      } catch (error) {
        console.error('WebSocket message error:', error);
      }
    });

    ws.on('close', async () => {
      const connection = connections.get(connectionId);
      if (connection?.userId) {
        await storage.updateUserOnlineStatus(connection.userId, 0);
        
        if (connection.roomId) {
          broadcastToRoom(connection.roomId, {
            type: 'user_left',
            userId: connection.userId,
          });
        }
      }
      connections.delete(connectionId);
    });
  });

  function broadcastToRoom(roomId: string, message: any, excludeConnection?: string) {
    connections.forEach((connection, id) => {
      if (connection.roomId === roomId && 
          connection.ws.readyState === WebSocket.OPEN && 
          id !== excludeConnection) {
        connection.ws.send(JSON.stringify(message));
      }
    });
  }

  return httpServer;
}
