import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

// DTO para criar aplicação de webhook
export class CreateWebhookAppDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;
}

// DTO para atualizar aplicação
export class UpdateWebhookAppDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  icon?: string;

  @IsString()
  @IsOptional()
  color?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsBoolean()
  @IsOptional()
  logEnabled?: boolean;
}

// DTO para criar evento de webhook
export class CreateWebhookEventDto {
  @IsString()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  eventField: string; // Campo do payload que identifica o evento

  @IsString()
  eventValue: string; // Valor que identifica o evento

  @IsString()
  messageTemplate: string; // Template com {{campo}}

  @IsArray()
  @IsOptional()
  contactIds?: string[];
}

// DTO para atualizar evento
export class UpdateWebhookEventDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsString()
  @IsOptional()
  eventField?: string;

  @IsString()
  @IsOptional()
  eventValue?: string;

  @IsString()
  @IsOptional()
  messageTemplate?: string;

  @IsArray()
  @IsOptional()
  contactIds?: string[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// DTO para criar contato
export class CreateWebhookContactDto {
  @IsString()
  name: string;

  @IsString()
  remoteJid: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// DTO para atualizar contato
export class UpdateWebhookContactDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
