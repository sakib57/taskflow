import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsIn,
  MaxLength,
  IsDateString,
} from 'class-validator';

export class CreateTaskDto {
  @ApiProperty({ description: 'Project ID' })
  @IsUUID()
  projectId: string;

  @ApiProperty({ description: 'Task title', maxLength: 500 })
  @IsString()
  @MaxLength(500)
  title: string;

  @ApiPropertyOptional({ description: 'Task description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    enum: ['todo', 'in_progress', 'review', 'done'],
    default: 'todo',
  })
  @IsOptional()
  @IsIn(['todo', 'in_progress', 'review', 'done'])
  status?: 'todo' | 'in_progress' | 'review' | 'done';

  @ApiPropertyOptional({
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium',
  })
  @IsOptional()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: 'low' | 'medium' | 'high' | 'urgent';

  @ApiPropertyOptional({ description: 'Assignee user ID' })
  @IsOptional()
  @IsUUID()
  assigneeId?: string;

  @ApiPropertyOptional({ description: 'Due date (ISO string)' })
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}
