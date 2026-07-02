import { Controller, Get } from '@nestjs/common';

type RootResponse = {
  message: string;
  health: string;
  docs: null;
};

@Controller()
export class AppController {
  @Get()
  getRoot(): RootResponse {
    return {
      message: 'RS Store API is running',
      health: '/api/v1/health',
      docs: null,
    };
  }
}
