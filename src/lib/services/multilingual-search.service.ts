import { SupportedLanguage, defaultLanguage } from '../i18n/config'
import { MultilingualContentService, MultilingualContent } from './multilingual-content.service'

export interface SearchableEntity {
  id: string
  type: 'course' | 'product' | 'craftsman' | 'event'
  title: MultilingualContent
  description?: MultilingualContent
  content?: MultilingualContent
  tags?: string[]
  category?: string
  createdAt: Date
  updatedAt: Date
}

export interface SearchQuery {
  query: string
  language: SupportedLanguage
  entityTypes?: Array<'course' | 'product' | 'craftsman' | 'event'>
  categories?: string[]
  tags?: string[]
  limit?: number
  offset?: number
}

export interface SearchResult {
  entity: SearchableEntity
  score: number
  matchedFields: string[]
  highlightedContent: {
    title?: string
    description?: string
    content?: string
  }
}

export interface SearchResponse {
  results: SearchResult[]
  total: number
  query: SearchQuery
  suggestions?: string[]
  facets?: {
    categories: Array<{ name: string; count: number }>
    tags: Array<{ name: string; count: number }>
    entityTypes: Array<{ type: string; count: number }>
  }
}

export class MultilingualSearchService {
  /**
   * Search entities with multilingual support
   */
  static async search(query: SearchQuery): Promise<SearchResponse> {
    // This would typically integrate with Elasticsearch or similar search engine
    // For now, we'll implement a basic in-memory search
    
    const entities = await this.getSearchableEntities(query.entityTypes)
    const results = this.performSearch(entities, query)
    const facets = this.calculateFacets(entities, query)
    const suggestions = await this.generateSuggestions(query)

    return {
      results,
      total: results.length,
      query,
      suggestions,
      facets
    }
  }

  /**
   * Perform multilingual search on entities
   */
  private static performSearch(entities: SearchableEntity[], query: SearchQuery): SearchResult[] {
    const { query: searchTerm, language } = query
    const normalizedQuery = this.normalizeSearchTerm(searchTerm)
    
    if (!normalizedQuery) {
      return []
    }

    const results: SearchResult[] = []

    for (const entity of entities) {
      const score = this.calculateRelevanceScore(entity, normalizedQuery, language)
      
      if (score > 0) {
        const matchedFields = this.getMatchedFields(entity, normalizedQuery, language)
        const highlightedContent = this.generateHighlights(entity, normalizedQuery, language)
        
        results.push({
          entity,
          score,
          matchedFields,
          highlightedContent
        })
      }
    }

    // Sort by relevance score (descending)
    results.sort((a, b) => b.score - a.score)

    // Apply pagination
    const offset = query.offset || 0
    const limit = query.limit || 20
    
    return results.slice(offset, offset + limit)
  }

