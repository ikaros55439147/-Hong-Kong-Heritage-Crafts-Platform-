export const UPLOAD_CONFIG = {
  // File size limits (in bytes)
  MAX_FILE_SIZE: {
    IMAGE: 10 * 1024 * 1024, // 10MB
    VIDEO: 100 * 1024 * 1024, // 100MB
    DOCUMENT: 5 * 1024 * 1024, // 5MB
  },
  
  // Allowed file types
  ALLOWED_TYPES: {
    IMAGE: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
    VIDEO: ['video/mp4', 'video/webm', 'video/quicktime'],
    DOCUMENT: ['application/pdf', 'text/plain'],
  },
  
  // Storage configuration
  STORAGE: {
    TYPE: process.env.STORAGE_TYPE || 'local', // 'local' or 's3'
    LOCAL_PATH: process.env.UPLOAD_PATH || './uploads',
    S3_BUCKET: process.env.S3_BUCKET_NAME,
    S3_REGION: process.env.AWS_REGION || 'us-east-1',
  },
  
  // Image processing
  IMAGE_PROCESSING: {
    THUMBNAIL_SIZE: 300,
    MEDIUM_SIZE: 800,
    QUALITY: 85,
  },
} as const

export type FileType = keyof typeof UPLOAD_CONFIG.ALLOWED_TYPES
export type StorageType = 'local' | 's3'