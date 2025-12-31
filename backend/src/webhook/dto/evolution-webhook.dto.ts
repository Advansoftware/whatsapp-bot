import { IsString, IsOptional } from 'class-validator';

export class EvolutionWebhookDto {
  @IsString()
  event: string;

  @IsString()
  instance: string;

  @IsOptional()
  data?: any; // Can be object or array depending on event type

  @IsOptional()
  @IsString()
  sender?: string;

  @IsOptional()
  @IsString()
  server_url?: string;

  @IsOptional()
  @IsString()
  apikey?: string;
}

