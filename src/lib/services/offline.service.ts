'use client'

interface OfflineAction {
  id: string
  type: string
  data: any
  timestamp: number
  retryCount: number
}

interface OfflineData {
  key: string
  data: any
  timestamp: number
  expiry?: number
}

export class OfflineService {
  private static instance: OfflineService
  private isOnline = true
  private pendingActions: OfflineAction[] = []
  private offlineData: Map<string, OfflineData> = new Map()
  private maxRetries = 3
  private retryDelay = 1000

  private constructor() {
    this.initializeOfflineSupport()
  }

  static getInstance(): OfflineService {
    if (!OfflineService.instance) {
      OfflineService.instance = new OfflineService()
    }
    return OfflineService.instance
  }

  private initializeOfflineSupport(): void {
    // Listen for online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', this.handleOnline.bind(this))
      window.addEventListener('offline', this.handleOffline.bind(this))
      
      // Initialize online status
      this.isOnline = navigator.onLine
      
      // Load pending actions from localStorage
      this.loadPendingActions()
      this.loadOfflineData()
    }
  }

  private handleOnline(): void {
    this.isOnline = true
    console.log('Connection restored - processing pending actions')
    this.processPendingActions()
  }

  private handleOffline(): void {
    this.isOnline = false
    console.log('Connection lost - entering offline mode')
  }

  // Check if currently online
  getOnlineStatus(): boolean {
    return this.isOnline
  }

  // Queue action for later execution when online
  queueAction(type: string, data: any): string {
    const action: OfflineAction = {
      id: this.generateId(),
      type,
      data,
      timestamp: Date.now(),
      retryCount: 0
    }

    this.pendingActions.push(action)
    this.savePendingActions()
    
    return action.id
  }

  // Store data for offline access
  storeOfflineData(key: string, data: any, ttlMinutes?: number): void {
    const offlineData: OfflineData = {
      key,
      data,
      timestamp: Date.now(),
      expiry: ttlMinutes ? Date.now() + (ttlMinutes * 60 * 1000) : undefined
    }

    this.offlineData.set(key, offlineData)
    this.saveOfflineData()
  }

  // Retrieve offline data
  getOfflineData(key: string): any | null {
    const data = this.offlineData.get(key)
    
    if (!data) return null
    
    // Check if data has expired
    if (data.expiry && Date.now() > data.expiry) {
      this.offlineData.delete(key)
      this.saveOfflineData()
      return null
    }
    
    return data.data
  }

  // Remove offline data
  removeOfflineData(key: string): void {
    this.offlineData.delete(key)
    this.saveOfflineData()
  }

  // Process all pending actions
  private async processPendingActions(): Promise<void> {
    if (!this.isOnline || this.pendingActions.length === 0) return

    const actionsToProcess = [...this.pendingActions]
    
    for (const action of actionsToProcess) {
      try {
        await this.executeAction(action)
        this.removePendingAction(action.id)
      } catch (error) {
        console.error(`Failed to execute action ${action.id}:`, error)
        
        action.retryCount++
        if (action.retryCount >= this.maxRetries) {
          console.error(`Action ${action.id} exceeded max retries, removing`)
          this.removePendingAction(action.id)
        } else {
          // Retry with exponential backoff
          setTimeout(() => {
            this.processPendingActions()
          }, this.retryDelay * Math.pow(2, action.retryCount))
        }
      }
    }
    
    this.savePendingActions()
  }

  // Execute a specific action
  private async executeAction(action: OfflineAction): Promise<void> {
    switch (action.type) {
      case 'CREATE_BOOKING':
        await this.executeCreateBooking(action.data)
        break
      case 'UPDATE_PROFILE':
        await this.executeUpdateProfile(action.data)
        break
      case 'ADD_TO_CART':
        await this.executeAddToCart(action.data)
        break
      case 'SUBMIT_REVIEW':
        await this.executeSubmitReview(action.data)
        break
      default:
        console.warn(`Unknown action type: ${action.type}`)
    }
  }

  // Action executors
  private async executeCreateBooking(data: any): Promise<void> {
    const response = await fetch('/api/bookings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to create booking: ${response.statusText}`)
    }
  }

  private async executeUpdateProfile(data: any): Promise<void> {
    const response = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.statusText}`)
    }
  }

  private async executeAddToCart(data: any): Promise<void> {
    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to add to cart: ${response.statusText}`)
    }
  }

  private async executeSubmitReview(data: any): Promise<void> {
    const response = await fetch(`/api/products/${data.productId}/reviews`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    
    if (!response.ok) {
      throw new Error(`Failed to submit review: ${response.statusText}`)
    }
  }

  // Remove a pending action
  private removePendingAction(actionId: string): void {
    this.pendingActions = this.pendingActions.filter(action => action.id !== actionId)
  }

  // Persistence methods
  private savePendingActions(): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('offline_pending_actions', JSON.stringify(this.pendingActions))
    }
  }

  private loadPendingActions(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('offline_pending_actions')
      if (stored) {
        try {
          this.pendingActions = JSON.parse(stored)
        } catch (error) {
          console.error('Failed to load pending actions:', error)
          this.pendingActions = []
        }
      }
    }
  }

  private saveOfflineData(): void {
    if (typeof window !== 'undefined') {
      const dataArray = Array.from(this.offlineData.entries())
      localStorage.setItem('offline_data', JSON.stringify(dataArray))
    }
  }

  private loadOfflineData(): void {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('offline_data')
      if (stored) {
        try {
          const dataArray = JSON.parse(stored)
          this.offlineData = new Map(dataArray)
          
          // Clean expired data
          this.cleanExpiredData()
        } catch (error) {
          console.error('Failed to load offline data:', error)
          this.offlineData = new Map()
        }
      }
    }
  }

  private cleanExpiredData(): void {
    const now = Date.now()
    for (const [key, data] of this.offlineData.entries()) {
      if (data.expiry && now > data.expiry) {
        this.offlineData.delete(key)
      }
    }
    this.saveOfflineData()
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  // Get offline statistics
  getOfflineStats() {
    return {
      isOnline: this.isOnline,
      pendingActions: this.pendingActions.length,
      offlineDataCount: this.offlineData.size,
      oldestPendingAction: this.pendingActions.length > 0 
        ? Math.min(...this.pendingActions.map(a => a.timestamp))
        : null
    }
  }

  // Clear all offline data
  clearOfflineData(): void {
    this.pendingActions = []
    this.offlineData.clear()
    
    if (typeof window !== 'undefined') {
      localStorage.removeItem('offline_pending_actions')
      localStorage.removeItem('offline_data')
    }
  }
}

export const offlineService = OfflineService.getInstance()