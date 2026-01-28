import { IsBoolean, IsHexColor, IsInt, IsNotEmpty, IsOptional, IsString, IsArray } from 'class-validator';

export class CreateStageDto {
  @IsNotEmpty()
  @IsString()
  pipelineId: string;

  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  position?: number;
}

export class UpdateStageDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsHexColor()
  color?: string;

  @IsOptional()
  @IsInt()
  position?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class ReorderStagesDto {
  @IsNotEmpty()
  @IsString()
  pipelineId: string;

  @IsArray()
  @IsString({ each: true })
  stageIds: string[];
}
