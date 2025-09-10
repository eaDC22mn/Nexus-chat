# Overview

This is a real-time chat application built with a full-stack TypeScript architecture. The application provides a modern messaging platform with features like real-time messaging, file sharing, room-based conversations, and user presence tracking. It combines a React frontend with shadcn/ui components and an Express backend with WebSocket support for real-time communication.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture

The client-side application is built with React and TypeScript, utilizing a component-based architecture with modern hooks and state management patterns. The UI layer uses shadcn/ui components built on top of Radix UI primitives, providing a consistent and accessible design system. The application uses Wouter for client-side routing and TanStack Query for server state management and caching.

The styling approach combines Tailwind CSS for utility-first styling with CSS custom properties for theming. The application supports a dark theme by default and uses a neutral color scheme with blue accents.

## Backend Architecture

The server follows an Express.js REST API pattern with WebSocket integration for real-time features. The application uses a modular architecture with separate concerns for routing, storage, and WebSocket connection management. The storage layer is abstracted through an interface pattern, currently implemented with an in-memory store but designed to be easily swapped for a database implementation.

The server implements middleware for request logging, error handling, and serves both API endpoints and static files. File upload functionality is handled through multer middleware with configurable size limits.

## Data Storage Solutions

The application uses Drizzle ORM with PostgreSQL as the primary database solution. The schema defines four main entities: users, rooms, messages, and room members. The database configuration supports UUID primary keys and includes proper indexing for performance.

A fallback in-memory storage implementation is provided for development and testing purposes, implementing the same interface as the database layer to ensure consistency.

## Authentication and Authorization

The current implementation uses a simple username-based authentication system without password protection. User sessions are managed through the WebSocket connection lifecycle, with online status tracking based on active connections.

## External Dependencies

### UI and Styling
- **shadcn/ui**: Component library built on Radix UI primitives
- **Tailwind CSS**: Utility-first CSS framework for styling
- **Radix UI**: Low-level UI primitives for accessibility and behavior
- **Lucide React**: Icon library for consistent iconography

### State Management and Data Fetching
- **TanStack Query**: Server state management and caching
- **React Hook Form**: Form state management and validation
- **Zod**: Runtime type validation and schema definition

### Real-time Communication
- **WebSocket (ws)**: Native WebSocket implementation for real-time messaging
- **Custom WebSocket hook**: Client-side abstraction for WebSocket communication

### Database and ORM
- **Drizzle ORM**: Type-safe ORM for database operations
- **Neon Database**: Serverless PostgreSQL database provider
- **Drizzle Kit**: Database migration and schema management tools

### Development and Build Tools
- **Vite**: Frontend build tool and development server
- **TypeScript**: Static type checking and enhanced developer experience
- **ESBuild**: Fast JavaScript bundler for production builds
- **PostCSS**: CSS processing and optimization

### File Handling
- **Multer**: Middleware for handling multipart/form-data file uploads
- **Date-fns**: Date manipulation and formatting utilities

### Utility Libraries
- **clsx**: Conditional className utility
- **class-variance-authority**: Type-safe variant API for component styling
- **nanoid**: URL-safe unique ID generator