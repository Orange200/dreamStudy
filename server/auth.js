import { timingSafeEqual } from 'node:crypto';

export function isAuthorized(header, user, password) {
 const expected = Buffer.from('Basic ' + Buffer.from(user + ':' + password).toString('base64'));
 const actual = Buffer.from(header || '');
 return actual.length === expected.length && timingSafeEqual(actual, expected);
}
