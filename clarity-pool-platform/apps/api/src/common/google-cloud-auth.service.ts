import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleAuth } from 'google-auth-library';
import { readFileSync } from 'fs';
import { join } from 'path';

export enum GoogleAuthMethod {
  SERVICE_ACCOUNT = 'service_account',
  API_KEY = 'api_key',
  APPLICATION_DEFAULT = 'application_default'
}

@Injectable()
export class GoogleCloudAuthService implements OnModuleInit {
  private readonly logger = new Logger(GoogleCloudAuthService.name);
  private googleAuth: GoogleAuth;
  private authMethod: GoogleAuthMethod;
  private apiKey: string | null = null;
  private projectId: string;

  constructor(private configService: ConfigService) {
    this.projectId = this.configService.get<string>('GOOGLE_CLOUD_PROJECT_ID', 'clarity-pool-platform');
  }

  async onModuleInit() {
    await this.initializeAuthentication();
  }

  private async initializeAuthentication() {
    try {
      // Priority 1: Service Account (Best for production)
      const serviceAccountPath = this.configService.get<string>('GOOGLE_APPLICATION_CREDENTIALS');
      if (serviceAccountPath) {
        this.logger.log('Initializing Google Cloud authentication with service account');
        const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf8'));
        
        this.googleAuth = new GoogleAuth({
          credentials: serviceAccount,
          scopes: [
            'https://www.googleapis.com/auth/generative-language',
            'https://www.googleapis.com/auth/cloud-platform'
          ],
          projectId: serviceAccount.project_id || this.projectId
        });
        
        this.authMethod = GoogleAuthMethod.SERVICE_ACCOUNT;
        this.logger.log(`✅ Google Cloud authentication initialized with service account: ${serviceAccount.client_email}`);
        return;
      }

      // Priority 2: Application Default Credentials (Good for cloud deployments)
      try {
        this.googleAuth = new GoogleAuth({
          scopes: [
            'https://www.googleapis.com/auth/generative-language',
            'https://www.googleapis.com/auth/cloud-platform'
          ],
          projectId: this.projectId
        });
        
        const client = await this.googleAuth.getClient();
        if (client) {
          this.authMethod = GoogleAuthMethod.APPLICATION_DEFAULT;
          this.logger.log('✅ Google Cloud authentication initialized with Application Default Credentials');
          return;
        }
      } catch (adcError) {
        this.logger.debug('Application Default Credentials not available', adcError.message);
      }

      // Priority 3: API Key (Fallback - must be configured correctly)
      const apiKey = this.configService.get<string>('GEMINI_API_KEY');
      this.logger.log(`Checking for GEMINI_API_KEY: ${!!apiKey}, length: ${apiKey?.length || 0}`);
      
      if (apiKey) {
        this.logger.warn('⚠️  Using API key authentication - ensure it has NO referrer restrictions for server use');
        this.apiKey = apiKey;  // THIS LINE IS IMPORTANT - Store the API key!
        this.authMethod = GoogleAuthMethod.API_KEY;
        
        await this.validateApiKeyConfiguration();
        return;
      }

      throw new Error('No valid Google Cloud authentication method available');
    } catch (error) {
      this.logger.error('Failed to initialize Google Cloud authentication', error);
      throw new Error(`Google Cloud authentication initialization failed: ${error.message}`);
    }
  }

  private async validateApiKeyConfiguration() {
    // This method would ideally check the API key restrictions via Google Cloud API
    // For now, we'll log a warning about proper configuration
    this.logger.warn('🔐 API Key Configuration Requirements:');
    this.logger.warn('   1. Go to Google Cloud Console → APIs & Services → Credentials');
    this.logger.warn('   2. Find your Gemini API key');
    this.logger.warn('   3. Edit the key and set Application Restrictions to "None"');
    this.logger.warn('   4. Or better: Set to "IP addresses" and add your server IPs');
    this.logger.warn('   5. Best practice: Use a service account instead of API keys');
  }

  async getAuthHeaders(): Promise<Record<string, string>> {
    if (this.authMethod === GoogleAuthMethod.API_KEY) {
      return {
        'x-goog-api-key': this.apiKey!,
        'x-goog-api-client': 'clarity-pool-platform'
      };
    }

    // For service account or ADC, get access token
    const client = await this.googleAuth.getClient();
    const accessToken = await client.getAccessToken();
    
    return {
      'Authorization': `Bearer ${accessToken.token}`,
      'x-goog-api-client': 'clarity-pool-platform'
    };
  }

  getApiKey(): string | null {
    // Make sure we're returning the stored API key
    this.logger.log(`getApiKey() called, returning: ${!!this.apiKey}`);
    return this.apiKey;
  }

  getAuthMethod(): GoogleAuthMethod {
    return this.authMethod;
  }

  getProjectId(): string {
    return this.projectId;
  }

  isUsingSecureAuth(): boolean {
    return this.authMethod !== GoogleAuthMethod.API_KEY;
  }
}