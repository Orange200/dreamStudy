import { timingSafeEqual, createHmac } from 'node:crypto';

export function isAuthorized(header, user, password) {
 const expected = Buffer.from('Basic ' + Buffer.from(user + ':' + password).toString('base64'));
 const actual = Buffer.from(header || '');
 return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function createSession(secret, now = Date.now()) {
 const expiry = String(now + 7 * 24 * 60 * 60 * 1000);
 return expiry + '.' + createHmac('sha256', secret).update(expiry).digest('hex');
}
export function validSession(token, secret, now = Date.now()) {
 if (!token || !/^\d{13}\.\w{64}$/.test(token)) return false;
 const [expiry, signature] = token.split('.');
 const expected = createHmac('sha256', secret).update(expiry).digest('hex');
 return Number(expiry) > now && timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}
