import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'org_id', type: 'uuid' })
  @Index()
  orgId: string;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  amount: number;

  @Column({ type: 'varchar', length: 3 })
  currency: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: 'pending' | 'completed' | 'failed';

  // 🌟 IDEMPOTENCY KEY 🌟
  @Column({ name: 'idempotency_key', type: 'varchar', length: 255, unique: true })
  @Index()
  idempotencyKey: string;

  @Column({ name: 'payment_method', type: 'varchar', length: 50 })
  paymentMethod: string; // "stripe" | "bkash"

  @Column({ name: 'gateway_txn_id', type: 'varchar', length: 255, nullable: true })
  gatewayTxnId: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