  /**
   * Calculate relevance score for an entity
   */
  private static calculateRelevanceScore(
    entity: SearchableEntity, 
    query: string, 
    language: SupportedLanguage
  ): number {
    let score = 0
    const queryTerms = query.toLowerCase().split(/\s+/)

    // Search in title (highest weight)
    const title = MultilingualContentService.getContent(entity.title, language).toLowerCase()
    for (const term of queryTerms) {
      if (title.includes(term)) {
        score += title === term ? 100 : (title.startsWith(term) ? 50 : 20)
      }
    }

    // Search in description (medium weight)
    if (entity.description) {
      const description = MultilingualContentService.getContent(entity.description, language).toLowerCase()
      for (const term of queryTerms) {
        if (description.includes(term)) {
          score += 10
        }
      }
    }

    // Search in content (lower weight)
    if (entity.content) {
      const content = MultilingualContentService.getContent(entity.content, language).toLowerCase()
      for (const term of queryTerms) {
        if (content.includes(term)) {
          score += 5
        }
      }
    }

    // Search in tags (medium weight)
    if (entity.tags) {
      for (const tag of entity.tags) {
        for (const term of queryTerms) {
          if (tag.toLowerCase().includes(term)) {
            score += 15
          }
        }
      }
    }

    // Search in category (medium weight)
    if (entity.category) {
      for (const term of queryTerms) {
        if (entity.category.toLowerCase().includes(term)) {
          score += 15
        }
      }
    }

    // Boost recent content
    const daysSinceUpdate = (Date.now() - entity.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
    if (daysSinceUpdate < 30) {
      score *= 1.2
    }

    return score
  }

  /**
   * Get matched fields for highlighting
   */
  private static getMatchedFields(
    entity: SearchableEntity, 
    query: string, 
    language: SupportedLanguage
  ): string[] {
    const matchedFields: string[] = []
    const queryTerms = query.toLowerCase().split(/\s+/)

    // Check title
    const title = MultilingualContentService.getContent(entity.title, language).toLowerCase()
    if (queryTerms.some(term => title.includes(term))) {
      matchedFields.push('title')
    }

    // Check description
    if (entity.description) {
      const description = MultilingualContentService.getContent(entity.description, language).toLowerCase()
      if (queryTerms.some(term => description.includes(term))) {
        matchedFields.push('description')
      }
    }

    // Check content
    if (entity.content) {
      const content = MultilingualContentService.getContent(entity.content, language).toLowerCase()
      if (queryTerms.some(term => content.includes(term))) {
        matchedFields.push('content')
      }
    }

    return matchedFields
  }

  /**
   * Generate highlighted content snippets
   */
  private static generateHighlights(
    entity: SearchableEntity, 
    query: string, 
    language: SupportedLanguage
  ): { title?: string; description?: string; content?: string } {
    const queryTerms = query.toLowerCase().split(/\s+/)
    const highlights: { title?: string; description?: string; content?: string } = {}

    // Highlight title
    const title = MultilingualContentService.getContent(entity.title, language)
    highlights.title = this.highlightText(title, queryTerms)

    // Highlight description
    if (entity.description) {
      const description = MultilingualContentService.getContent(entity.description, language)
      highlights.description = this.highlightText(description, queryTerms, 200)
    }

    // Highlight content
    if (entity.content) {
      const content = MultilingualContentService.getContent(entity.content, language)
      highlights.content = this.highlightText(content, queryTerms, 300)
    }

    return highlights
  }

  /**
   * Highlight search terms in text
   */
  private static highlightText(text: string, terms: string[], maxLength?: number): string {
    let highlighted = text
    
    // Find the best snippet if maxLength is specified
    if (maxLength && text.length > maxLength) {
      const bestSnippet = this.findBestSnippet(text, terms, maxLength)
      highlighted = bestSnippet
    }

    // Apply highlighting
    for (const term of terms) {
      const regex = new RegExp(`(${this.escapeRegex(term)})`, 'gi')
      highlighted = highlighted.replace(regex, '<mark>$1</mark>')
    }

    return highlighted
  }

  /**
   * Find the best snippet containing search terms
   */
  private static findBestSnippet(text: string, terms: string[], maxLength: number): string {
    const words = text.split(/\s+/)
    let bestScore = 0
    let bestStart = 0
    let bestEnd = Math.min(words.length, Math.floor(maxLength / 6)) // Rough estimate of words per length

    // Sliding window to find best snippet
    for (let start = 0; start < words.length; start++) {
      const end = Math.min(start + Math.floor(maxLength / 6), words.length)
      const snippet = words.slice(start, end).join(' ').toLowerCase()
      
      let score = 0
      for (const term of terms) {
        const matches = (snippet.match(new RegExp(this.escapeRegex(term), 'g')) || []).length
        score += matches
      }

      if (score > bestScore) {
        bestScore = score
        bestStart = start
        bestEnd = end
      }
    }

    const snippet = words.slice(bestStart, bestEnd).join(' ')
    return bestStart > 0 ? '...' + snippet : snippet
  }

  /**
   * Escape regex special characters
   */
  private static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }

  /**
   * Normalize search term
   */
  private static normalizeSearchTerm(query: string): string {
    return query.trim().toLowerCase()
  }

