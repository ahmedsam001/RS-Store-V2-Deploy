import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  async check(@Res({ passthrough: true }) response: Response) {
    const result = await this.healthService.check();
    response.status(result.statusCode);
    return result.body;
  }
}
