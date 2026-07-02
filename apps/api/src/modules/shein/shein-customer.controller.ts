import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../../common/types/authenticated-user';
import { CreateSheinRequestDto } from './dto/create-shein-request.dto';
import { SheinService } from './shein.service';

@Controller('shein')
@UseGuards(JwtAuthGuard)
export class SheinCustomerController {
  constructor(private readonly sheinService: SheinService) {}

  @Post('requests')
  createCustomerRequest(
    @Body() dto: CreateSheinRequestDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.sheinService.createCustomerRequest(dto, user);
  }
}
