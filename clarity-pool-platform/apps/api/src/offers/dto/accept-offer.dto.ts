import { IsDateString, IsString } from 'class-validator';

export class AcceptOfferDto {
  @IsDateString()
  acceptedAt: Date;

  @IsString()
  deviceId: string;
}