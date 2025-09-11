import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface ProfilePictureProps {
  src?: string | null;
  username: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export function ProfilePicture({ 
  src, 
  username, 
  size = 'md', 
  className = '' 
}: ProfilePictureProps) {
  const sizeClasses = {
    xs: 'w-6 h-6',
    sm: 'w-8 h-8', 
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-16 h-16'
  };

  const textSizes = {
    xs: 'text-xs',
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-lg'
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <Avatar className={`${sizeClasses[size]} ${className}`}>
      <AvatarImage src={src || undefined} alt={username} />
      <AvatarFallback className={`${textSizes[size]} font-medium`}>
        {getInitials(username)}
      </AvatarFallback>
    </Avatar>
  );
}