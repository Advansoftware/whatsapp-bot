import { IsString, IsOptional, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class MessageKeyDto {
  @IsString()
  remoteJid: string;

  @IsOptional()
  @IsString()
  id?: string;

  @IsOptional()
  fromMe?: boolean;
}

class MessageContentDto {
  @IsOptional()
  @IsString()
  conversation?: string;

  @IsOptional()
  @IsObject()
  extendedTextMessage?: {
    text?: string;
  };

  @IsOptional()
  @IsObject()
  imageMessage?: {
    caption?: string;
  };

  @IsOptional()
  @IsObject()
  videoMessage?: {
    caption?: string;
  };

  @IsOptional()
  @IsObject()
  buttonsResponseMessage?: {
    selectedDisplayText?: string;
  };

  @IsOptional()
  @IsObject()
  listResponseMessage?: {
    title?: string;
  };
}

class MessageDataDto {
  @ValidateNested()
  @Type(() => MessageKeyDto)
  key: MessageKeyDto;

  @IsOptional()
  @IsString()
  pushName?: string;

  @IsOptional()
  messageTimestamp?: number;

  @IsOptional()
  @ValidateNested()
  @Type(() => MessageContentDto)
  message?: MessageContentDto;
}

export class EvolutionWebhookDto {
  @IsString()
  event: string;

  @IsString()
  instance: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => MessageDataDto)
  data?: MessageDataDto;
}
