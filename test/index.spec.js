/* eslint-disable import/no-extraneous-dependencies */
import test from 'ava';
import Nuntius from '../index';

test('index should export Nuntius constructor', (t) => {
  t.is(typeof Nuntius, 'function');
  t.is(Nuntius.name, 'Nuntius');
});
