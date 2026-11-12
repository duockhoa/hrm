import { BadRequestException } from '@nestjs/common';
import { parseItemsQuery, ListItemsQuery } from './list-items-query';

describe('Items query validation', () => {
  it('preserves unpaginated requests and uses stable default ordering', () => {
    expect(parseItemsQuery({})).toMatchObject({
      orderBy: [{ field: 'item_code', direction: 'asc' }],
      count: false,
    });
    expect(parseItemsQuery({})).not.toHaveProperty('top');
    expect(parseItemsQuery({ skip: '0' })).toMatchObject({ skip: 0, top: 50 });
    expect(parseItemsQuery({ top: '200' })).toMatchObject({ top: 200 });
  });

  it('parses every parameter and preserves zero Series IDs', () => {
    expect(
      parseItemsQuery({
        skip: '50',
        top: '25',
        search: ' Midkid ',
        codePrefix: 'tp',
        series: '108,109,0,108',
        registrationId: '12',
        hasRegistration: 'true',
        select: 'item_code,item_name,series',
        orderBy: 'item_name:desc',
        count: 'true',
        expand: 'registration',
      }),
    ).toEqual({
      skip: 50,
      top: 25,
      search: 'Midkid',
      codePrefix: 'TP',
      series: [108, 109, 0],
      registrationId: 12,
      hasRegistration: true,
      select: ['item_code', 'item_name', 'series'],
      orderBy: [
        { field: 'item_name', direction: 'desc' },
        { field: 'item_code', direction: 'asc' },
      ],
      count: true,
      expand: ['registration'],
    });
  });

  it('allows false flags, multiple sort fields and explicit no expansion', () => {
    expect(
      parseItemsQuery({
        hasRegistration: 'false',
        count: 'false',
        expand: 'none',
        orderBy: 'series:desc,item_code:desc',
      }),
    ).toMatchObject({
      hasRegistration: false,
      count: false,
      expand: [],
      orderBy: [
        { field: 'series', direction: 'desc' },
        { field: 'item_code', direction: 'desc' },
      ],
    });
  });

  it.each<ListItemsQuery>([
    { skip: '-1' },
    { skip: '1.5' },
    { skip: '2147483648' },
    { skip: '' },
    { top: '0' },
    { top: '201' },
    { top: 'Infinity' },
    { top: '1e2' },
    { series: '-1' },
    { series: '108,' },
    { series: 'a' },
    { series: Array(101).fill('1').join(',') },
    { registrationId: '0' },
    { registrationId: 'abc' },
    { count: '1' },
    { hasRegistration: 'yes' },
    { select: 'password' },
    { select: 'registration' },
    { select: '' },
    { expand: 'users' },
    { expand: 'none,registration' },
    { orderBy: 'item_name' },
    { orderBy: 'item_name:ASC' },
    { orderBy: 'password:asc' },
    { orderBy: 'item_name:asc,item_name:desc' },
    { orderBy: 'item_code:asc:extra' },
    { codePrefix: 'TP01' },
    { search: 'a'.repeat(201) },
    { top: ['1', '2'] },
    { search: { contains: 'x' } },
    { skip: 1 },
    { filter: 'series eq 108' },
  ])('rejects unsupported or malformed input: %j', (query) => {
    expect(() => parseItemsQuery(query)).toThrow(BadRequestException);
  });
});
