export class SessionCompletionDto {
  id: string;
  status: string;
  completedAt: Date;
  customerId?: number;
  technicianId?: number;
  voiceNoteUrl?: string;
  message?: string;
}