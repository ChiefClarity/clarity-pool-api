import { Injectable, NestInterceptor, ExecutionContext, CallHandler, ServiceUnavailableException } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class DatabaseErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError(err => {
        if (err.code === 'P2002' || err.code === 'P2025' || err.message?.includes('Can\'t reach database')) {
          throw new ServiceUnavailableException('Database temporarily unavailable. Please try again later.');
        }
        return throwError(err);
      }),
    );
  }
}