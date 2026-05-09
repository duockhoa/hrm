import { Module } from '@nestjs/common';
import { RolesService } from './roles.service';
import { RolesController } from './roles.controller';
import { PrismaService } from 'src/prisma.service';
import { JwtStrategy } from 'src/passports/jwt.strategy';
import { UsersModule } from '../users/users.module';
@Module({
  controllers: [RolesController],
  providers: [RolesService, PrismaService, JwtStrategy],
  imports: [UsersModule],
})
export class RolesModule {}
