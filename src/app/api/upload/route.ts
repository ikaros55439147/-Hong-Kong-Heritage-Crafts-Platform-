import { NextRequest, NextResponse } from 'next/server'
import { uploadService } from '@/lib/services/upload.service'
import { parseMultipartForm } from '@/lib/middleware/upload.middleware'
import { verifyToken } from '@/lib/auth/jwt'
import { z } from 'zod'

// Validation schema for upload metadata
const uploadMetadataSchema = z.object({
  category: z.string().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).optional()

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

    // Parse multipart form data
    const { files, fields } = await parseMultipartForm(request)

    if (files.length === 0) {
      return NextResponse.json(
        { error: 'No files provided' },
        { status: 400 }
      )
    }

    // Parse metadata if provided
    let metadata: any = {}
    if (fields.metadata) {
      try {
        const parsedMetadata = JSON.parse(fields.metadata)
        metadata = uploadMetadataSchema.parse(parsedMetadata)
      } catch (error) {
        return NextResponse.json(
          { error: 'Invalid metadata format' },
          { status: 400 }
        )
      }
    }

    // Upload files
    const uploadedFiles = await uploadService.uploadFiles(
      files.map(file => ({
        originalname: file.originalname,
        mimetype: file.mimetype,
        buffer: file.buffer,
        size: file.size,
      } as Express.Multer.File)),
      payload.userId,
      metadata
    )

    return NextResponse.json({
      success: true,
      files: uploadedFiles,
    })

  } catch (error) {
    console.error('Upload error:', error)
    
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

export async function GET(request: NextRequest) {
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

    // Parse query parameters
    const { searchParams } = new URL(request.url)
    const fileType = searchParams.get('fileType') as any
    const limit = parseInt(searchParams.get('limit') || '20')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Get user files
    const result = await uploadService.getUserFiles(payload.userId, {
      fileType,
      limit,
      offset,
    })

    return NextResponse.json({
      success: true,
      ...result,
    })

  } catch (error) {
    console.error('Get files error:', error)
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}