import { IsEnum, IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, IsDateString } from 'class-validator';

export enum DealPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  URGENT = 'urgent',
}

export enum DealStatus {
  OPEN = 'open',
  WON = 'won',
  LOST = 'lost',
}

export class CreateDealDto {
  @IsNotEmpty()
  @IsString()
  stageId: string;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  contactId?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsEnum(DealPriority)
  priority?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;
}

export class UpdateDealDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsNumber()
  value?: number;

  @IsOptional()
  @IsEnum(DealPriority)
  priority?: string;

  @IsOptional()
  @IsEnum(DealStatus)
  status?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsDateString()
  expectedCloseDate?: string;
}

export class MoveDealDto {
  @IsNotEmpty()
  @IsString()
  stageId: string;

  @IsNotEmpty()
  @IsInt()
  position: number;
}
