import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ unique: true })
  email!: string;

  @Column({ name: 'password_hash' })
  passwordHash!: string;

  @Column()
  name!: string;

  @Column({ name: 'email_verified', default: false })
  emailVerified!: boolean;

  @Column({ name: 'avatar_url', nullable: true })
  avatarUrl?: string; // যেহেতু এটি nullable, তাই চাইলে ? দিতে পারেন অথবা ! ও দিতে পারেন

  @Column({ name: 'google_id', nullable: true })
  @Index({ unique: true, where: 'google_id IS NOT NULL' })
  googleId?: string; // nullable হওয়ায় ? দেওয়া ভালো

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
