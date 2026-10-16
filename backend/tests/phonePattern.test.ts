// phoneMatchPattern turns a stored-phone lookup key into a regex that matches the number however
// it was typed. The key comes from phoneKeyOf, but the function is the last line of defence before
// a regex reaches Mongo, so anything that is not exactly ten digits must match nothing at all.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { phoneKeyOf, phoneMatchPattern } from '../src/utils/phone';

const KEY = '9876543210';

test('matches the number however it was typed, including a leading trunk 0', () => {
  const re = phoneMatchPattern(KEY);
  for (const typed of ['9876543210', '+91 98765 43210', '919876543210', '098765 43210', '09876543210', '+91-98765-43210', '(98765) 43-210']) {
    assert.ok(re.test(typed), `${typed} should match`);
    assert.equal(phoneKeyOf(typed), KEY, `${typed} should key to ${KEY}`);
  }
});

test('does not match a different number', () => {
  const re = phoneMatchPattern(KEY);
  for (const other of ['9876543211', '1234567890', '98765432100', '19876543210', '0198765 43210', '9876 54321', '+91 98765 43211', '']) {
    assert.ok(!re.test(other), `${other} should not match`);
  }
});

test('a key that is not exactly ten digits never matches anything', () => {
  for (const key of ['', 'abc', '987654321', '98765432100', '+919876543210', '9876543210\n', '.*', '9876543210|.*', '(?:)', ' 9876543210', 'abcdefghij', '98765 43210']) {
    const re = phoneMatchPattern(key);
    assert.ok(re instanceof RegExp, `${JSON.stringify(key)} still yields a RegExp`);
    for (const text of ['', 'abc', '9876543210', '+91 98765 43210', '098765 43210', '.*', 'anything at all', key]) {
      assert.ok(!re.test(text), `key ${JSON.stringify(key)} must not match ${JSON.stringify(text)}`);
    }
  }
});

test('non-string keys never match either', () => {
  for (const key of [undefined, null, 9876543210, {}, []]) {
    const re = phoneMatchPattern(key as unknown as string);
    assert.ok(!re.test('9876543210'), `${JSON.stringify(key)} must not match`);
  }
});
