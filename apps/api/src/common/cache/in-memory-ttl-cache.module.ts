import { Global, Module } from '@nestjs/common';
import { InMemoryTtlCacheService } from './in-memory-ttl-cache.service';

@Global()
@Module({
  providers: [InMemoryTtlCacheService],
  exports: [InMemoryTtlCacheService],
})
export class InMemoryTtlCacheModule {}
