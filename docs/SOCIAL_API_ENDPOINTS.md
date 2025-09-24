# Social Community API Endpoints

This document outlines all the implemented API endpoints for the social community features of the Hong Kong Heritage Crafts Platform.

## User Following and Activity Feed

### Follow/Unfollow Users
- **POST** `/api/users/[id]/follow` - Follow a user
- **DELETE** `/api/users/[id]/follow` - Unfollow a user
- **GET** `/api/users/[id]/follow` - Check if following a user

### User Relationships
- **GET** `/api/users/[id]/followers` - Get user's followers list
- **GET** `/api/users/[id]/following` - Get users that a user is following
- **GET** `/api/users/[id]/stats` - Get follow counts (followers/following)
- **GET** `/api/users/suggestions` - Get suggested users to follow

### Activity Feed
- **GET** `/api/feed` - Get personalized activity feed based on followed users
- **GET** `/api/activity` - Get general activity feed

## Notification System

### Basic Notifications
- **GET** `/api/notifications` - Get user notifications with pagination
- **PATCH** `/api/notifications` - Mark all notifications as read

### Real-time Notifications
- **GET** `/api/notifications/realtime` - Server-Sent Events for real-time notifications
- **POST** `/api/notifications/realtime` - Subscribe/unsubscribe to real-time notifications

### Push and Email Notifications
- **POST** `/api/notifications/push` - Send push notification
- **PUT** `/api/notifications/push` - Register push subscription
- **POST** `/api/notifications/email` - Send email notification
- **GET** `/api/notifications/email` - Get email template preview

### Notification Management
- **GET** `/api/notifications/[id]` - Get specific notification
- **PATCH** `/api/notifications/[id]` - Mark notification as read
- **GET** `/api/notifications/preferences` - Get notification preferences
- **PUT** `/api/notifications/preferences` - Update notification preferences

## Event Management

### Event CRUD Operations
- **GET** `/api/events` - Get events with filtering and pagination
- **POST** `/api/events` - Create new event
- **GET** `/api/events/[id]` - Get specific event details
- **PUT** `/api/events/[id]` - Update event
- **DELETE** `/api/events/[id]` - Delete event

### Event Registration
- **POST** `/api/events/[id]/register` - Register for an event
- **DELETE** `/api/events/[id]/register` - Cancel event registration
- **GET** `/api/events/[id]/registrations` - Get event registrations (organizer only)

### Event Management
- **POST** `/api/events/[id]/publish` - Publish event (make available for registration)
- **GET** `/api/events/[id]/stats` - Get event statistics
- **POST** `/api/events/[id]/attendance` - Mark attendance (organizer only)
- **POST** `/api/events/[id]/feedback` - Submit event feedback

### User Events
- **GET** `/api/users/[id]/events` - Get user's events (registered or organized)

## Social Interactions

### Comments System
- **GET** `/api/comments` - Get comments for an entity
- **POST** `/api/comments` - Create new comment
- **GET** `/api/comments/[id]` - Get specific comment
- **PUT** `/api/comments/[id]` - Update comment
- **DELETE** `/api/comments/[id]` - Delete comment
- **GET** `/api/comments/[id]/replies` - Get comment replies

### Likes and Reactions
- **POST** `/api/likes` - Toggle like on any entity
- **POST** `/api/comments/[id]/like` - Toggle like on specific comment

### Content Sharing
- **POST** `/api/share` - Generate share data for social platforms
  - Supports: Facebook, Twitter, WhatsApp, Email, Copy link
  - Works with: Courses, Products, Craftsman Profiles, Events

### Interaction Tracking
- **POST** `/api/interactions` - Track user interactions for analytics
- **GET** `/api/interactions` - Get user interaction history

## Content Moderation

### Reporting System
- **POST** `/api/comments/[id]/report` - Report inappropriate comment
- **GET** `/api/reports/comments` - Get reported comments (admin only)
- **POST** `/api/reports/[id]/review` - Review and action reports (admin only)

## API Response Format

All endpoints follow a consistent response format:

### Success Response
```json
{
  "success": true,
  "data": { ... },
  "message": "Optional success message"
}
```

### Error Response
```json
{
  "success": false,
  "error": "Error message"
}
```

### Paginated Response
```json
{
  "success": true,
  "data": {
    "data": [...],
    "total": 100,
    "page": 1,
    "limit": 20,
    "totalPages": 5
  }
}
```

## Authentication Requirements

### Public Endpoints
- `GET /api/events` (with filters)
- `GET /api/events/[id]`
- `GET /api/comments` (for public entities)

### User Authentication Required
- All `/api/users/[id]/follow` endpoints
- All `/api/notifications` endpoints
- All `/api/feed` and `/api/activity` endpoints
- Event registration endpoints
- Comment creation and interaction endpoints
- Sharing and interaction tracking endpoints

### Admin Authentication Required
- All `/api/reports` endpoints for moderation
- Content moderation actions

## Rate Limiting

Consider implementing rate limiting for:
- Follow/unfollow actions (prevent spam)
- Comment creation (prevent spam)
- Report submissions (prevent abuse)
- Real-time notification connections

## Security Considerations

1. **Input Validation**: All endpoints validate input data
2. **Authorization**: Users can only access their own data unless admin
3. **Content Filtering**: Comments and reports are filtered for inappropriate content
4. **Privacy Protection**: User data is protected according to privacy settings
5. **CORS Configuration**: Proper CORS headers for cross-origin requests

## Integration with Requirements

This implementation covers all requirements from task 23:

### ✅ User Following and Activity System (需求 4.2)
- Complete follow/unfollow functionality
- Activity feed based on followed users
- Follow suggestions and statistics

### ✅ Complete Notification System (需求 4.2, 1.3)
- Real-time notifications via Server-Sent Events
- Push notification support
- Email notification system
- Notification preferences management

### ✅ Event Management APIs (需求 4.3)
- Full event lifecycle management
- Registration and attendance tracking
- Event feedback and statistics
- User event history

### ✅ Social Interaction APIs (需求 4.1, 4.4)
- Comments and replies system
- Like/unlike functionality
- Content sharing across platforms
- Interaction tracking for analytics
- Content moderation and reporting

All endpoints are implemented with proper error handling, authentication, and follow RESTful conventions.