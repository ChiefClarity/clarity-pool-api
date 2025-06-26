# AI Implementation Guide

## Overview

The Clarity Pool platform uses advanced AI to analyze pool conditions, equipment status, and provide intelligent pricing recommendations using three main AI services:

1. **Google Gemini Vision** - Equipment photo analysis and satellite imagery
2. **Claude (Anthropic)** - Water chemistry analysis, report generation, and pricing
3. **Google Maps** - Property analysis and route optimization

## Architecture

### AI Module Structure
```
src/ai/
├── ai.module.ts                    # Main module configuration
├── ai-analysis.service.ts          # Orchestration service
├── ai-analysis.controller.ts       # API endpoints
├── gemini-vision.service.ts        # Google Gemini Vision integration
├── claude-analysis.service.ts      # Claude AI integration
└── google-maps.service.ts          # Google Maps integration
```

## API Endpoints

### Analyze Onboarding Session
```
POST /api/ai/analysis/session/:id
Authorization: Bearer <token>
```
Triggers comprehensive AI analysis of an onboarding session.

### Get Analysis Results
```
GET /api/ai/analysis/session/:id
Authorization: Bearer <token>
```
Retrieves AI analysis results for a session.

### Analyze Equipment Photo
```
POST /api/ai/analyze-equipment-photo
Authorization: Bearer <token>
Content-Type: multipart/form-data

Body:
- sessionId: string
- photo: file
```
Analyzes a single equipment photo using Gemini Vision.

### Get Pricing Recommendation
```
GET /api/ai/pricing/session/:id
Authorization: Bearer <token>
```
Gets AI-generated pricing recommendations.

## AI Analysis Flow

### 1. Water Chemistry Analysis (Claude)
Analyzes water test results to determine:
- Overall water status (balanced/needs_attention/critical)
- Specific issues and their severity
- Chemical recommendations with amounts
- Safety warnings
- Total chemical cost estimate

### 2. Equipment Photo Analysis (Gemini Vision)
Identifies from photos:
- Equipment type and manufacturer
- Model and serial numbers (if visible)
- Condition assessment
- Estimated age
- Maintenance recommendations
- Confidence scores

### 3. Satellite Imagery Analysis (Google Maps + Gemini)
Analyzes property to determine:
- Pool dimensions and shape
- Tree coverage and debris potential
- Access routes for service
- Property features affecting service

### 4. Voice Note Analysis (Claude)
Extracts from technician voice notes:
- Key observations
- Equipment issues
- Safety concerns
- Special pricing factors
- Customer-specific notes

### 5. Comprehensive Report Generation (Claude)
Combines all data to generate:
- Executive summary for customers
- Prioritized action items with costs
- Safety issues requiring immediate attention
- Maintenance schedule recommendations
- Equipment upgrade opportunities
- Monthly membership pricing

## Database Schema

### AIAnalysis Table
```prisma
model AIAnalysis {
  id              Int
  sessionId       String
  
  // Claude Analysis
  overview        String
  waterStatus     String
  waterIssues     Json
  waterRecs       Json
  
  // Gemini Vision Results
  equipmentStatus String
  equipment       Json
  maintenanceNeeds Json
  
  // Google Maps Analysis
  poolDimensions  Json?
  propertyFeatures Json?
  satelliteImageUrl String?
  
  // Cost Estimates
  immediateWork   Json
  recommendedWork Json
  totalImmediate  Float
  totalRecommended Float
  
  // Voice Analysis
  voiceTranscription String?
  voiceSummary      String?
  voiceInsights     Json?
  
  // Metadata
  approvedByCsm   Boolean
  csmNotes        String?
}
```

## Configuration

### Required Environment Variables
```env
# AI Services
GEMINI_API_KEY=your_gemini_api_key
ANTHROPIC_API_KEY=your_claude_api_key
GOOGLE_MAPS_API_KEY=your_google_maps_api_key

# AWS S3 (for photo storage)
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
S3_BUCKET_NAME=clarity-pool-media
```

## Implementation Details

### Error Handling
- All AI services include fallback handling
- Failed analyses are logged to Sentry
- Partial results are saved even if one service fails

### Performance Optimization
- Analyses run in parallel where possible
- Results are cached in the database
- Satellite images are fetched once per property

### Security
- All endpoints require JWT authentication
- CSM approval required before customer delivery
- Sensitive data is sanitized in logs

## Testing

### Manual Testing
1. Create an onboarding session
2. Add water chemistry data
3. Upload equipment photos
4. Trigger analysis: `POST /api/ai/analysis/session/:id`
5. Check results: `GET /api/ai/analysis/session/:id`

### Mock Data
When API keys are not configured, services return mock data for development.

## Future Enhancements

1. **Whisper Integration** - Automatic voice transcription
2. **Historical Analysis** - Track changes over time
3. **Predictive Maintenance** - ML models for equipment failure prediction
4. **Dynamic Pricing** - Market-based pricing adjustments
5. **Customer Portal** - AI insights in customer app

## Troubleshooting

### Common Issues

1. **"API not configured" errors**
   - Ensure all API keys are set in environment variables
   - Check API key permissions and quotas

2. **Slow analysis**
   - Normal analysis takes 10-30 seconds
   - Check Sentry for timeout errors
   - Consider increasing Lambda timeout if deployed serverless

3. **Missing results**
   - Check if CSM approval is required
   - Verify all prerequisite data exists (water chemistry, etc.)

## Cost Optimization

### API Usage
- Gemini Vision: ~$0.002 per image
- Claude: ~$0.01 per analysis
- Google Maps: ~$0.005 per geocode

### Recommendations
- Cache satellite images (don't refetch)
- Batch equipment photos when possible
- Use Claude-3-haiku for simple analyses