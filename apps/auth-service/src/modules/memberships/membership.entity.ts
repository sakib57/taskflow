import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';

@Entity('memberships')
@Unique(['userId', 'orgId'])
export class Membership {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'user_id', type: 'uuid' })
  @Index()
  userId: string;

  @Column({ name: 'org_id', type: 'uuid' })
  @Index()
  orgId: string;

  @Column({ type: 'varchar', length: 20, default: 'member' })
  role: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
