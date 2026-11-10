import { Injectable, ConflictException, Inject } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ClientProxy } from '@nestjs/microservices';
import { Payment } from './payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment) private repo: Repository<Payment>,
    private dataSource: DataSource,
    @Inject('RABBITMQ_SERVICE') private client: ClientProxy,
  ) {}

  async processPayment(dto: CreatePaymentDto, orgId: string) {
    // 1. IDEMPOTENCY CHECK: Did we already process this key?
    const existing = await this.repo.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });

    if (existing) {
      if (existing.status === 'completed') {
        // Safe retry: Return the existing successful payment
        return existing;
      }
      if (existing.status === 'pending') {
        throw new ConflictException('Payment is already processing');
      }
    }

    // 2. CREATE PENDING PAYMENT
    // (Agar 2 ta request eksathe ashe, DB unique constraint failure dibe,
    // seta handle korte hobe)
    try {
      const payment = this.repo.create({
        orgId,
        amount: dto.amount,
        currency: dto.currency,
        paymentMethod: dto.paymentMethod,
        idempotencyKey: dto.idempotencyKey,
        status: 'pending',
      });
      await this.repo.save(payment);
    } catch (err: any) {
      // Postgres unique violation code: 23505
      if (err.code === '23505') {
        // Someone else just created it. Fetch and return.
        return this.repo.findOne({ where: { idempotencyKey: dto.idempotencyKey } });
      }
      throw err;
    }

    // 3. CALL EXTERNAL GATEWAY (Stripe / bKash)
    // Simulating a 2-second call to Stripe
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Assume success
    const isSuccess = true;
    const gatewayTxnId = `txn_${Date.now()}`;

    // 4. UPDATE PAYMENT + EMIT EVENT (Transactional)
    return await this.dataSource.transaction(async (manager) => {
      const payment = await manager.findOne(Payment, {
        where: { idempotencyKey: dto.idempotencyKey },
        lock: { mode: 'pessimistic_write' },
      });

      if (!payment) {
        return;
      }

      if (isSuccess) {
        payment.status = 'completed';
        payment.gatewayTxnId = gatewayTxnId;
      } else {
        payment.status = 'failed';
      }

      await manager.save(payment);

      // OUTBOX: Publish event (In real production, write to Outbox table first)
      if (isSuccess) {
        this.client.emit('payment.completed', {
          paymentId: payment.id,
          orgId: payment.orgId,
          amount: payment.amount,
          currency: payment.currency,
        });
      }

      return payment;
    });
  }
}
