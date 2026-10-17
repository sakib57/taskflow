import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('organizations')
export class Organization {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ unique: true })
  @Index()
  slug: string;

  @Column({ default: 'free' })
  plan: string;

  @Column({ name: 'owner_id' })
  ownerId: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
