import { Controller, Get, VERSION_NEUTRAL, Version } from '@nestjs/common';

export interface HealthResponse {
  status: 'ok';
  service: string;
  timestamp: string;
  uptime: number;
}

@Controller()
export class AppController {
  @Get('health')
  @Version(VERSION_NEUTRAL)
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'food-evolution-api',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }
}
