import { jwtUserId } from './jwt-payload';

describe('verified JWT claims', () => {
  it.each([1, '1'])(
    'accepts the matching token type with subject %s',
    (sub) => {
      expect(jwtUserId({ sub, token_use: 'access' }, 'access')).toBe(1);
      expect(jwtUserId({ sub, token_use: 'refresh' }, 'refresh')).toBe(1);
    },
  );

  it.each([
    undefined,
    null,
    [],
    'token',
    {},
    { sub: 1 },
    { sub: 1, token_use: 'refresh' },
  ])('rejects non-access payload %j', (payload) => {
    expect(jwtUserId(payload, 'access')).toBeNull();
  });

  it.each([
    null,
    undefined,
    true,
    false,
    [],
    [1],
    {},
    0,
    -1,
    1.5,
    '1e0',
    '1.0',
    'abc',
    '',
    2147483648,
  ])('rejects malformed subject %j', (sub) => {
    expect(jwtUserId({ sub, token_use: 'access' }, 'access')).toBeNull();
    expect(jwtUserId({ sub, token_use: 'refresh' }, 'refresh')).toBeNull();
  });
});
