import { Controller, Get, Logger } from '@nestjs/common';
import { GoogleCloudAuthService } from '../common/google-cloud-auth.service';
import { ConfigService } from '@nestjs/config';
import { InitializationStateService, ServiceState } from '../common/initialization-state.service';

@Controller('ai/health')
export class AiHealthController {
  private readonly logger = new Logger(AiHealthController.name);

  constructor(
    private googleCloudAuth: GoogleCloudAuthService,
    private configService: ConfigService,
    private initState: InitializationStateService,
  ) {}

  @Get()
  async checkHealth() {
    const authMethod = this.googleCloudAuth.getAuthMethod();
    const isSecure = this.googleCloudAuth.isUsingSecureAuth();
    
    // Get initialization statuses
    const initStatuses = this.initState.getAllServiceStatuses();
    
    const geminiConfigured = !!this.googleCloudAuth.getApiKey() || isSecure;
    const claudeConfigured = !!this.configService.get('ANTHROPIC_API_KEY');
    
    const health = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      initialization: {
        services: initStatuses,
        allReady: initStatuses.every(s => s.state === ServiceState.READY)
      },
      authentication: {
        method: authMethod,
        secure: isSecure,
        recommendation: isSecure 
          ? 'Using secure authentication ✅' 
          : '⚠️  Consider using service account authentication for production'
      },
      providers: {
        gemini: {
          configured: geminiConfigured,
          authMethod: authMethod,
          recommendation: !geminiConfigured 
            ? 'Configure GEMINI_API_KEY or GOOGLE_APPLICATION_CREDENTIALS'
            : authMethod === 'api_key' 
              ? 'Ensure API key has NO HTTP referrer restrictions'
              : 'Properly configured ✅'
        },
        claude: {
          configured: claudeConfigured,
          recommendation: !claudeConfigured 
            ? 'Configure ANTHROPIC_API_KEY for fallback support'
            : 'Properly configured ✅'
        }
      },
      recommendations: this.getRecommendations(authMethod, geminiConfigured, claudeConfigured)
    };
    
    this.logger.log('AI Health Check:', health);
    return health;
  }

  private getRecommendations(authMethod: string, geminiConfigured: boolean, claudeConfigured: boolean): string[] {
    const recommendations: string[] = [];
    
    if (authMethod === 'api_key') {
      recommendations.push('🔐 For production, use service account authentication instead of API keys');
      recommendations.push('📋 If using API keys, ensure they have NO HTTP referrer restrictions');
    }
    
    if (!geminiConfigured && !claudeConfigured) {
      recommendations.push('⚠️  No AI providers configured - service will not function');
    } else if (!claudeConfigured) {
      recommendations.push('💡 Consider configuring Claude (ANTHROPIC_API_KEY) as a fallback provider');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✅ AI services are properly configured for production use');
    }
    
    return recommendations;
  }
}