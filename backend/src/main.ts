 

import 'reflect-metadata';
import dotenv from 'dotenv';
dotenv.config();

import { NestFactory } from '@nestjs/core';
import { AppModule } from './nestjs/app.module'; 
import { AllExceptionsFilter } from './nestjs/http-exception.filter'; 
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import express from 'express';

import { AppDataSource } from './config/typeorm.config'; 
import { seedAdmin } from './database/seeds/admin.seed'; 
import { TasksService } from './modules/tasks/tasks.service'; 

const PORT = 3000;
async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log(`Database (${AppDataSource.options.type}) initialized successfully.`);
    await seedAdmin();
    const app = await NestFactory.create(AppModule);
    const tasksService = app.get(TasksService);
    setInterval(async () => {
      try {
        await tasksService.sendDueReminders();
      } catch (cronErr) {
        console.error(' Failed to run periodic reminders job:', cronErr);
      }
    }, 60 * 60 * 1000); // 1 hour

    // 6. Configure global Exception Filter, CORS, Cookie Parser, Helmet
    app.useGlobalFilters(new AllExceptionsFilter());

    app.enableCors({
      origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
      credentials: true
    });

    app.use(helmet({
      contentSecurityPolicy: false, // Disable CSP to allow Vite scripts to load smoothly in the iframe
      crossOriginEmbedderPolicy: false
    }));

    app.use(cookieParser());

    // 6. Access underlying Express instance for Vite middleware or static serving

    // 7. Listen on port and bind to all host interfaces
    await app.listen(PORT, '0.0.0.0');
    console.log(`TaskFlow Pro running on NestJS at http://localhost:${PORT}`);

  } catch (initErr) {
    console.error('Server Boot failed during startup sequence:', initErr);
    process.exit(1);
  }
}

startServer();
