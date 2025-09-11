import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Camera, Upload, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface ProfilePictureUploadProps {
  currentAvatar?: string | null;
  username: string;
  userId: string;
  authenticatedUserId?: string; // Add authenticated user ID for security
  onAvatarUpdate?: (avatarUrl: string) => void;
  size?: 'sm' | 'md' | 'lg';
  showUploadText?: boolean;
}

export function ProfilePictureUpload({ 
  currentAvatar, 
  username, 
  userId, 
  authenticatedUserId,
  onAvatarUpdate,
  size = 'md',
  showUploadText = true 
}: ProfilePictureUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const sizeClasses = {
    sm: 'w-12 h-12',
    md: 'w-24 h-24',
    lg: 'w-32 h-32'
  };

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid file type",
        description: "Please select a JPEG, PNG, GIF, or WebP image.",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (2MB)
    const maxSize = 2 * 1024 * 1024;
    if (file.size > maxSize) {
      toast({
        title: "File too large",
        description: "Please select an image smaller than 2MB.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      // Security check: Ensure user can only update their own avatar
      if (!authenticatedUserId) {
        toast({
          title: "Authentication required",
          description: "Please log in to update your profile picture.",
          variant: "destructive",
        });
        return;
      }

      if (authenticatedUserId !== userId) {
        toast({
          title: "Access denied",
          description: "You can only update your own profile picture.",
          variant: "destructive",
        });
        return;
      }

      const formData = new FormData();
      formData.append('avatar', file);

      const response = await fetch(`/api/users/${userId}/avatar`, {
        method: 'POST',
        headers: {
          'X-User-Id': authenticatedUserId, // Include authentication header
        },
        body: formData,
      });

      if (response.ok) {
        const updatedUser = await response.json();
        toast({
          title: "Profile picture updated",
          description: "Your profile picture has been successfully updated.",
        });
        
        if (onAvatarUpdate && updatedUser.avatar) {
          onAvatarUpdate(updatedUser.avatar);
        }
      } else {
        const error = await response.json();
        toast({
          title: "Upload failed",
          description: error.message || "Failed to upload profile picture.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "Upload failed",
        description: "An error occurred while uploading your profile picture.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setDragOver(false);
    
    const file = event.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <div 
        className={`relative ${sizeClasses[size]} rounded-full overflow-hidden border-2 border-dashed border-border transition-colors ${
          dragOver ? 'border-primary bg-primary/10' : ''
        } ${isUploading ? 'opacity-50' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        data-testid="avatar-upload-area"
      >
        <Avatar className="w-full h-full">
          <AvatarImage src={currentAvatar || undefined} alt={username} />
          <AvatarFallback className="text-lg font-semibold">
            {getInitials(username)}
          </AvatarFallback>
        </Avatar>
        
        {/* Upload overlay */}
        <div 
          className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity cursor-pointer"
          onClick={triggerFileInput}
          data-testid="avatar-upload-overlay"
        >
          <Camera className="w-6 h-6 text-white" />
        </div>
        
        {isUploading && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {showUploadText && (
        <div className="text-center">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={triggerFileInput}
            disabled={isUploading}
            data-testid="button-upload-avatar"
          >
            <Upload className="w-4 h-4 mr-2" />
            {isUploading ? 'Uploading...' : 'Upload Photo'}
          </Button>
          <p className="text-xs text-muted-foreground mt-2">
            JPEG, PNG, GIF or WebP. Max 2MB.
          </p>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
        onChange={handleFileInputChange}
        className="hidden"
        data-testid="input-avatar-file"
      />
    </div>
  );
}