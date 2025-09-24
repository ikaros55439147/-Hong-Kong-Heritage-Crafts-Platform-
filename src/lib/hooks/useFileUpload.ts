import { useState, useCallback } from 'react'
import { UploadedFile } from '../services/upload.service'

export interface UploadProgress {
  fileId: string
  fileName: string
  progress: number
  status: 'pending' | 'uploading' | 'completed' | 'error'
  error?: string
}

export interface UseFileUploadOptions {
  onUploadComplete?: (files: UploadedFile[]) => void
  onUploadError?: (error: string) => void
  onUploadProgress?: (progress: UploadProgress[]) => void
  maxFiles?: number
  acceptedTypes?: string[]
}

export function useFileUpload(options: UseFileUploadOptions = {}) {
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress[]>([])
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([])

  const uploadFiles = useCallback(async (
    files: FileList | File[],
    metadata?: Record<string, any>
  ) => {
    const fileArray = Array.from(files)
    
    // Validate file count
    if (options.maxFiles && fileArray.length > options.maxFiles) {
      const error = `Maximum ${options.maxFiles} files allowed`
      options.onUploadError?.(error)
      return
    }

    // Validate file types
    if (options.acceptedTypes) {
      const invalidFiles = fileArray.filter(file => 
        !options.acceptedTypes!.includes(file.type)
      )
      if (invalidFiles.length > 0) {
        const error = `Invalid file types: ${invalidFiles.map(f => f.name).join(', ')}`
        options.onUploadError?.(error)
        return
      }
    }

    setIsUploading(true)
    
    // Initialize progress tracking
    const initialProgress: UploadProgress[] = fileArray.map((file, index) => ({
      fileId: `temp-${index}`,
      fileName: file.name,
      progress: 0,
      status: 'pending',
    }))
    
    setUploadProgress(initialProgress)
    options.onUploadProgress?.(initialProgress)

    try {
      // Create FormData
      const formData = new FormData()
      
      fileArray.forEach((file, index) => {
        formData.append('files', file)
      })
      
      if (metadata) {
        formData.append('metadata', JSON.stringify(metadata))
      }

      // Get auth token
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Authentication required')
      }

      // Update progress to uploading
      const uploadingProgress = initialProgress.map(p => ({
        ...p,
        status: 'uploading' as const,
        progress: 0,
      }))
      setUploadProgress(uploadingProgress)
      options.onUploadProgress?.(uploadingProgress)

      // Upload files
      const response = await fetch('/api/upload', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      // Update progress to completed
      const completedProgress = result.files.map((file: UploadedFile, index: number) => ({
        fileId: file.id,
        fileName: file.originalName,
        progress: 100,
        status: 'completed' as const,
      }))
      
      setUploadProgress(completedProgress)
      setUploadedFiles(prev => [...prev, ...result.files])
      
      options.onUploadProgress?.(completedProgress)
      options.onUploadComplete?.(result.files)

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      // Update progress to error
      const errorProgress = initialProgress.map(p => ({
        ...p,
        status: 'error' as const,
        error: errorMessage,
      }))
      
      setUploadProgress(errorProgress)
      options.onUploadProgress?.(errorProgress)
      options.onUploadError?.(errorMessage)
      
    } finally {
      setIsUploading(false)
    }
  }, [options])

  const deleteFile = useCallback(async (fileId: string) => {
    try {
      const token = localStorage.getItem('authToken')
      if (!token) {
        throw new Error('Authentication required')
      }

      const response = await fetch(`/api/upload/${fileId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Delete failed')
      }

      // Remove from uploaded files
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId))
      
      return true
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Delete failed'
      options.onUploadError?.(errorMessage)
      return false
    }
  }, [options])

  const clearUploads = useCallback(() => {
    setUploadProgress([])
    setUploadedFiles([])
  }, [])

  const resetProgress = useCallback(() => {
    setUploadProgress([])
  }, [])

  return {
    uploadFiles,
    deleteFile,
    clearUploads,
    resetProgress,
    isUploading,
    uploadProgress,
    uploadedFiles,
  }
}