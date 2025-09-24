import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'
import fs from 'fs/promises'
import mime from 'mime-types'

export interface CloudFile {
  id: string
  key: string
  url: string
  size: number
  contentType: string
  lastModified: Date
  metadata?: Record<string, any>
}

export interface UploadOptions {
  contentType?: string
  metadata?: Record<string, any>
  acl?: 'private' | 'public-read' | 'public-read-write'
  cacheControl?: string
  expires?: Date
}

export interface PresignedUrlOptions {
  expiresIn?: number // seconds
  contentType?: string
  contentLength?: number
}

export interface CloudStorageProvider {
  uploadFile(key: string, buffer: Buffer, options?: UploadOptions): Promise<CloudFile>
  downloadFile(key: string): Promise<Buffer>
  deleteFile(key: string): Promise<void>
  getFileInfo(key: string): Promise<CloudFile | null>
  listFiles(prefix?: string, maxKeys?: number): Promise<CloudFile[]>
  getPresignedUploadUrl(key: string, options?: PresignedUrlOptions): Promise<string>
  getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string>
  copyFile(sourceKey: string, destinationKey: string): Promise<CloudFile>
}

// AWS S3 provider
class S3Provider implements CloudStorageProvider {
  private s3Client: S3Client
  private bucketName: string

  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || ''
      }
    })
    this.bucketName = process.env.S3_BUCKET_NAME || 'heritage-crafts-bucket'
  }

  async uploadFile(key: string, buffer: Buffer, options?: UploadOptions): Promise<CloudFile> {
    try {
      const contentType = options?.contentType || mime.lookup(key) || 'application/octet-stream'
      
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        Body: buffer,
        ContentType: contentType,
        ACL: options?.acl || 'public-read',
        CacheControl: options?.cacheControl || 'max-age=31536000',
        Expires: options?.expires,
        Metadata: options?.metadata
      })

      await this.s3Client.send(command)

      return {
        id: uuidv4(),
        key,
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
        size: buffer.length,
        contentType,
        lastModified: new Date(),
        metadata: options?.metadata
      }
    } catch (error) {
      console.error('S3 upload error:', error)
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })

      const response = await this.s3Client.send(command)
      
      if (!response.Body) {
        throw new Error('No file content received')
      }

      const chunks: Uint8Array[] = []
      const stream = response.Body as any

      for await (const chunk of stream) {
        chunks.push(chunk)
      }

      return Buffer.concat(chunks)
    } catch (error) {
      console.error('S3 download error:', error)
      throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })

      await this.s3Client.send(command)
    } catch (error) {
      console.error('S3 delete error:', error)
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFileInfo(key: string): Promise<CloudFile | null> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })

      const response = await this.s3Client.send(command)

      return {
        id: uuidv4(),
        key,
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${key}`,
        size: response.ContentLength || 0,
        contentType: response.ContentType || 'application/octet-stream',
        lastModified: response.LastModified || new Date(),
        metadata: response.Metadata
      }
    } catch (error) {
      if ((error as any).name === 'NotFound') {
        return null
      }
      console.error('S3 head object error:', error)
      throw new Error(`Failed to get file info from S3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async listFiles(prefix?: string, maxKeys: number = 1000): Promise<CloudFile[]> {
    try {
      const command = new ListObjectsV2Command({
        Bucket: this.bucketName,
        Prefix: prefix,
        MaxKeys: maxKeys
      })

      const response = await this.s3Client.send(command)

      return (response.Contents || []).map(object => ({
        id: uuidv4(),
        key: object.Key!,
        url: `https://${this.bucketName}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${object.Key}`,
        size: object.Size || 0,
        contentType: 'application/octet-stream', // S3 doesn't return content type in list
        lastModified: object.LastModified || new Date()
      }))
    } catch (error) {
      console.error('S3 list objects error:', error)
      throw new Error(`Failed to list files from S3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPresignedUploadUrl(key: string, options?: PresignedUrlOptions): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: key,
        ContentType: options?.contentType,
        ContentLength: options?.contentLength
      })

      return await getSignedUrl(this.s3Client, command, {
        expiresIn: options?.expiresIn || 3600 // 1 hour default
      })
    } catch (error) {
      console.error('S3 presigned upload URL error:', error)
      throw new Error(`Failed to generate presigned upload URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: key
      })

      return await getSignedUrl(this.s3Client, command, { expiresIn })
    } catch (error) {
      console.error('S3 presigned download URL error:', error)
      throw new Error(`Failed to generate presigned download URL: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<CloudFile> {
    try {
      // S3 copy operation would use CopyObjectCommand
      // For now, we'll download and re-upload
      const buffer = await this.downloadFile(sourceKey)
      return await this.uploadFile(destinationKey, buffer)
    } catch (error) {
      console.error('S3 copy error:', error)
      throw new Error(`Failed to copy file in S3: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

// Local file system provider (for development/testing)
class LocalProvider implements CloudStorageProvider {
  private basePath: string

  constructor() {
    this.basePath = process.env.UPLOAD_PATH || './uploads'
  }

  async uploadFile(key: string, buffer: Buffer, options?: UploadOptions): Promise<CloudFile> {
    try {
      const filePath = path.join(this.basePath, key)
      const dir = path.dirname(filePath)
      
      // Ensure directory exists
      await fs.mkdir(dir, { recursive: true })
      
      // Write file
      await fs.writeFile(filePath, buffer)

      const stats = await fs.stat(filePath)
      const contentType = options?.contentType || mime.lookup(key) || 'application/octet-stream'

      return {
        id: uuidv4(),
        key,
        url: `/uploads/${key}`,
        size: stats.size,
        contentType,
        lastModified: stats.mtime,
        metadata: options?.metadata
      }
    } catch (error) {
      console.error('Local upload error:', error)
      throw new Error(`Failed to upload file locally: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    try {
      const filePath = path.join(this.basePath, key)
      return await fs.readFile(filePath)
    } catch (error) {
      console.error('Local download error:', error)
      throw new Error(`Failed to download file locally: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      const filePath = path.join(this.basePath, key)
      await fs.unlink(filePath)
    } catch (error) {
      console.error('Local delete error:', error)
      throw new Error(`Failed to delete file locally: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getFileInfo(key: string): Promise<CloudFile | null> {
    try {
      const filePath = path.join(this.basePath, key)
      const stats = await fs.stat(filePath)
      const contentType = mime.lookup(key) || 'application/octet-stream'

      return {
        id: uuidv4(),
        key,
        url: `/uploads/${key}`,
        size: stats.size,
        contentType,
        lastModified: stats.mtime
      }
    } catch (error) {
      if ((error as any).code === 'ENOENT') {
        return null
      }
      console.error('Local file info error:', error)
      throw new Error(`Failed to get file info locally: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async listFiles(prefix?: string, maxKeys: number = 1000): Promise<CloudFile[]> {
    try {
      const searchPath = prefix ? path.join(this.basePath, prefix) : this.basePath
      const files: CloudFile[] = []

      const readDir = async (dirPath: string, currentPrefix: string = ''): Promise<void> => {
        const entries = await fs.readdir(dirPath, { withFileTypes: true })
        
        for (const entry of entries) {
          if (files.length >= maxKeys) break
          
          const fullPath = path.join(dirPath, entry.name)
          const relativePath = path.join(currentPrefix, entry.name)
          
          if (entry.isDirectory()) {
            await readDir(fullPath, relativePath)
          } else {
            const stats = await fs.stat(fullPath)
            const contentType = mime.lookup(entry.name) || 'application/octet-stream'
            
            files.push({
              id: uuidv4(),
              key: relativePath,
              url: `/uploads/${relativePath}`,
              size: stats.size,
              contentType,
              lastModified: stats.mtime
            })
          }
        }
      }

      await readDir(searchPath)
      return files
    } catch (error) {
      console.error('Local list files error:', error)
      throw new Error(`Failed to list files locally: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  async getPresignedUploadUrl(key: string, options?: PresignedUrlOptions): Promise<string> {
    // Local storage doesn't need presigned URLs, return direct upload endpoint
    return `/api/upload?key=${encodeURIComponent(key)}`
  }

  async getPresignedDownloadUrl(key: string, expiresIn: number = 3600): Promise<string> {
    // Local storage doesn't need presigned URLs, return direct file URL
    return `/uploads/${key}`
  }

  async copyFile(sourceKey: string, destinationKey: string): Promise<CloudFile> {
    try {
      const buffer = await this.downloadFile(sourceKey)
      return await this.uploadFile(destinationKey, buffer)
    } catch (error) {
      console.error('Local copy error:', error)
      throw new Error(`Failed to copy file locally: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
}

export class CloudStorageService {
  private provider: CloudStorageProvider

  constructor() {
    const storageType = process.env.STORAGE_TYPE || 'local'
    
    switch (storageType) {
      case 's3':
        this.provider = new S3Provider()
        break
      case 'local':
      default:
        this.provider = new LocalProvider()
        break
    }
  }

  /**
   * Upload a file to cloud storage
   */
  async uploadFile(key: string, buffer: Buffer, options?: UploadOptions): Promise<CloudFile> {
    return this.provider.uploadFile(key, buffer, options)
  }

  /**
   * Download a file from cloud storage
   */
  async downloadFile(key: string): Promise<Buffer> {
    return this.provider.downloadFile(key)
  }

  /**
   * Delete a file from cloud storage
   */
  async deleteFile(key: string): Promise<void> {
    return this.provider.deleteFile(key)
  }

  /**
   * Get file information
   */
  async getFileInfo(key: string): Promise<CloudFile | null> {
    return this.provider.getFileInfo(key)
  }

  /**
   * List files with optional prefix filter
   */
  async listFiles(prefix?: string, maxKeys?: number): Promise<CloudFile[]> {
    return this.provider.listFiles(prefix, maxKeys)
  }

  /**
   * Generate presigned URL for file upload
   */
  async getPresignedUploadUrl(key: string, options?: PresignedUrlOptions): Promise<string> {
    return this.provider.getPresignedUploadUrl(key, options)
  }

  /**
   * Generate presigned URL for file download
   */
  async getPresignedDownloadUrl(key: string, expiresIn?: number): Promise<string> {
    return this.provider.getPresignedDownloadUrl(key, expiresIn)
  }

  /**
   * Copy a file within cloud storage
   */
  async copyFile(sourceKey: string, destinationKey: string): Promise<CloudFile> {
    return this.provider.copyFile(sourceKey, destinationKey)
  }

  /**
   * Upload file with automatic key generation
   */
  async uploadFileWithAutoKey(
    buffer: Buffer, 
    originalName: string, 
    folder: string = 'uploads',
    options?: UploadOptions
  ): Promise<CloudFile> {
    const ext = path.extname(originalName)
    const key = `${folder}/${uuidv4()}${ext}`
    
    return this.uploadFile(key, buffer, {
      ...options,
      contentType: options?.contentType || mime.lookup(originalName) || 'application/octet-stream'
    })
  }

  /**
   * Upload multiple files
   */
  async uploadMultipleFiles(
    files: Array<{ key: string; buffer: Buffer; options?: UploadOptions }>
  ): Promise<CloudFile[]> {
    const uploadPromises = files.map(file => 
      this.uploadFile(file.key, file.buffer, file.options)
    )
    
    return Promise.all(uploadPromises)
  }

  /**
   * Delete multiple files
   */
  async deleteMultipleFiles(keys: string[]): Promise<void> {
    const deletePromises = keys.map(key => this.deleteFile(key))
    await Promise.all(deletePromises)
  }

  /**
   * Check if file exists
   */
  async fileExists(key: string): Promise<boolean> {
    try {
      const fileInfo = await this.getFileInfo(key)
      return fileInfo !== null
    } catch {
      return false
    }
  }

  /**
   * Get file size
   */
  async getFileSize(key: string): Promise<number | null> {
    try {
      const fileInfo = await this.getFileInfo(key)
      return fileInfo?.size || null
    } catch {
      return null
    }
  }

  /**
   * Generate unique file key
   */
  generateFileKey(originalName: string, folder: string = 'uploads'): string {
    const ext = path.extname(originalName)
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `${folder}/${timestamp}-${random}${ext}`
  }

  /**
   * Get storage provider type
   */
  getProviderType(): string {
    return process.env.STORAGE_TYPE || 'local'
  }

  /**
   * Get storage configuration
   */
  getStorageConfig(): Record<string, any> {
    return {
      type: this.getProviderType(),
      bucket: process.env.S3_BUCKET_NAME,
      region: process.env.AWS_REGION,
      basePath: process.env.UPLOAD_PATH
    }
  }
}

export const cloudStorageService = new CloudStorageService()