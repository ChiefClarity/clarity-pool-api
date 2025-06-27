import { API_BASE_URL } from '@/constants/config';

export class AIApiService {
  private baseUrl = `${API_BASE_URL}/ai`; // Note: /ai not /api/ai
  
  async analyzeTestStrip(image: string, sessionId?: string) {
    const response = await fetch(`${this.baseUrl}/analyze-test-strip`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // Add auth header if you have a token
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ image, sessionId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze test strip');
    }
    
    return response.json();
  }
  
  async analyzePoolSatellite(address: string, sessionId: string) {
    const response = await fetch(`${this.baseUrl}/analyze-pool-satellite`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ address, sessionId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze pool satellite');
    }
    
    return response.json();
  }
  
  async analyzeEquipment(image: string, sessionId: string, equipmentType?: string) {
    const response = await fetch(`${this.baseUrl}/analyze-equipment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ image, sessionId, equipmentType }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze equipment');
    }
    
    return response.json();
  }
  
  async generateChemistryInsights(readings: any, sessionId: string) {
    const response = await fetch(`${this.baseUrl}/generate-chemistry-insights`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ readings, sessionId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate insights');
    }
    
    return response.json();
  }
  
  async analyzePoolSurface(image: string, sessionId: string) {
    const response = await fetch(`${this.baseUrl}/analyze-pool-surface`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ image, sessionId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze pool surface');
    }
    
    return response.json();
  }
  
  async analyzeEnvironment(images: string[], sessionId: string) {
    const response = await fetch(`${this.baseUrl}/analyze-environment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ images, sessionId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze environment');
    }
    
    return response.json();
  }
  
  async analyzeSkimmers(images: string[], sessionId: string) {
    const response = await fetch(`${this.baseUrl}/analyze-skimmers`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ images, sessionId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze skimmers');
    }
    
    return response.json();
  }
  
  async analyzeDeck(images: string[], sessionId: string) {
    const response = await fetch(`${this.baseUrl}/analyze-deck`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        // 'Authorization': `Bearer ${getAuthToken()}`
      },
      body: JSON.stringify({ images, sessionId }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to analyze deck');
    }
    
    return response.json();
  }
}

export const aiApi = new AIApiService();