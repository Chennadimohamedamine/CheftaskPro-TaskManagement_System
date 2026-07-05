 

import { DataSource } from 'typeorm';
import {
  User,
  Team,
  TeamMember,
  Project,
  Task,
  Comment,
  Notification,
  AuditLog,
  VerificationToken,
  PasswordResetToken
} from '../database/entities';

const isPostgres = !!process.env.DB_HOST;

export const AppDataSource = new DataSource(
  isPostgres
    ? {
        type: 'postgres',
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || '5432', 10),
        username: process.env.DB_USERNAME,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE,
        synchronize: true,
        logging: false,
        entities: [
          User,
          Team,
          TeamMember,
          Project,
          Task,
          Comment,
          Notification,
          AuditLog,
          VerificationToken,
          PasswordResetToken
        ],
        migrations: [],
        subscribers: []
      }
    : {
        type: 'better-sqlite3' as any,
        database: 'database.sqlite',
        synchronize: true, // Automatically synchronize schema on startup
        logging: false,
        entities: [
          User,
          Team,
          TeamMember,
          Project,
          Task,
          Comment,
          Notification,
          AuditLog,
          VerificationToken,
          PasswordResetToken
        ],
        migrations: [],
        subscribers: []
      }
);
