import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma.service';
import { JwtStrategy } from 'src/passports/jwt.strategy';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    JwtStrategy,
    RolesGuard,
    PermissionsGuard,
  ],
  imports: [],
  exports: [UsersService],
})
export class UsersModule {}
