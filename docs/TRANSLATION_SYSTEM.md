# Translation System Documentation

## Overview

The Hong Kong Heritage Crafts Platform includes a comprehensive automatic translation system that supports multiple translation providers, quality assessment, caching, and batch processing. This system enables the platform to serve content in Traditional Chinese (zh-HK), Simplified Chinese (zh-CN), and English (en).

## Features

### 1. Multiple Translation Providers
- **Google Translate API**: High availability, supports all language pairs
- **DeepL API**: Higher quality translations, preferred when available
- **Automatic Provider Selection**: DeepL is preferred over Google Translate when both are configured

### 2. Translation Quality Assessment
- **Automatic Quality Scoring**: Each translation receives a quality score (0-1)
- **Issue Detection**: Identifies common translation problems
- **Human Review Recommendations**: Flags translations that need manual review
- **Quality Metrics**:
  - Length ratio validation
  - Untranslated text detection
  - HTML markup preservation
  - Language-specific character validation

### 3. Intelligent Caching
- **Performance Optimization**: Caches translations to reduce API calls
- **Usage Statistics**: Tracks cache hit rates and provider usage
- **Automatic Cleanup**: Removes expired cache entries
- **Configurable Expiry**: 30-day default cache lifetime

### 4. Batch Translation
- **Bulk Processing**: Translate multiple texts simultaneously
- **Concurrency Control**: Configurable concurrent translation limits
- **Progress Tracking**: Monitor batch translation job status
- **Error Handling**: Graceful handling of partial failures

## Configuration

### Environment Variables

Add the following to your `.env.local` file:

```bash
# Google Translate API
GOOGLE_TRANSLATE_API_KEY="your-google-translate-api-key"

# DeepL API
DEEPL_API_KEY="your-deepl-api-key"
DEEPL_IS_PRO="false"  # Set to "true" if using DeepL Pro
```

### API Key Setup

#### Google Translate API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Enable the Cloud Translation API
3. Create credentials (API Key)
4. Restrict the API key to Translation API only

