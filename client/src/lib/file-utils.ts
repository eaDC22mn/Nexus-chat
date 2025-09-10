export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function getFileIcon(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'fas fa-file-image';
  if (mimetype.startsWith('video/')) return 'fas fa-file-video';
  if (mimetype.startsWith('audio/')) return 'fas fa-file-audio';
  if (mimetype.includes('pdf')) return 'fas fa-file-pdf';
  if (mimetype.includes('word')) return 'fas fa-file-word';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'fas fa-file-excel';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'fas fa-file-powerpoint';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) return 'fas fa-file-archive';
  return 'fas fa-file-alt';
}

export function getFileColor(mimetype: string): string {
  if (mimetype.startsWith('image/')) return 'text-primary';
  if (mimetype.startsWith('video/')) return 'text-accent';
  if (mimetype.startsWith('audio/')) return 'text-secondary';
  if (mimetype.includes('pdf')) return 'text-destructive';
  if (mimetype.includes('word')) return 'text-primary';
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'text-accent';
  if (mimetype.includes('powerpoint') || mimetype.includes('presentation')) return 'text-orange-500';
  if (mimetype.includes('zip') || mimetype.includes('rar') || mimetype.includes('archive')) return 'text-yellow-500';
  return 'text-muted-foreground';
}

export function isImageFile(mimetype: string): boolean {
  return mimetype.startsWith('image/');
}

export async function uploadFile(file: File): Promise<any> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to upload file');
  }

  return response.json();
}
