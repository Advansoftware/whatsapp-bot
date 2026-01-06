import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { SecretaryTasksService, CreateTaskDto, UpdateTaskDto } from './secretary-tasks.service';

@Controller('api/secretary-tasks')
@UseGuards(JwtAuthGuard)
export class SecretaryTasksController {
  constructor(private readonly tasksService: SecretaryTasksService) { }

  @Get()
  async findAll(@Request() req: any) {
    const companyId = req.user.companyId;
    return this.tasksService.findAll(companyId);
  }

  @Get(':id')
  async findOne(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.tasksService.findOne(id, companyId);
  }

  @Post()
  async create(@Request() req: any, @Body() data: CreateTaskDto) {
    const companyId = req.user.companyId;
    return this.tasksService.create(companyId, data, 'dashboard');
  }

  @Put(':id')
  async update(
    @Request() req: any,
    @Param('id') id: string,
    @Body() data: UpdateTaskDto,
  ) {
    const companyId = req.user.companyId;
    await this.tasksService.update(id, companyId, data);
    return this.tasksService.findOne(id, companyId);
  }

  @Delete(':id')
  async delete(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    await this.tasksService.delete(id, companyId);
    return { success: true };
  }

  @Patch(':id/toggle')
  async toggle(@Request() req: any, @Param('id') id: string) {
    const companyId = req.user.companyId;
    return this.tasksService.toggle(id, companyId);
  }
}
