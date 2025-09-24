import { PrismaClient } from '@prisma/client'

interface QueryOptions {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
  include?: Record<string, boolean>
  select?: Record<string, boolean>
}

interface PaginationResult<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}

export class QueryOptimizerService {
  private prisma: PrismaClient

  constructor(prisma: PrismaClient) {
    this.prisma = prisma
  }

  // Optimized pagination with cursor-based approach for large datasets
  async paginateWithCursor<T>(
    model: any,
    options: QueryOptions & { cursor?: string }
  ): Promise<{ data: T[]; nextCursor?: string }> {
    const { limit = 20, cursor, sortBy = 'createdAt', sortOrder = 'desc', include, select } = options

    const queryOptions: any = {
      take: limit + 1, // Take one extra to check if there's a next page
      orderBy: { [sortBy]: sortOrder },
      ...(include && { include }),
      ...(select && { select })
    }

    if (cursor) {
      queryOptions.cursor = { id: cursor }
      queryOptions.skip = 1 // Skip the cursor item
    }

    const results = await model.findMany(queryOptions)
    
    const hasNext = results.length > limit
    const data = hasNext ? results.slice(0, -1) : results
    const nextCursor = hasNext ? results[results.length - 2].id : undefined

    return { data, nextCursor }
  }

  // Optimized offset-based pagination for smaller datasets
  async paginateWithOffset<T>(
    model: any,
    options: QueryOptions
  ): Promise<PaginationResult<T>> {
    const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', include, select } = options

    const skip = (page - 1) * limit

    const [data, total] = await Promise.all([
      model.findMany({
        skip,
        take: limit,
        orderBy: { [sortBy]: sortOrder },
        ...(include && { include }),
        ...(select && { select })
      }),
      model.count()
    ])

    const totalPages = Math.ceil(total / limit)

    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    }
  }

  // Batch operations for better performance
  async batchCreate<T>(model: any, data: T[]): Promise<{ count: number }> {
    return await model.createMany({
      data,
      skipDuplicates: true
    })
  }

  async batchUpdate<T>(model: any, updates: Array<{ where: any; data: T }>): Promise<void> {
    const promises = updates.map(({ where, data }) =>
      model.update({ where, data })
    )
    await Promise.all(promises)
  }

  // Optimized search with full-text search capabilities
  async searchWithFullText(
    model: any,
    searchTerm: string,
    searchFields: string[],
    options: QueryOptions = {}
  ): Promise<any[]> {
    const { limit = 20, include, select } = options

    // Use PostgreSQL full-text search if available
    const searchConditions = searchFields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive' as const
      }
    }))

    return await model.findMany({
      where: {
        OR: searchConditions
      },
      take: limit,
      ...(include && { include }),
      ...(select && { select }),
      orderBy: {
        _relevance: {
          fields: searchFields,
          search: searchTerm,
          sort: 'desc'
        }
      }
    })
  }

  // Aggregate queries with caching
  async getAggregatedData(
    model: any,
    aggregations: Record<string, any>,
    cacheKey?: string
  ): Promise<any> {
    // Check cache first if key provided
    if (cacheKey) {
      const cached = await this.getCachedResult(cacheKey)
      if (cached) return cached
    }

    const result = await model.aggregate(aggregations)

    // Cache result if key provided
    if (cacheKey) {
      await this.setCachedResult(cacheKey, result, 300) // 5 minutes
    }

    return result
  }

  // Optimized joins with selective field loading
  async findWithOptimizedJoins(
    model: any,
    where: any,
    relations: Record<string, { select?: any; include?: any }>
  ): Promise<any> {
    const include: any = {}

    for (const [relation, config] of Object.entries(relations)) {
      include[relation] = {
        ...(config.select && { select: config.select }),
        ...(config.include && { include: config.include })
      }
    }

    return await model.findMany({
      where,
      include
    })
  }

  // Query performance monitoring
  async executeWithTiming<T>(
    queryName: string,
    queryFn: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await queryFn()
      const duration = Date.now() - startTime
      
      // Log slow queries (> 1 second)
      if (duration > 1000) {
        console.warn(`Slow query detected: ${queryName} took ${duration}ms`)
      }
      
      return result
    } catch (error) {
      const duration = Date.now() - startTime
      console.error(`Query failed: ${queryName} after ${duration}ms`, error)
      throw error
    }
  }

  // Simple in-memory cache for query results
  private cache = new Map<string, { data: any; expiry: number }>()

  private async getCachedResult(key: string): Promise<any | null> {
    const cached = this.cache.get(key)
    if (cached && cached.expiry > Date.now()) {
      return cached.data
    }
    this.cache.delete(key)
    return null
  }

  private async setCachedResult(key: string, data: any, ttlSeconds: number): Promise<void> {
    this.cache.set(key, {
      data,
      expiry: Date.now() + (ttlSeconds * 1000)
    })
  }

  // Clean expired cache entries
  cleanExpiredCache(): void {
    const now = Date.now()
    for (const [key, value] of this.cache.entries()) {
      if (value.expiry <= now) {
        this.cache.delete(key)
      }
    }
  }
}

// Database connection pool optimization
export const optimizeDatabaseConnection = () => {
  return new PrismaClient({
    datasources: {
      db: {
        url: process.env.DATABASE_URL
      }
    },
    log: process.env.NODE_ENV === 'development' ? ['query', 'info', 'warn', 'error'] : ['error']
  })
}

// Query builder for complex searches
export class QueryBuilder {
  private conditions: any[] = []
  private sortOptions: any = {}
  private includeOptions: any = {}
  private selectOptions: any = {}

  where(condition: any): QueryBuilder {
    this.conditions.push(condition)
    return this
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): QueryBuilder {
    this.sortOptions[field] = direction
    return this
  }

  include(relations: any): QueryBuilder {
    this.includeOptions = { ...this.includeOptions, ...relations }
    return this
  }

  select(fields: any): QueryBuilder {
    this.selectOptions = { ...this.selectOptions, ...fields }
    return this
  }

  build(): any {
    const query: any = {}

    if (this.conditions.length > 0) {
      query.where = this.conditions.length === 1 
        ? this.conditions[0] 
        : { AND: this.conditions }
    }

    if (Object.keys(this.sortOptions).length > 0) {
      query.orderBy = this.sortOptions
    }

    if (Object.keys(this.includeOptions).length > 0) {
      query.include = this.includeOptions
    }

    if (Object.keys(this.selectOptions).length > 0) {
      query.select = this.selectOptions
    }

    return query
  }
}