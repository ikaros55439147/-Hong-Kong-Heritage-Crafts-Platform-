# Enhanced Search and Recommendation System

## Overview

This document describes the implementation of the enhanced search and recommendation system for the Hong Kong Heritage Crafts Platform. The system provides intelligent search capabilities, personalized recommendations, and user behavior tracking to improve content discovery and user engagement.

## Features Implemented

### 1. User Behavior Tracking (`user-behavior.service.ts`)

**Purpose**: Track user interactions to build personalized preferences and recommendations.

**Key Features**:
- Event tracking for views, searches, clicks, purchases, bookmarks, and shares
- User preference analysis based on behavior history
- Craft type preference extraction
- Price range analysis
- View history management

**API Endpoints**:
- `POST /api/behavior/track` - Track user behavior events

### 2. Enhanced Search Service (`enhanced-search.service.ts`)

**Purpose**: Provide intelligent search with personalization and advanced ranking.

**Key Features**:
- Personalized search results based on user preferences
- Intelligent ranking algorithm combining relevance, popularity, quality, and recency
- Smart autocomplete with query suggestions, categories, craft types, and locations
- Search analytics and performance tracking
- Click-through rate monitoring

**API Endpoints**:
- `POST /api/search/enhanced` - Enhanced search with personalization
- `GET /api/search/autocomplete` - Intelligent autocomplete suggestions
- `GET /api/search/analytics` - Search performance analytics

### 3. Recommendation Service (`recommendation.service.ts`)

**Purpose**: Generate personalized content recommendations across different contexts.

**Key Features**:
- Personal recommendations based on user behavior
- Similar content recommendations (content-based filtering)
- Trending content identification
- Category-based recommendations
- Location-based recommendations
- Diversity control to avoid recommendation bubbles

**API Endpoints**:
- `GET /api/recommendations` - Get personalized recommendations

### 4. Enhanced UI Components

#### EnhancedSearchBox (`EnhancedSearchBox.tsx`)
- Real-time autocomplete with multiple suggestion types
- Keyboard navigation support
- Recent searches and popular queries
- Visual highlighting of matching text

#### RecommendationSection (`RecommendationSection.tsx`)
- Displays recommendation items with metadata
- Shows recommendation reasons and scores
- Supports different recommendation types

#### PersonalizedRecommendations (`PersonalizedRecommendations.tsx`)
- Loads and displays multiple recommendation sections
- Handles loading states and errors
- Tracks recommendation clicks for feedback

### 5. Custom Hooks

#### useEnhancedSearch (`useEnhancedSearch.ts`)
- Manages search state and operations
- Debounced search queries
- Result click tracking
- Load more functionality

#### useDebounce (`useDebounce.ts`)
- Utility hook for debouncing user input
- Prevents excessive API calls during typing

## Database Schema

### User Behavior Events Table
```sql
CREATE TABLE "user_behavior_events" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "event_type" VARCHAR(50) NOT NULL,
    "entity_type" VARCHAR(50) NOT NULL,
    "entity_id" UUID NOT NULL,
    "metadata" JSONB,
    "session_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### Search Queries Table
```sql
CREATE TABLE "search_queries" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "query" TEXT NOT NULL,
    "results_count" INTEGER DEFAULT 0,
    "clicked_result_id" UUID,
    "clicked_result_type" VARCHAR(50),
    "session_id" VARCHAR(255),
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

### Recommendation Feedback Table
```sql
CREATE TABLE "recommendation_feedback" (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "recommendation_id" UUID NOT NULL,
    "recommendation_type" VARCHAR(50) NOT NULL,
    "feedback_type" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP
);
```

## Algorithms

### 1. Intelligent Ranking Algorithm

The search results are ranked using a weighted combination of factors:

```typescript
const combinedScore = 
  relevance * 0.4 +      // Text relevance (TF-IDF based)
  popularity * 0.3 +     // User interaction count
  quality * 0.2 +        // Content completeness and verification
  recency * 0.1          // How recent the content is
```

### 2. Personalization Algorithm

User preferences are calculated based on:
- **Craft Type Preferences**: Weighted by interaction frequency and type
- **Price Range Analysis**: Based on viewed/purchased items (Q1-Q3 range)
- **Language Preference**: User's selected language
- **Recency Bias**: More recent interactions have higher weight

### 3. Recommendation Algorithm

Multiple recommendation strategies are combined:

1. **Collaborative Filtering**: Users with similar behavior patterns
2. **Content-Based Filtering**: Items similar to user's interests
3. **Popularity-Based**: Trending items in the platform
4. **Location-Based**: Nearby craftsmen and workshops
5. **Category-Based**: Items in user's preferred craft categories

### 4. Diversity Control

To prevent recommendation bubbles:
- Limit items of the same type/category
- Apply diversity penalty to similar items
- Ensure variety in recommendation sections

## Performance Optimizations

### 1. Caching Strategy
- User preferences cached for 1 hour
- Popular queries cached for 30 minutes
- Search results cached for 15 minutes

### 2. Database Indexing
- Composite indexes on user behavior events
- Full-text search indexes on content
- Optimized queries for recommendation generation

### 3. Pagination and Lazy Loading
- Search results paginated (20 items per page)
- Recommendations loaded on-demand
- Infinite scroll support

## Analytics and Monitoring

### Search Analytics
- Total search count
- Popular search queries
- Search trends over time
- Click-through rates
- Average results per search

### Recommendation Analytics
- Recommendation click rates
- User engagement with different recommendation types
- A/B testing support for recommendation algorithms

## Usage Examples

### Basic Enhanced Search
```typescript
import { useEnhancedSearch } from '@/lib/hooks/useEnhancedSearch'

const { search, results, isLoading } = useEnhancedSearch({
  autoSearch: true,
  trackBehavior: true
})

// Perform search
search({ 
  query: '手雕麻將', 
  userId: 'user123',
  personalizeResults: true 
})
```

### Loading Recommendations
```typescript
import { PersonalizedRecommendations } from '@/components/recommendations/PersonalizedRecommendations'

<PersonalizedRecommendations
  userId="user123"
  currentPage="home"
  onItemClick={(item) => {
    // Handle recommendation click
    router.push(item.url)
  }}
/>
```

### Tracking User Behavior
```typescript
import { userBehaviorService } from '@/lib/services/user-behavior.service'

// Track a view event
await userBehaviorService.trackEvent({
  userId: 'user123',
  eventType: 'view',
  entityType: 'craftsman',
  entityId: 'craftsman456',
  metadata: { duration: 30 }
})
```

## Future Enhancements

### 1. Machine Learning Integration
- Neural collaborative filtering
- Deep learning for content embeddings
- Real-time model updates

### 2. Advanced Analytics
- User journey analysis
- Conversion funnel tracking
- Cohort analysis

### 3. A/B Testing Framework
- Algorithm comparison
- UI/UX testing
- Performance optimization

### 4. Real-time Features
- Live search suggestions
- Real-time trending updates
- Push notifications for recommendations

## Requirements Fulfilled

This implementation addresses the following requirements from the specification:

- **需求 3.1**: Smart search functionality with multi-language support
- **需求 3.3**: Intelligent search with personalized results
- **Individual behavior-based recommendations**: Personalized content discovery
- **Smart search suggestions and autocomplete**: Enhanced user experience
- **Optimized search result ranking**: Improved content relevance
- **Related content recommendations**: Content discovery enhancement

## Testing

Comprehensive test suites have been implemented for:
- User behavior tracking
- Enhanced search functionality
- Recommendation algorithms
- API endpoints
- React components

Tests cover both unit testing and integration scenarios to ensure system reliability and performance.