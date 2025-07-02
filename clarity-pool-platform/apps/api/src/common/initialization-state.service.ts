import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

export enum ServiceState {
  PENDING = 'pending',
  INITIALIZING = 'initializing',
  READY = 'ready',
  ERROR = 'error',
}

export interface ServiceStatus {
  name: string;
  state: ServiceState;
  error?: string;
}

@Injectable()
export class InitializationStateService extends EventEmitter {
  private readonly logger = new Logger(InitializationStateService.name);
  private serviceStates = new Map<string, ServiceStatus>();
  private readyPromises = new Map<string, Promise<void>>();
  private readyResolvers = new Map<string, () => void>();
  private readyRejecters = new Map<string, (error: Error) => void>();

  registerService(serviceName: string): void {
    this.logger.log(`Registering service: ${serviceName}`);

    this.serviceStates.set(serviceName, {
      name: serviceName,
      state: ServiceState.PENDING,
    });

    const promise = new Promise<void>((resolve, reject) => {
      this.readyResolvers.set(serviceName, resolve);
      this.readyRejecters.set(serviceName, reject);
    });

    this.readyPromises.set(serviceName, promise);
  }

  setServiceInitializing(serviceName: string): void {
    const status = this.serviceStates.get(serviceName);
    if (status) {
      status.state = ServiceState.INITIALIZING;
      this.logger.log(`Service ${serviceName} is initializing...`);
      this.emit('service-initializing', status);
    }
  }

  setServiceReady(serviceName: string): void {
    const status = this.serviceStates.get(serviceName);
    if (status) {
      status.state = ServiceState.READY;
      this.logger.log(`✅ Service ${serviceName} is ready`);
      this.emit('service-ready', status);

      const resolver = this.readyResolvers.get(serviceName);
      if (resolver) {
        resolver();
      }
    }
  }

  setServiceError(serviceName: string, error: string): void {
    const status = this.serviceStates.get(serviceName);
    if (status) {
      status.state = ServiceState.ERROR;
      status.error = error;
      this.logger.error(`❌ Service ${serviceName} failed: ${error}`);
      this.emit('service-error', status);

      const rejecter = this.readyRejecters.get(serviceName);
      if (rejecter) {
        rejecter(new Error(error));
      }
    }
  }

  async waitForService(
    serviceName: string,
    timeoutMs: number = 10000,
  ): Promise<void> {
    const promise = this.readyPromises.get(serviceName);
    if (!promise) {
      throw new Error(`Service ${serviceName} is not registered`);
    }

    const timeoutPromise = new Promise<void>((_, reject) => {
      setTimeout(
        () =>
          reject(
            new Error(
              `Service ${serviceName} initialization timed out after ${timeoutMs}ms`,
            ),
          ),
        timeoutMs,
      );
    });

    try {
      await Promise.race([promise, timeoutPromise]);
      this.logger.log(`Successfully waited for ${serviceName}`);
    } catch (error) {
      this.logger.error(`Failed waiting for ${serviceName}:`, error.message);
      throw error;
    }
  }

  getServiceStatus(serviceName: string): ServiceStatus | undefined {
    return this.serviceStates.get(serviceName);
  }

  getAllServiceStatuses(): ServiceStatus[] {
    return Array.from(this.serviceStates.values());
  }
}
