import { IsString, IsOptional, IsBoolean, IsArray } from 'class-validator';

// DTO genérico para qualquer webhook externo
export class ExternalWebhookPayloadDto {
  // Aceita qualquer payload JSON
  [key: string]: any;
}

// DTO para criar contato de notificação
export class CreateWebhookContactDto {
  @IsString()
  name: string;

  @IsString()
  remoteJid: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  categories?: string[];
}

// DTO para atualizar contato
export class UpdateWebhookContactDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsArray()
  @IsOptional()
  categories?: string[];
}

// DTO para atualizar configuração do webhook
export class UpdateWebhookConfigDto {
  @IsString()
  @IsOptional()
  messageTemplate?: string;

  @IsBoolean()
  @IsOptional()
  logEnabled?: boolean;

  @IsString()
  @IsOptional()
  secretToken?: string;
}
