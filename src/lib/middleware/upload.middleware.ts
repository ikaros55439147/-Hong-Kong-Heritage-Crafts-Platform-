import multer from 'multer'
import { NextRequest } from 'next/server'
import { UPLOAD_CONFIG } from '../config/upload.config'

// Configure multer for memory storage
const storage = multer.memoryStorage()

// Create multer instance
const upload = multer({
  storage,
  limits: {
    fileSize: Math.max(...Object.values(UPLOAD_CONFIG.MAX_FILE_SIZE)),
  },
  fileFilter: (req, file, cb) => {
    // Get all allowed mime types
    const allAllowedTypes = Object.values(UPLOAD_CONFIG.ALLOWED_TYPES).flat()
    
    if (allAllowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error(`File type ${file.mimetype} is not allowed`))
    }
  },
})

// Middleware for single file upload
export const uploadSingle = (fieldName: string = 'file') => upload.single(fieldName)

// Middleware for multiple file upload
export const uploadMultiple = (fieldName: string = 'files', maxCount: number = 10) => 
  upload.array(fieldName, maxCount)

// Helper function to promisify multer for Next.js API routes
export function runMiddleware(
  req: any,
  res: any,
  fn: Function
): Promise<any> {
  return new Promise((resolve, reject) => {
    fn(req, res, (result: any) => {
      if (result instanceof Error) {
        return reject(result)
      }
      return resolve(result)
    })
  })
}

// Type definitions for uploaded files
export interface MulterFile {
  fieldname: string
  originalname: string
  encoding: string
  mimetype: string
  buffer: Buffer
  size: number
}

// Helper to extract files from Next.js request
export async function parseMultipartForm(
  req: NextRequest,
  options: { single?: string; multiple?: { field: string; maxCount?: number } } = {}
): Promise<{ files: MulterFile[]; fields: Record<string, any> }> {
  // This is a simplified version - in a real implementation,
  // you might want to use a more robust multipart parser
  // or handle this differently based on your needs
  
  const formData = await req.formData()
  const files: MulterFile[] = []
  const fields: Record<string, any> = {}

  for (const [key, value] of formData.entries()) {
    if (value instanceof File) {
      const buffer = Buffer.from(await value.arrayBuffer())
      files.push({
        fieldname: key,
        originalname: value.name,
        encoding: '7bit',
        mimetype: value.type,
        buffer,
        size: buffer.length,
      })
    } else {
      fields[key] = value
    }
  }

  return { files, fields }
}