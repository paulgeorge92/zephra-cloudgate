import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : null;

    const message =
      typeof exceptionResponse === 'object' && exceptionResponse !== null
        ? (exceptionResponse as any).message || (exceptionResponse as any).error
        : exception instanceof Error
        ? exception.message
        : 'Internal server error';

    // Log the error for internal tracking (optional)
    if (status === HttpStatus.INTERNAL_SERVER_ERROR) {
       console.error('[Global Exception Filter]', exception);
    }

    response.status(status).json({
      success: false,
      response: null,
      message: Array.isArray(message) ? message[0] : message, // Handle Nest validation arrays
    });
  }
}
