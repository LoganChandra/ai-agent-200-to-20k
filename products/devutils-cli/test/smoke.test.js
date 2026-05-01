const test = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const CLI = path.join(__dirname, '..', 'bin', 'devutils.js');

function run(args, input = '') {
  return spawnSync(process.execPath, [CLI, ...args], {
    input,
    encoding: 'utf8',
  });
}

test('formats JSON from stdin', () => {
  const res = run(['fmt', 'json'], '{"a":1}');
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /"a": 1/);
});

test('hashes sha256 deterministically', () => {
  const res = run(['hash', 'sha256', 'hello']);
  assert.equal(res.status, 0, res.stderr);
  assert.equal(res.stdout.trim(), '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824');
});

test('encodes and decodes base64', () => {
  const enc = run(['encode', 'base64', 'hello']);
  assert.equal(enc.status, 0, enc.stderr);
  assert.equal(enc.stdout.trim(), 'aGVsbG8=');
  const dec = run(['decode', 'base64', enc.stdout.trim()]);
  assert.equal(dec.status, 0, dec.stderr);
  assert.equal(dec.stdout.trim(), 'hello');
});

test('converts hex to rgb', () => {
  const res = run(['color', 'hex-to-rgb', '#22c55e']);
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /"r": 34/);
  assert.match(res.stdout, /"g": 197/);
  assert.match(res.stdout, /"b": 94/);
});

test('rejects invalid category', () => {
  const res = run(['nope', 'thing']);
  assert.notEqual(res.status, 0);
  assert.match(res.stderr, /Unknown category/);
});
