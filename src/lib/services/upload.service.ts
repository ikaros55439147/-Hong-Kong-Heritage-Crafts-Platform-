import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import sharp from 'sharp'
import { promises as fs } from 'fs'
import path from 'path'
import { v4 as uuidv4 } from 'uuid'
import { lookup } from 'mime-types'
import { UPLOAD_CONFIG, FileType, StorageType } from '../config/upload.config'
import { prisma } from '../database'

export interface UploadedFile {
  id: string
  originalName: string
  fileName: string
  fileType: string
  fileSize: number
  url: string
  thumbnailUrl?: string
  metadata?: Record<string, any>
}

export interface FileValidationResult {
  isValid: boolean
  error?: string
  fileType?: FileType
}

export class UploadService {
  private s3Client?: S3Client
  private storageType: StorageType

  constructor() {
    this.storageType = UPLOAD_CONFIG.STORAGE.TYPE as StorageType
    
    if (this.storageType === 's3') {
      this.s3Client = new S3Client({
        region: UPLOAD_CONFIG.STORAGE.S3_REGION,
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        },
      })
    }
  }

  /**
   * Validate uploaded file
   */
  validateFile(file: Express.Multer.File): FileValidationResult {
    // Determine file type category
    let fileType: FileType | undefined
    
    for (const [type, mimeTypes] of Object.entries(UPLOAD_CONFIG.ALLOWED_TYPES)) {
      if (mimeTypes.includes(file.mimetype)) {
        fileType = type as FileType
        break
      }
    }

    if (!fileType) {
      return {
        isValid: false,
        error: `File type ${file.mimetype} is not allowed`,
      }
    }

    // Check file size
    const maxSize = UPLOAD_CONFIG.MAX_FILE_SIZE[fileType]
    if (file.size > maxSize) {
      return {
        isValid: false,
        error: `File size ${file.size} exceeds maximum allowed size of ${maxSize} bytes`,
      }
    }

    return {
      isValid: true,
      fileType,
    }
  }

  /**
   * Process image file (resize, optimize)
   */
  private async processImage(
    buffer: Buffer,
    options: { thumbnail?: boolean; medium?: boolean } = {}
  ): Promise<{ processed: Buffer; metadata: any }> {
    const image = sharp(buffer)
    const metadata = await image.metadata()

    let processed = image

    // Resize if needed
    if (options.thumbnail) {
      processed = processed.resize(UPLOAD_CONFIG.IMAGE_PROCESSING.THUMBNAIL_SIZE, null, {
        withoutEnlargement: true,
      })
    } else if (options.medium) {
      processed = processed.resize(UPLOAD_CONFIG.IMAGE_PROCESSING.MEDIUM_SIZE, null, {
        withoutEnlargement: true,
      })
    }

    // Optimize
    processed = processed.jpeg({ quality: UPLOAD_CONFIG.IMAGE_PROCESSING.QUALITY })

    const processedBuffer = await processed.toBuffer()

    return {
      processed: processedBuffer,
      metadata: {
        width: metadata.width,
        height: metadata.height,
        format: metadata.format,
        size: processedBuffer.length,
      },
    }
  }

  /**
   * Upload file to storage
   */
  private async uploadToStorage(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    if (this.storageType === 's3') {
      return this.uploadToS3(buffer, fileName, mimeType)
    } else {
      return this.uploadToLocal(buffer, fileName)
    }
  }

  /**
   * Upload to S3
   */
  private async uploadToS3(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<string> {
    if (!this.s3Client || !UPLOAD_CONFIG.STORAGE.S3_BUCKET) {
      throw new Error('S3 configuration is missing')
    }

    const command = new PutObjectCommand({
      Bucket: UPLOAD_CONFIG.STORAGE.S3_BUCKET,
      Key: fileName,
      Body: buffer,
      ContentType: mimeType,
    })

    await this.s3Client.send(command)
    
    return `https://${UPLOAD_CONFIG.STORAGE.S3_BUCKET}.s3.${UPLOAD_CONFIG.STORAGE.S3_REGION}.amazonaws.com/${fileName}`
  }

  /**
   * Upload to local storage
   */
  private async uploadToLocal(buffer: Buffer, fileName: string): Promise<string> {
    const uploadDir = UPLOAD_CONFIG.STORAGE.LOCAL_PATH
    
    // Ensure upload directory exists
    await fs.mkdir(uploadDir, { recursive: true })
    
    const filePath = path.join(uploadDir, fileName)
    await fs.writeFile(filePath, buffer)
    
    return `/uploads/${fileName}`
  }

  /**
   * Delete file from storage
   */
  private async deleteFromStorage(fileName: string): Promise<void> {
    if (this.storageType === 's3') {
      await this.deleteFromS3(fileName)
    } else {
      await this.deleteFromLocal(fileName)
    }
  }

  /**
   * Delete from S3
   */
  private async deleteFromS3(fileName: string): Promise<void> {
    if (!this.s3Client || !UPLOAD_CONFIG.STORAGE.S3_BUCKET) {
      throw new Error('S3 configuration is missing')
    }

    const command = new DeleteObjectCommand({
      Bucket: UPLOAD_CONFIG.STORAGE.S3_BUCKET,
      Key: fileName,
    })

    await this.s3Client.send(command)
  }

  /**
   * Delete from local storage
   */
  private async deleteFromLocal(fileName: string): Promise<void> {
    const filePath = path.join(UPLOAD_CONFIG.STORAGE.LOCAL_PATH, fileName)
    try {
      await fs.unlink(filePath)
    } catch (error) {
      // File might not exist, ignore error
      console.warn(`Failed to delete file ${filePath}:`, error)
    }
  }

  /**
   * Upload single file
   */
  async uploadFile(
    file: Express.Multer.File,
    uploaderId: string,
    metadata?: Record<string, any>
  ): Promise<UploadedFile> {
    // Validate file
    const validation = this.validateFile(file)
    if (!validation.isValid) {
      throw new Error(validation.error)
    }

    const fileId = uuidv4()
    const fileExtension = path.extname(file.originalname)
    const fileName = `${fileId}${fileExtension}`
    
    let processedBuffer = file.buffer
    let fileMetadata = metadata || {}

    // Process image if needed
    if (validation.fileType === 'IMAGE') {
      const { processed, metadata: imageMetadata } = await this.processImage(file.buffer)
      processedBuffer = processed
      fileMetadata = { ...fileMetadata, ...imageMetadata }
    }

    // Upload to storage
    const fileUrl = await this.uploadToStorage(processedBuffer, fileName, file.mimetype)

    // Create thumbnail for images
    let thumbnailUrl: string | undefined
    if (validation.fileType === 'IMAGE') {
      const { processed: thumbnailBuffer } = await this.processImage(file.buffer, {
        thumbnail: true,
      })
      const thumbnailFileName = `thumb_${fileName}`
      thumbnailUrl = await this.uploadToStorage(
        thumbnailBuffer,
        thumbnailFileName,
        'image/jpeg'
      )
    }

    // Save to database
    const mediaFile = await prisma.mediaFile.create({
      data: {
        id: fileId,
        uploaderId,
        fileType: validation.fileType,
        fileUrl,
        fileSize: BigInt(processedBuffer.length),
        metadata: {
          ...fileMetadata,
          originalName: file.originalname,
          mimeType: file.mimetype,
          thumbnailUrl,
        },
      },
    })

    return {
      id: mediaFile.id,
      originalName: file.originalname,
      fileName,
      fileType: validation.fileType,
      fileSize: Number(mediaFile.fileSize),
      url: fileUrl,
      thumbnailUrl,
      metadata: fileMetadata,
    }
  }

  /**
   * Upload multiple files
   */
  async uploadFiles(
    files: Express.Multer.File[],
    uploaderId: string,
    metadata?: Record<string, any>
  ): Promise<UploadedFile[]> {
    const uploadPromises = files.map(file => this.uploadFile(file, uploaderId, metadata))
    return Promise.all(uploadPromises)
  }

  /**
   * Delete file
   */
  async deleteFile(fileId: string, userId: string): Promise<void> {
    const mediaFile = await prisma.mediaFile.findFirst({
      where: {
        id: fileId,
        uploaderId: userId,
      },
    })

    if (!mediaFile) {
      throw new Error('File not found or access denied')
    }

    // Extract filename from URL
    const fileName = path.basename(mediaFile.fileUrl)
    
    // Delete from storage
    await this.deleteFromStorage(fileName)

    // Delete thumbnail if exists
    const thumbnailUrl = mediaFile.metadata?.thumbnailUrl
    if (thumbnailUrl) {
      const thumbnailFileName = path.basename(thumbnailUrl)
      await this.deleteFromStorage(thumbnailFileName)
    }

    // Delete from database
    await prisma.mediaFile.delete({
      where: { id: fileId },
    })
  }

  /**
   * Get file by ID
   */
  async getFile(fileId: string): Promise<UploadedFile | null> {
    const mediaFile = await prisma.mediaFile.findUnique({
      where: { id: fileId },
    })

    if (!mediaFile) {
      return null
    }

    return {
      id: mediaFile.id,
      originalName: mediaFile.metadata?.originalName || 'unknown',
      fileName: path.basename(mediaFile.fileUrl),
      fileType: mediaFile.fileType,
      fileSize: Number(mediaFile.fileSize),
      url: mediaFile.fileUrl,
      thumbnailUrl: mediaFile.metadata?.thumbnailUrl,
      metadata: mediaFile.metadata as Record<string, any>,
    }
  }

  /**
   * Get files by user
   */
  async getUserFiles(
    userId: string,
    options: {
      fileType?: FileType
      limit?: number
      offset?: number
    } = {}
  ): Promise<{ files: UploadedFile[]; total: number }> {
    const { fileType, limit = 20, offset = 0 } = options

    const where = {
      uploaderId: userId,
      ...(fileType && { fileType }),
    }

    const [files, total] = await Promise.all([
      prisma.mediaFile.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.mediaFile.count({ where }),
    ])

    return {
      files: files.map(file => ({
        id: file.id,
        originalName: file.metadata?.originalName || 'unknown',
        fileName: path.basename(file.fileUrl),
        fileType: file.fileType,
        fileSize: Number(file.fileSize),
        url: file.fileUrl,
        thumbnailUrl: file.metadata?.thumbnailUrl,
        metadata: file.metadata as Record<string, any>,
      })),
      total,
    }
  }

  /**
   * Generate presigned URL for direct upload (S3 only)
   */
  async generatePresignedUrl(
    fileName: string,
    fileType: string,
    expiresIn: number = 3600
  ): Promise<string> {
    if (this.storageType !== 's3' || !this.s3Client || !UPLOAD_CONFIG.STORAGE.S3_BUCKET) {
      throw new Error('Presigned URLs are only available with S3 storage')
    }

    const command = new PutObjectCommand({
      Bucket: UPLOAD_CONFIG.STORAGE.S3_BUCKET,
      Key: fileName,
      ContentType: fileType,
    })

    return getSignedUrl(this.s3Client, command, { expiresIn })
  }
}

export const uploadService = new UploadService()