  /**
   * Calculate search facets
   */
  private static calculateFacets(entities: SearchableEntity[], query: SearchQuery) {
    const categories = new Map<string, number>()
    const tags = new Map<string, number>()
    const entityTypes = new Map<string, number>()

    for (const entity of entities) {
      // Count categories
      if (entity.category) {
        categories.set(entity.category, (categories.get(entity.category) || 0) + 1)
      }

      // Count tags
      if (entity.tags) {
        for (const tag of entity.tags) {
          tags.set(tag, (tags.get(tag) || 0) + 1)
        }
      }

      // Count entity types
      entityTypes.set(entity.type, (entityTypes.get(entity.type) || 0) + 1)
    }

    return {
      categories: Array.from(categories.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count),
      tags: Array.from(tags.entries())
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20), // Limit to top 20 tags
      entityTypes: Array.from(entityTypes.entries())
        .map(([type, count]) => ({ type, count }))
        .sort((a, b) => b.count - a.count)
    }
  }

  /**
   * Generate search suggestions
   */
  private static async generateSuggestions(query: SearchQuery): Promise<string[]> {
    // This would typically use a suggestion service or pre-computed suggestions
    // For now, return some basic suggestions based on the query
    const suggestions: string[] = []
    
    if (query.query.length > 2) {
      // Add some common craft-related suggestions
      const commonTerms = [
        '手工藝', '傳統工藝', '木工', '陶藝', '編織', '書法', '繪畫', '雕塑',
        'handicraft', 'traditional craft', 'woodworking', 'pottery', 'weaving', 'calligraphy'
      ]
      
      for (const term of commonTerms) {
        if (term.toLowerCase().includes(query.query.toLowerCase()) && term !== query.query) {
          suggestions.push(term)
        }
      }
    }

    return suggestions.slice(0, 5)
  }

  /**
   * Get searchable entities (mock implementation)
   */
  private static async getSearchableEntities(
    entityTypes?: Array<'course' | 'product' | 'craftsman' | 'event'>
  ): Promise<SearchableEntity[]> {
    // This would typically fetch from database
    // For now, return mock data
    return [
      {
        id: '1',
        type: 'course',
        title: {
          'zh-HK': '傳統木工課程',
          'zh-CN': '传统木工课程',
          'en': 'Traditional Woodworking Course'
        },
        description: {
          'zh-HK': '學習傳統木工技藝，製作精美木製品',
          'zh-CN': '学习传统木工技艺，制作精美木制品',
          'en': 'Learn traditional woodworking skills and create beautiful wooden crafts'
        },
        category: 'woodworking',
        tags: ['木工', 'woodworking', '傳統', 'traditional'],
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-15')
      },
      {
        id: '2',
        type: 'product',
        title: {
          'zh-HK': '手工陶瓷茶具',
          'zh-CN': '手工陶瓷茶具',
          'en': 'Handmade Ceramic Tea Set'
        },
        description: {
          'zh-HK': '純手工製作的精美陶瓷茶具套裝',
          'zh-CN': '纯手工制作的精美陶瓷茶具套装',
          'en': 'Exquisite handmade ceramic tea set'
        },
        category: 'pottery',
        tags: ['陶瓷', 'ceramic', '茶具', 'tea set', '手工', 'handmade'],
        createdAt: new Date('2024-01-10'),
        updatedAt: new Date('2024-01-20')
      }
    ]
  }

  /**
   * Index entity for search
   */
  static async indexEntity(entity: SearchableEntity): Promise<void> {
    // This would typically index the entity in Elasticsearch or similar
    console.log('Indexing entity for search:', entity.id)
    
    // Create searchable text for all languages
    const searchableTexts: Record<SupportedLanguage, string> = {
      'zh-HK': '',
      'zh-CN': '',
      'en': ''
    }

    // Build searchable text for each language
    for (const lang of Object.keys(searchableTexts) as SupportedLanguage[]) {
      const textParts: string[] = []
      
      // Add title
      const title = MultilingualContentService.getContent(entity.title, lang)
      if (title) textParts.push(title)
      
      // Add description
      if (entity.description) {
        const description = MultilingualContentService.getContent(entity.description, lang)
        if (description) textParts.push(description)
      }
      
      // Add content
      if (entity.content) {
        const content = MultilingualContentService.getContent(entity.content, lang)
        if (content) textParts.push(content)
      }
      
      // Add tags and category
      if (entity.tags) textParts.push(...entity.tags)
      if (entity.category) textParts.push(entity.category)
      
      searchableTexts[lang] = textParts.join(' ')
    }

    // In a real implementation, this would send to search index
    console.log('Searchable texts:', searchableTexts)
  }

  /**
   * Remove entity from search index
   */
  static async removeFromIndex(entityId: string): Promise<void> {
    // This would typically remove the entity from Elasticsearch or similar
    console.log('Removing entity from search index:', entityId)
  }

  /**
   * Update entity in search index
   */
  static async updateIndex(entity: SearchableEntity): Promise<void> {
    // This would typically update the entity in Elasticsearch or similar
    await this.removeFromIndex(entity.id)
    await this.indexEntity(entity)
  }
}

export default MultilingualSearchService