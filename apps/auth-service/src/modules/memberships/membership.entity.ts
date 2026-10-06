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
  id!: string;

  @Column({ name: 'user_id' })
  @Index()
  userId!: string;

  @Column({ name: 'org_id' })
  @Index()
  orgId!: string;

  @Column({ default: 'member' })
  role!: string; // owner, admin, member

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
