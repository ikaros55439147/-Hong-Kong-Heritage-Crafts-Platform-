import { NextRequest, NextResponse } from 'next/server'
import { uploadService } from '@/lib/services/upload.service'
import { verifyToken } from '@/lib/auth/jwt'
import { z } from 'zod'
import { v4 as uuidv4 } from 'uuid'
import path from 'path'

// Validation schema for presigned URL request
const presignedUrlSchema = z.object({
  fileName: z.string().min(1),
  fileType: z.string().min(1),
  fileSize: z.number().positive(),
})

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    const token = authHeader.substring(7)
    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json(
        { error: 'Invalid token' },
        { status: 401 }
      )
    }

    // Parse and validate request body
    const body = await request.json()
    const { fileName, fileType, fileSize } = presignedUrlSchema.parse(body)

    // Validate file type and size using upload service validation
    const mockFile = {
      originalname: fileName,
      mimetype: fileType,
      size: fileSize,
      buffer: Buffer.alloc(0),
    } as Express.Multer.File

    const validation = uploadService.validateFile(mockFile)
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.error },
        { status: 400 }
      )
    }

    // Generate unique file name
    const fileExtension = path.extname(fileName)
    const uniqueFileName = `${uuidv4()}${fileExtension}`

    // Generate presigned URL
    const presignedUrl = await uploadService.generatePresignedUrl(
      uniqueFileName,
      fileType,
      3600 // 1 hour expiration
    )

    return NextResponse.json({
      success: true,
      presignedUrl,
      fileName: uniqueFileName,
      expiresIn: 3600,
    })

  } catch (error) {
    console.error('Presigned URL error:', error)
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      )
    }

    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}