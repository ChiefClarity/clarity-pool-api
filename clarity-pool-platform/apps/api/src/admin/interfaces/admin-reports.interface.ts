export interface AdminReportConfig {
  id: string;
  isEnabled: boolean;
  scheduleDay: string;
  scheduleTime: string;
  timeZone: string;
  emailSubjectTemplate: string;
  emailFooterText: string;
  notificationEmails: string[];
  lastModifiedBy: string;
  lastModifiedAt: Date;
  createdAt: Date;
  updatedAt: Date;
  weatherEnabled?: boolean;
}

export interface AdminReportHistory {
  id: string;
  reportType: string;
  recipientCount: number;
  successCount: number;
  failureCount: number;
  status: string;
  errorMessage?: string;
  sentAt: Date;
  sentBy: string;
  metadata?: Record<string, any>;
}

export interface AdminReportAnalytics {
  totalReports: number;
  successfulReports: number;
  failedReports: number;
  totalRecipients: number;
  averageDeliveryRate: number;
  dailyBreakdown: Array<{
    date: string;
    sent: number;
    delivered: number;
    failed: number;
  }>;
}

export interface AdminReportPreferences {
  userId: string;
  receiveWeeklyReports: boolean;
  reportFrequency: string;
  preferredDay: string;
  preferredTime: string;
  includeWeatherData: boolean;
  includeServiceHistory: boolean;
  includeUpcomingServices: boolean;
  emailFormat: string;
}

export interface BulkSendResult {
  totalRecipients: number;
  successCount: number;
  failureCount: number;
  failures: Array<{
    email: string;
    error: string;
  }>;
  duration: number;
}

export interface ReportRecipient {
  id: string;
  email: string;
  name: string;
}

export interface ReportPreviewOptions {
  userId?: string;
  emailTemplate?: {
    subject?: string;
    footer?: string;
  };
}

export interface TestReportOptions {
  recipientEmail: string;
  includeData: boolean;
  sentBy?: string;
}

export interface ReportSchedule {
  day: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
  time: string; // HH:mm format
  timeZone: string;
}

export interface EmailTemplate {
  subject: string;
  headerImage?: string;
  footerText: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export interface ReportMetrics {
  openRate: number;
  clickRate: number;
  unsubscribeRate: number;
  bounceRate: number;
}

export interface AdminNotification {
  id: string;
  type: 'report_sent' | 'report_failed' | 'config_updated' | 'bulk_complete';
  message: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface ReportGenerationStatus {
  status: 'pending' | 'generating' | 'sending' | 'completed' | 'failed';
  progress: number;
  currentRecipient?: string;
  startTime: Date;
  estimatedCompletion?: Date;
  errors?: string[];
}