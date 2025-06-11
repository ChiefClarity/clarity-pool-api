import { API_BASE_URL } from '@/constants/config';

export class OnboardingApiService {
  private baseUrl = `${API_BASE_URL}/api/onboarding`;

  async getTechnicianSessions(technicianId: number) {
    const response = await fetch(
      `${this.baseUrl}/sessions/technician/${technicianId}`,
    );
    return response.json();
  }

  async startSession(sessionId: string) {
    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/start`,
      { method: 'POST' },
    );
    return response.json();
  }

  async saveWaterChemistry(sessionId: string, data: any) {
    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/water-chemistry`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    return response.json();
  }

  async saveEquipment(sessionId: string, data: any) {
    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/equipment`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    return response.json();
  }

  async savePoolDetails(sessionId: string, data: any) {
    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/pool-details`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      },
    );
    return response.json();
  }

  async completeSession(sessionId: string) {
    const response = await fetch(
      `${this.baseUrl}/sessions/${sessionId}/complete`,
      { method: 'POST' },
    );
    return response.json();
  }
}

export const onboardingApi = new OnboardingApiService();