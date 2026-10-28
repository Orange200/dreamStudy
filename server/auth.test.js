import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthorized } from './auth.js';

test('访问凭据必须同时匹配用户名和密码', () => {
 const header = text => 'Basic ' + Buffer.from(text).toString('base64');
 assert.equal(isAuthorized(header('owner:correct-password'), 'owner', 'correct-password'), true);
 assert.equal(isAuthorized(header('other:correct-password'), 'owner', 'correct-password'), false);
 assert.equal(isAuthorized(header('owner:wrong-password'), 'owner', 'correct-password'), false);
 assert.equal(isAuthorized(undefined, 'owner', 'correct-password'), false);
 assert.equal(isAuthorized('Bearer unexpected', 'owner', 'correct-password'), false);
});
