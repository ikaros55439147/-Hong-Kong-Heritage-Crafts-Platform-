import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { UploadService } from '../upload.service'
import { UPLOAD_CONFIG } from '../../config/upload.config'
import { prisma } from '../../database'

// Mock dependencies
vi.mock('../../database', () => ({
  prisma: {
    mediaFile: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}))

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn(),
  PutObjectCommand: vi.fn(),
  DeleteObjectCommand: vi.fn(),
}))

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn(),
}))

vi.mock('sharp', () => {
  return {
    default: vi.fn(() => {
      const mockInstance = {
        metadata: vi.fn().mockResolvedValue({
          width: 800,
          height: 600,
          format: 'jpeg',
        }),
        resize: vi.fn(),
        jpeg: vi.fn(),
        toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image')),
      }
      
      // Make methods chainable by returning the instance
      mockInstance.resize.mockReturnValue(mockInstance)
      mockInstance.jpeg.mockReturnValue(mockInstance)
      
      return mockInstance
    }),
  }
})

vi.mock('uuid', () => ({
  v4: vi.fn(() => 'test-uuid'),
}))

vi.mock('fs', async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    promises: {
      mkdir: vi.fn(),
      writeFile: vi.fn(),
      unlink: vi.fn(),
    },
  }
})

describe('UploadService', () => {
  let uploadService: UploadService
  
  beforeEach(() => {
    uploadService = new UploadService()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('validateFile', () => {
    it('should validate image file successfully', () => {
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024, // 1MB
        buffer: Buffer.from('test'),
      } as Express.Multer.File

      const result = uploadService.validateFile(mockFile)

      expect(result.isValid).toBe(true)
      expect(result.fileType).toBe('IMAGE')
    })

    it('should reject file with invalid mime type', () => {
      const mockFile = {
        originalname: 'test.exe',
        mimetype: 'application/x-executable',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File

      const result = uploadService.validateFile(mockFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('not allowed')
    })

    it('should reject file that exceeds size limit', () => {
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: UPLOAD_CONFIG.MAX_FILE_SIZE.IMAGE + 1,
        buffer: Buffer.from('test'),
      } as Express.Multer.File

      const result = uploadService.validateFile(mockFile)

      expect(result.isValid).toBe(false)
      expect(result.error).toContain('exceeds maximum allowed size')
    })

    it('should validate video file successfully', () => {
      const mockFile = {
        originalname: 'test.mp4',
        mimetype: 'video/mp4',
        size: 50 * 1024 * 1024, // 50MB
        buffer: Buffer.from('test'),
      } as Express.Multer.File

      const result = uploadService.validateFile(mockFile)

      expect(result.isValid).toBe(true)
      expect(result.fileType).toBe('VIDEO')
    })

    it('should validate document file successfully', () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 2 * 1024 * 1024, // 2MB
        buffer: Buffer.from('test'),
      } as Express.Multer.File

      const result = uploadService.validateFile(mockFile)

      expect(result.isValid).toBe(true)
      expect(result.fileType).toBe('DOCUMENT')
    })
  })

  describe('uploadFile', () => {
    it('should upload image file successfully', async () => {
      const mockFile = {
        originalname: 'test.jpg',
        mimetype: 'image/jpeg',
        size: 1024 * 1024,
        buffer: Buffer.from('test-image'),
      } as Express.Multer.File

      const mockMediaFile = {
        id: 'test-id',
        uploaderId: 'user-id',
        fileType: 'IMAGE',
        fileUrl: '/uploads/test-id.jpg',
        fileSize: BigInt(1024),
        metadata: {
          originalName: 'test.jpg',
          mimeType: 'image/jpeg',
          width: 800,
          height: 600,
          format: 'jpeg',
        },
      }

      vi.mocked(prisma.mediaFile.create).mockResolvedValue(mockMediaFile as any)

      const result = await uploadService.uploadFile(mockFile, 'user-id')

      expect(result.id).toBe('test-id')
      expect(result.originalName).toBe('test.jpg')
      expect(result.fileType).toBe('IMAGE')
      expect(result.url).toBe('/uploads/test-uuid.jpg')
      expect(prisma.mediaFile.create).toHaveBeenCalled()
    })

    it('should reject invalid file', async () => {
      const mockFile = {
        originalname: 'test.exe',
        mimetype: 'application/x-executable',
        size: 1024,
        buffer: Buffer.from('test'),
      } as Express.Multer.File

      await expect(uploadService.uploadFile(mockFile, 'user-id'))
        .rejects.toThrow('not allowed')
    })
  })

  describe('uploadFiles', () => {
    it('should upload multiple files successfully', async () => {
      const mockFiles = [
        {
          originalname: 'test1.jpg',
          mimetype: 'image/jpeg',
          size: 1024,
          buffer: Buffer.from('test1'),
        },
        {
          originalname: 'test2.jpg',
          mimetype: 'image/jpeg',
          size: 2048,
          buffer: Buffer.from('test2'),
        },
      ] as Express.Multer.File[]

      const mockMediaFiles = [
        {
          id: 'test-id-1',
          uploaderId: 'user-id',
          fileType: 'IMAGE',
          fileUrl: '/uploads/test-id-1.jpg',
          fileSize: BigInt(1024),
          metadata: { originalName: 'test1.jpg' },
        },
        {
          id: 'test-id-2',
          uploaderId: 'user-id',
          fileType: 'IMAGE',
          fileUrl: '/uploads/test-id-2.jpg',
          fileSize: BigInt(2048),
          metadata: { originalName: 'test2.jpg' },
        },
      ]

      vi.mocked(prisma.mediaFile.create)
        .mockResolvedValueOnce(mockMediaFiles[0] as any)
        .mockResolvedValueOnce(mockMediaFiles[1] as any)

      const result = await uploadService.uploadFiles(mockFiles, 'user-id')

      expect(result).toHaveLength(2)
      expect(result[0].originalName).toBe('test1.jpg')
      expect(result[1].originalName).toBe('test2.jpg')
      expect(prisma.mediaFile.create).toHaveBeenCalledTimes(2)
    })
  })

  describe('getFile', () => {
    it('should return file if exists', async () => {
      const mockMediaFile = {
        id: 'test-id',
        uploaderId: 'user-id',
        fileType: 'IMAGE',
        fileUrl: '/uploads/test-id.jpg',
        fileSize: BigInt(1024),
        metadata: {
          originalName: 'test.jpg',
          mimeType: 'image/jpeg',
        },
      }

      vi.mocked(prisma.mediaFile.findUnique).mockResolvedValue(mockMediaFile as any)

      const result = await uploadService.getFile('test-id')

      expect(result).not.toBeNull()
      expect(result?.id).toBe('test-id')
      expect(result?.originalName).toBe('test.jpg')
    })

    it('should return null if file does not exist', async () => {
      vi.mocked(prisma.mediaFile.findUnique).mockResolvedValue(null)

      const result = await uploadService.getFile('non-existent-id')

      expect(result).toBeNull()
    })
  })

  describe('getUserFiles', () => {
    it('should return user files with pagination', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          uploaderId: 'user-id',
          fileType: 'IMAGE',
          fileUrl: '/uploads/file-1.jpg',
          fileSize: BigInt(1024),
          metadata: { originalName: 'file1.jpg' },
        },
        {
          id: 'file-2',
          uploaderId: 'user-id',
          fileType: 'IMAGE',
          fileUrl: '/uploads/file-2.jpg',
          fileSize: BigInt(2048),
          metadata: { originalName: 'file2.jpg' },
        },
      ]

      vi.mocked(prisma.mediaFile.findMany).mockResolvedValue(mockFiles as any)
      vi.mocked(prisma.mediaFile.count).mockResolvedValue(2)

      const result = await uploadService.getUserFiles('user-id', {
        limit: 10,
        offset: 0,
      })

      expect(result.files).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.files[0].originalName).toBe('file1.jpg')
    })

    it('should filter by file type', async () => {
      const mockFiles = [
        {
          id: 'file-1',
          uploaderId: 'user-id',
          fileType: 'IMAGE',
          fileUrl: '/uploads/file-1.jpg',
          fileSize: BigInt(1024),
          metadata: { originalName: 'file1.jpg' },
        },
      ]

      vi.mocked(prisma.mediaFile.findMany).mockResolvedValue(mockFiles as any)
      vi.mocked(prisma.mediaFile.count).mockResolvedValue(1)

      const result = await uploadService.getUserFiles('user-id', {
        fileType: 'IMAGE',
      })

      expect(result.files).toHaveLength(1)
      expect(result.files[0].fileType).toBe('IMAGE')
    })
  })

  describe('deleteFile', () => {
    it('should delete file successfully', async () => {
      const mockMediaFile = {
        id: 'test-id',
        uploaderId: 'user-id',
        fileType: 'IMAGE',
        fileUrl: '/uploads/test-id.jpg',
        fileSize: BigInt(1024),
        metadata: { originalName: 'test.jpg' },
      }

      vi.mocked(prisma.mediaFile.findFirst).mockResolvedValue(mockMediaFile as any)
      vi.mocked(prisma.mediaFile.delete).mockResolvedValue(mockMediaFile as any)

      await expect(uploadService.deleteFile('test-id', 'user-id'))
        .resolves.not.toThrow()

      expect(prisma.mediaFile.delete).toHaveBeenCalledWith({
        where: { id: 'test-id' },
      })
    })

    it('should throw error if file not found or access denied', async () => {
      vi.mocked(prisma.mediaFile.findFirst).mockResolvedValue(null)

      await expect(uploadService.deleteFile('test-id', 'user-id'))
        .rejects.toThrow('File not found or access denied')
    })
  })
})