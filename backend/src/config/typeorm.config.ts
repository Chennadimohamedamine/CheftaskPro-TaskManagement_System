/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

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
} from '../database/entities.js';
import * as dotenv from 'dotenv';
dotenv.config();

console.log(process.env.DB_HOST);
const isPostgres = process.env.DB_HOST
console.log(`Using ${isPostgres} as the database.`);

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
        type: 'sqlite' as any,
        database: 'database.sqlite',
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
);
