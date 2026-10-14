import { ValidationPipe } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { PERMISSIONS_KEY } from 'src/decorators/permissions.decorator';
import { jwtAuthGuard } from 'src/guards/jwt-auth.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { EmailSettingsController } from './email-settings.controller';
import { SaveEmailRecipientsDto } from './dto/email-settings.dto';
import { EmailSettingsService } from './email-settings.service';

describe('EmailSettingsController', () => {
  const service = {
    findPersonal: jest.fn(),
    savePersonal: jest.fn(),
    deletePersonal: jest.fn(),
  };
  const controller = new EmailSettingsController(
    service as unknown as EmailSettingsService,
  );

  it('requires authentication and permission guards', () => {
    expect(
      Reflect.getMetadata(GUARDS_METADATA, EmailSettingsController),
    ).toEqual([jwtAuthGuard, PermissionsGuard]);
    for (const method of [
      'saveDefault',
      'deleteDefault',
      'createType',
      'updateType',
      'findDefaults',
    ]) {
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          EmailSettingsController.prototype[method],
        ),
      ).toEqual(['email-settings.manage']);
    }
  });

  it('does not require management permission for personal configuration', () => {
    for (const method of [
      'findTypes',
      'findPersonal',
      'savePersonal',
      'deletePersonal',
    ]) {
      expect(
        Reflect.getMetadata(
          PERMISSIONS_KEY,
          EmailSettingsController.prototype[method],
        ),
      ).toBeUndefined();
    }
  });

  it('allows management only with the single manage permission while personal settings remain accessible', () => {
    const guard = new PermissionsGuard(new Reflector());
    const context = (handler: Function, permissions: string[]) =>
      ({
        getHandler: () => handler,
        getClass: () => EmailSettingsController,
        switchToHttp: () => ({
          getRequest: () => ({ user: { id: 7, permissions } }),
        }),
      }) as unknown as ExecutionContext;

    expect(
      guard.canActivate(
        context(controller.findDefaults, ['email-settings.manage']),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        context(controller.saveDefault, ['email-settings.manage']),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        context(controller.findDefaults, [
          'email-settings.read',
          'email-settings.update',
        ]),
      ),
    ).toBe(false);
    expect(guard.canActivate(context(controller.savePersonal, []))).toBe(true);
  });

  it('uses the authenticated user for every personal operation', () => {
    const request = { user: { id: 7 } };
    controller.findPersonal(request);
    controller.savePersonal(request, 1, { email: 'personal@example.com' });
    controller.deletePersonal(request, 1);
    expect(service.findPersonal).toHaveBeenCalledWith(7);
    expect(service.savePersonal).toHaveBeenCalledWith(
      7,
      1,
      'personal@example.com',
    );
    expect(service.deletePersonal).toHaveBeenCalledWith(7, 1);
  });

  it('rejects attempts to supply another user id in the request body', async () => {
    const pipe = new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    });
    await expect(
      pipe.transform(
        { email: 'personal@example.com', user_id: 99 },
        { type: 'body', metatype: SaveEmailRecipientsDto },
      ),
    ).rejects.toThrow();
    await expect(
      pipe.transform(
        { email: '' },
        { type: 'body', metatype: SaveEmailRecipientsDto },
      ),
    ).resolves.toMatchObject({ email: '' });
  });
});
