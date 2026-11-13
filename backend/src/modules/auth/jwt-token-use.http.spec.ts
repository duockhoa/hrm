import {
  Controller,
  Get,
  INestApplication,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { JwtStrategy } from 'src/passports/jwt.strategy';
import { PrismaService } from 'src/prisma.service';
import { EmailService } from '../email/email.service';
import { UsersService } from '../users/users.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Controller('jwt-test')
@UseGuards(jwtAuthGuard)
class ProtectedController {
  @Get()
  read(@Req() req: { user: { id: number } }) {
    return { userId: req.user.id };
  }
}

describe('JWT access and refresh separation over HTTP', () => {
  let app: INestApplication;
  const secret = 'jwt-token-use-tests-only-secret';
  const originalSecret = process.env.JWT_SECRET;
  const jwt = new JwtService({ secret, signOptions: { expiresIn: 3600 } });
  const user = { id: 1, username: 'current-user', deleted_at: null };
  const findToken = jest.fn();
  const findUser = jest.fn();
  const findById = jest.fn();
  const token = (tokenUse?: string) =>
    jwt.sign({
      sub: 1,
      username: 'old-username',
      ...(tokenUse ? { token_use: tokenUse } : {}),
    });

  beforeAll(async () => {
    process.env.JWT_SECRET = secret;
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' })],
      controllers: [AuthController, ProtectedController],
      providers: [
        AuthService,
        JwtStrategy,
        { provide: JwtService, useValue: jwt },
        {
          provide: PrismaService,
          useValue: {
            tokens: { findUnique: findToken },
            users: { findUnique: findUser },
          },
        },
        { provide: UsersService, useValue: { findById } },
        { provide: EmailService, useValue: {} },
      ],
    }).compile();
    app = module.createNestApplication();
    await app.init();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    findToken.mockResolvedValue({ id: 11, user_id: 1 });
    findUser.mockResolvedValue(user);
    findById.mockResolvedValue(user);
  });

  afterAll(async () => {
    await app.close();
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
  });

  it('accepts valid access tokens on protected APIs', async () => {
    await request(app.getHttpServer())
      .get('/jwt-test')
      .auth(token('access'), { type: 'bearer' })
      .expect(200, { userId: 1 });
  });

  it.each(['refresh', undefined, 'other'])(
    'rejects token use %s on protected APIs',
    async (use) => {
      await request(app.getHttpServer())
        .get('/jwt-test')
        .auth(token(use), { type: 'bearer' })
        .expect(401);
      expect(findById).not.toHaveBeenCalled();
    },
  );

  it('issues a usable access token from a verified refresh token using the current user identity', async () => {
    const response = await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({ refreshToken: token('refresh') })
      .expect(201);
    expect(jwt.verify(response.body.accessToken)).toMatchObject({
      sub: 1,
      username: 'current-user',
      token_use: 'access',
    });
    await request(app.getHttpServer())
      .get('/jwt-test')
      .auth(response.body.accessToken, { type: 'bearer' })
      .expect(200);
  });

  it.each(['access', undefined, 'other'])(
    'rejects token use %s at the refresh endpoint before reading tokens',
    async (use) => {
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: token(use) })
        .expect(401);
      expect(findToken).not.toHaveBeenCalled();
    },
  );

  it.each(['access', 'refresh'])(
    'rejects expired and incorrectly signed %s tokens',
    async (use) => {
      const badTokens = [
        jwt.sign({ sub: 1, token_use: use }, { expiresIn: -1 }),
        jwt.sign(
          { sub: 1, token_use: use },
          { secret: 'another-tests-only-secret' },
        ),
      ];
      for (const badToken of badTokens) {
        if (use === 'access') {
          await request(app.getHttpServer())
            .get('/jwt-test')
            .auth(badToken, { type: 'bearer' })
            .expect(401);
        } else {
          await request(app.getHttpServer())
            .post('/auth/refresh-token')
            .send({ refreshToken: badToken })
            .expect(401);
        }
      }
      expect(findToken).not.toHaveBeenCalled();
      expect(findById).not.toHaveBeenCalled();
    },
  );

  it('rejects refresh tokens removed from the database', async () => {
    findToken.mockResolvedValue(null);
    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({ refreshToken: token('refresh') })
      .expect(401);
    expect(findUser).not.toHaveBeenCalled();
  });

  it('rejects a refresh token whose subject does not match its database owner', async () => {
    findToken.mockResolvedValue({ id: 11, user_id: 2 });
    await request(app.getHttpServer())
      .post('/auth/refresh-token')
      .send({ refreshToken: token('refresh') })
      .expect(401);
    expect(findUser).not.toHaveBeenCalled();
  });

  it.each([null, { ...user, deleted_at: new Date() }])(
    'rejects refresh and access when the user is unavailable: %j',
    async (unavailable) => {
      findUser.mockResolvedValue(unavailable);
      findById.mockResolvedValue(unavailable);
      await request(app.getHttpServer())
        .post('/auth/refresh-token')
        .send({ refreshToken: token('refresh') })
        .expect(401);
      await request(app.getHttpServer())
        .get('/jwt-test')
        .auth(token('access'), { type: 'bearer' })
        .expect(401);
    },
  );
});
