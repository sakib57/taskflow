import { Body, Controller, Post, Headers } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { CurrentUser } from '@taskflow/auth-lib';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@ApiTags('payments')
@ApiBearerAuth('access-token')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  @ApiOperation({ summary: 'Process a payment (idempotent)' })
  async create(@Body() dto: CreatePaymentDto, @CurrentUser('orgId') orgId: string) {
    return this.paymentsService.processPayment(dto, orgId);
  }
}
