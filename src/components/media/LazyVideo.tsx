'use client'

import React, { useState, useRef, useEffect } from 'react'

interface LazyVideoProps {
  src: string
  poster?: string
  width?: number
  height?: number
  className?: string
  controls?: boolean
  autoPlay?: boolean
  muted?: boolean
  loop?: boolean
  onLoad?: () => void
  onError?: () => void
}

export const LazyVideo: React.FC<LazyVideoProps> = ({
  src,
  poster,
  width,
  height,
  className = '',
  controls = true,
  autoPlay = false,
  muted = false,
  loop = false,
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false)
  const [isInView, setIsInView] = useState(false)
  const [hasError, setHasError] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true)
          observer.disconnect()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px'
      }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  const handleLoadedData = () => {
    setIsLoaded(true)
    onLoad?.()
  }

  const handleError = () => {
    setHasError(true)
    onError?.()
  }

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {!isInView ? (
        <div 
          className="w-full h-full bg-gray-200 animate-pulse flex items-center justify-center rounded-lg"
          style={{ width, height: height || 200 }}
        >
          <div className="flex flex-col items-center space-y-2">
            <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="text-gray-400 text-sm">影片載入中...</div>
          </div>
        </div>
      ) : (
        <>
          {!isLoaded && !hasError && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center rounded-lg">
              <div className="flex flex-col items-center space-y-2">
                <div className="w-12 h-12 bg-gray-300 rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-gray-400 text-sm">影片載入中...</div>
              </div>
            </div>
          )}
          
          {hasError ? (
            <div className="w-full h-full bg-red-100 flex items-center justify-center rounded-lg">
              <div className="text-red-500 text-sm">影片載入失敗</div>
            </div>
          ) : (
            <video
              ref={videoRef}
              src={src}
              poster={poster}
              width={width}
              height={height}
              controls={controls}
              autoPlay={autoPlay}
              muted={muted}
              loop={loop}
              className={`transition-opacity duration-300 rounded-lg ${
                isLoaded ? 'opacity-100' : 'opacity-0'
              }`}
              onLoadedData={handleLoadedData}
              onError={handleError}
              preload="metadata"
            />
          )}
        </>
      )}
    </div>
  )
}