import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaService } from 'src/prisma.service';
import { JwtStrategy } from 'src/passports/jwt.strategy';
import { UsersService } from '../users/users.service';
@Module({
  controllers: [RolesController],
  providers: [RolesService, PrismaService, JwtStrategy, UsersService],
})
export class RolesModule {}
