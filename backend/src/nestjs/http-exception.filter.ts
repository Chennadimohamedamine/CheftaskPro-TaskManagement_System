 

import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    console.error('🔥 Global Exception Filter Captured Error:', exception);

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : exception.status || HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception.message || 'An unexpected server error occurred';

    let errors: any = undefined;
    if (exception instanceof HttpException) {
      const responseBody = exception.getResponse();
      if (typeof responseBody === 'object') {
        errors = (responseBody as any).errors || (responseBody as any).message || undefined;
      }
    }

    response.status(status).json({
      success: false,
      message,
      errors
    });
  }
}
