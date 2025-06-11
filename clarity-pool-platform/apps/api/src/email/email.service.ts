import { Injectable } from '@nestjs/common';

@Injectable()
export class EmailService {
  async sendAppDownloadLink(customer: any) {
    console.log(`Sending app download link to ${customer.email}`);
    return { sent: true };
  }

  async sendOnboardingComplete(customer: any) {
    console.log(`Sending onboarding complete email to ${customer.email}`);
    return { sent: true };
  }
}