#### DeepL API
1. Sign up at [DeepL API](https://www.deepl.com/pro-api)
2. Choose between Free or Pro plan
3. Get your authentication key from the account settings

## Usage

### Basic Translation

```typescript
import { useTranslation } from '@/lib/hooks/useTranslation'

function MyComponent() {
  const { translate, isTranslating, error } = useTranslation()

  const handleTranslate = async () => {
    const result = await translate(
      'Hello world',
      'en',
      'zh-HK',
      {
        provider: 'deepl', // optional
        useCache: true,    // optional, default: true
        forceRefresh: false // optional, default: false
      }
    )

    if (result) {
      console.log('Translation:', result.translatedText)
      console.log('Quality Score:', result.quality.score)
      console.log('From Cache:', result.fromCache)
    }
  }

  return (
    <div>
      <button onClick={handleTranslate} disabled={isTranslating}>
        {isTranslating ? 'Translating...' : 'Translate'}
      </button>
      {error && <p>Error: {error}</p>}
    </div>
  )
}
```

### Batch Translation

```typescript
const { batchTranslate } = useTranslation()

const handleBatchTranslate = async () => {
  const job = await batchTranslate(
    ['Hello', 'World', 'How are you?'],
    'en',
    ['zh-HK', 'zh-CN'],
    {
      maxConcurrency: 3
    }
  )

  if (job && job.status === 'completed') {
    console.log('Results:', job.results)
    // job.results['Hello']['zh-HK'] = '你好'
    // job.results['Hello']['zh-CN'] = '你好'
  }
}
```

### Multilingual Content Translation

```typescript
const { translateMultilingual } = useTranslation()

const handleMultilingualTranslate = async () => {
  const content = { 'zh-HK': '你好世界' }
  
  const result = await translateMultilingual(
    content,
    ['en', 'zh-CN']
  )

  if (result) {
    console.log('Multilingual content:', result)
    // result = {
    //   'zh-HK': '你好世界',
    //   'en': 'Hello World',
    //   'zh-CN': '你好世界'
    // }
  }
}
```

### Translation Manager Component

```typescript
import { TranslationManager } from '@/components/translation/TranslationManager'

function ContentEditor() {
  const [content, setContent] = useState({
    'zh-HK': '香港傳統工藝'
  })

  return (
    <TranslationManager
      content={content}
      onContentUpdate={setContent}
      sourceLanguage="zh-HK"
    />
  )
}
```

## API Endpoints

### POST /api/translations/translate
Translate a single text string.

**Request:**
```json
{
  "text": "Hello world",
  "sourceLanguage": "en",
  "targetLanguage": "zh-HK",
  "provider": "deepl",
  "useCache": true,
  "forceRefresh": false
}
```

**Response:**
```json
{
  "translatedText": "你好世界",
  "provider": "deepl",
  "quality": {
    "score": 0.95,
    "confidence": 0.9,
    "needsReview": false,
    "issues": []
  },
  "fromCache": false
}
```

### POST /api/translations/batch
Translate multiple texts to multiple languages.

**Request:**
```json
{
  "texts": ["Hello", "World"],
  "sourceLanguage": "en",
  "targetLanguages": ["zh-HK", "zh-CN"],
  "maxConcurrency": 5
}
```

**Response:**
```json
{
  "id": "job_123456789",
  "status": "completed",
  "results": {
    "Hello": {
      "zh-HK": "你好",
      "zh-CN": "你好"
    },
    "World": {
      "zh-HK": "世界",
      "zh-CN": "世界"
    }
  }
}
```

### POST /api/translations/multilingual
Translate multilingual content object.

**Request:**
```json
{
  "content": {
    "zh-HK": "你好世界"
  },
  "targetLanguages": ["en", "zh-CN"],
  "sourceLanguage": "zh-HK"
}
```

**Response:**
```json
{
  "content": {
    "zh-HK": "你好世界",
    "en": "Hello World",
    "zh-CN": "你好世界"
  }
}
```

### GET /api/translations/providers
Get available translation providers and usage statistics.

**Response:**
```json
{
  "providers": ["google-translate", "deepl"],
  "usage": {
    "google-translate": 150,
    "deepl": 200
  },
  "defaultProvider": "deepl"
}
```

### POST /api/translations/cache/cleanup
Clean up expired translation cache entries.

**Response:**
```json
{
  "message": "Cache cleanup completed",
  "deletedEntries": 25
}
```

## Database Schema

The translation system uses a cache table to store translations:

```sql
CREATE TABLE "translation_cache" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_text" TEXT NOT NULL,
    "source_language" TEXT NOT NULL,
    "target_language" TEXT NOT NULL,
    "translated_text" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "quality" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_used" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "use_count" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "translation_cache_pkey" PRIMARY KEY ("id")
);
```

## Management Scripts

### Translation Utilities Script

Use the translation utilities script for batch operations:

```bash
# Translate all missing content
node scripts/translation-utils.js batch-translate

# Clean up expired cache
node scripts/translation-utils.js cleanup-cache

# Export translations for review
node scripts/translation-utils.js export-translations

# Import reviewed translations
node scripts/translation-utils.js import-translations

# Generate quality report
node scripts/translation-utils.js quality-report
```

## Quality Assessment

The system automatically assesses translation quality based on:

1. **Length Ratio**: Translations shouldn't be too different in length
2. **Content Preservation**: HTML markup and formatting should be preserved
3. **Language Detection**: Target language should contain appropriate characters
4. **Translation Artifacts**: Detection of untranslated or placeholder text

### Quality Scores
- **0.8-1.0**: High quality, ready for publication
- **0.6-0.8**: Medium quality, may need minor review
- **0.0-0.6**: Low quality, requires human review

## Performance Optimization

### Caching Strategy
- Translations are cached for 30 days
- Cache size is limited to 10,000 entries
- Least recently used entries are removed when limit is reached
- Cache hit rate is tracked for performance monitoring

### Concurrency Control
- Batch translations use configurable concurrency limits
- Default maximum of 5 concurrent API calls
- Prevents API rate limiting and reduces costs

## Error Handling

The system includes comprehensive error handling:

1. **API Errors**: Graceful handling of provider API failures
2. **Network Issues**: Retry logic for temporary network problems
3. **Rate Limiting**: Automatic backoff when rate limits are hit
4. **Validation Errors**: Clear error messages for invalid input

## Monitoring and Analytics

### Usage Statistics
- Track translation volume by provider
- Monitor cache hit rates
- Quality score distributions
- Error rates and types

### Quality Reports
Generate detailed reports including:
- Translation quality trends
- Provider performance comparison
- Language pair statistics
- Review recommendations

## Best Practices

### Content Preparation
1. **Clean Source Text**: Remove unnecessary formatting before translation
2. **Consistent Terminology**: Use standardized terms for better consistency
3. **Context Preservation**: Include sufficient context for accurate translation

### Quality Management
1. **Review High-Volume Content**: Manually review frequently accessed translations
2. **Monitor Quality Scores**: Set up alerts for low-quality translations
3. **Regular Cache Cleanup**: Schedule periodic cache maintenance

### Performance
1. **Batch Operations**: Use batch translation for multiple texts
2. **Cache Utilization**: Enable caching for repeated content
3. **Provider Selection**: Choose appropriate provider based on quality needs

## Troubleshooting

### Common Issues

#### API Key Errors
- Verify API keys are correctly set in environment variables
- Check API key permissions and quotas
- Ensure API services are enabled in provider dashboards

#### Quality Issues
- Review source text for formatting problems
- Check language detection accuracy
- Consider manual review for critical content

#### Performance Issues
- Monitor API rate limits
- Optimize batch sizes
- Review cache hit rates

#### Cache Problems
- Check database connectivity
- Verify cache table schema
- Monitor cache size and cleanup frequency

## Future Enhancements

### Planned Features
1. **Custom Translation Models**: Support for domain-specific models
2. **Translation Memory**: Leverage previous translations for consistency
3. **Collaborative Review**: Multi-user translation review workflow
4. **A/B Testing**: Compare different translation providers
5. **Real-time Translation**: WebSocket-based live translation updates

### Integration Opportunities
1. **Content Management**: Automatic translation on content creation
2. **User Interface**: Dynamic UI translation based on user preferences
3. **Search Enhancement**: Multilingual search with translation support
4. **Analytics Integration**: Translation performance in business metrics