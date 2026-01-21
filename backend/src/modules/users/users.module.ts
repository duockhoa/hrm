import { Module } from '@nestjs/common';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { PrismaService } from 'src/prisma.service';
import { JwtStrategy } from 'src/passports/jwt.strategy';
import { RolesGuard } from 'src/guards/roles.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { CloudinaryService } from 'src/cloudinary.service';

@Module({
  controllers: [UsersController],
  providers: [
    UsersService,
    PrismaService,
    JwtStrategy,
    RolesGuard,
    PermissionsGuard,
    CloudinaryService,
  ],
  imports: [],
  exports: [UsersService],
})
export class UsersModule {}
