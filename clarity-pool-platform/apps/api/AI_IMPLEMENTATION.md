# AI & File Storage Implementation Guide

## Overview

This implementation provides a complete AI-powered pool analysis system with S3 file storage for the Clarity Pool Platform.

## Features

### 1. **Water Chemistry Analysis**
- Test strip image analysis using Google Gemini Vision
- Automatic reading extraction for 11+ chemical parameters
- AI-generated insights and recommendations using Claude 3
- Chemical adjustment calculations

### 2. **Pool Equipment Analysis**
- Equipment identification and condition assessment
- Brand/model detection
- Maintenance recommendations
- Cost estimates for replacements

### 3. **Pool Environment Analysis**
- Satellite view analysis for pool location
- Pool surface condition assessment
- Surrounding environment impact analysis
- Deck material and condition evaluation
- Skimmer count and condition tracking

### 4. **File Storage System**
- S3-based image storage with automatic resizing
- Thumbnail generation for all images
- Organized file structure by category
- Secure file deletion support

## API Endpoints

### AI Analysis Endpoints (`/ai/*`)

1. **Analyze Test Strip**
   ```
   POST /ai/analyze-test-strip
   Body: { image: string (base64), sessionId: string }
   ```

2. **Analyze Pool Satellite**
   ```
   POST /ai/analyze-pool-satellite
   Body: { address: string, sessionId: string }
   ```

3. **Analyze Equipment**
   ```
   POST /ai/analyze-equipment
   Body: { image: string, sessionId: string, equipmentType?: string }
   ```

4. **Generate Chemistry Insights**
   ```
   POST /ai/generate-chemistry-insights
   Body: { readings: object, sessionId: string }
   ```

5. **Analyze Pool Surface**
   ```
   POST /ai/analyze-pool-surface
   Body: { image: string, sessionId: string }
   ```

6. **Analyze Environment**
   ```
   POST /ai/analyze-environment
   Body: { images: string[], sessionId: string }
   ```

7. **Analyze Skimmers**
   ```
   POST /ai/analyze-skimmers
   Body: { images: string[], sessionId: string }
   ```

8. **Analyze Deck**
   ```
   POST /ai/analyze-deck
   Body: { images: string[], sessionId: string }
   ```

### Onboarding Integration (`/api/onboarding/sessions/*`)

1. **Water Chemistry with AI**
   ```
   PUT /api/onboarding/sessions/:sessionId/water-chemistry
   Body: { readings?: object, testStripImage?: string, notes?: string }
   ```

2. **Pool Location Analysis**
   ```
   POST /api/onboarding/sessions/:sessionId/analyze-pool-location
   Body: { address: string }
   ```

### Upload Endpoints (`/uploads/*`)

1. **Upload Image**
   ```
   POST /uploads/image
   Form Data: file (multipart), category: string
   ```

2. **Delete Image**
   ```
   DELETE /uploads/image/:key
   ```

## Environment Variables

Add these to your Render environment:

```bash
# AI Services (Required)
GEMINI_API_KEY=your-gemini-api-key
ANTHROPIC_API_KEY=your-anthropic-api-key
GOOGLE_MAPS_API_KEY=your-google-maps-api-key

# AWS S3 (Required)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-aws-access-key
AWS_SECRET_ACCESS_KEY=your-aws-secret
S3_BUCKET_NAME=clarity-pool-uploads

# Optional
MAX_FILE_SIZE=10485760
ALLOWED_IMAGE_TYPES=jpg,jpeg,png,gif,webp
```

## S3 Bucket Setup

1. Create an S3 bucket named `clarity-pool-uploads`
2. Enable public read access for images
3. Configure CORS:
   ```json
   [
     {
       "AllowedHeaders": ["*"],
       "AllowedMethods": ["GET", "PUT", "POST", "DELETE"],
       "AllowedOrigins": ["*"],
       "ExposeHeaders": []
     }
   ]
   ```

## Usage Examples

### 1. Analyzing a Test Strip
```javascript
const response = await fetch('/ai/analyze-test-strip', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    image: base64ImageData,
    sessionId: 'session-123'
  })
});

const result = await response.json();
// Result includes:
// - readings: { ph: 7.2, chlorine: 2.0, ... }
// - imageUrl: "https://s3.amazonaws.com/..."
// - confidence: 95
```

### 2. Getting Pool Insights
```javascript
const insights = await fetch('/ai/generate-chemistry-insights', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    readings: {
      ph: 7.8,
      freeChlorine: 0.5,
      alkalinity: 60
    },
    sessionId: 'session-123'
  })
});

// Returns detailed recommendations and safety warnings
```

## Image Processing

All uploaded images are:
1. Validated for type and size
2. Resized to max 2048x2048 for storage efficiency
3. Converted to progressive JPEG for web optimization
4. Thumbnail generated at 400x400
5. Stored with metadata including dimensions and upload time

## Security

- All endpoints require JWT authentication
- File uploads limited to 10MB
- Only image files allowed (jpg, jpeg, png, gif, webp)
- S3 credentials stored securely in environment variables
- Images served directly from S3 (not through API)

## Error Handling

The system includes comprehensive error handling:
- Invalid image format detection
- API key validation
- Network failure recovery
- Graceful degradation when AI services unavailable

## Performance Optimization

- Images processed in memory (no disk I/O)
- Parallel processing for multiple images
- Efficient S3 uploads with streaming
- Thumbnail generation for faster loading
- CDN-ready S3 URLs

## Future Enhancements

1. **Voice Transcription**
   - Integration with Google Speech-to-Text
   - Audio file storage in S3

2. **Video Analysis**
   - Pool equipment operation videos
   - Water flow analysis

3. **Historical Tracking**
   - Trend analysis over time
   - Predictive maintenance alerts

4. **Advanced AI Features**
   - Custom model training on pool data
   - Real-time anomaly detection