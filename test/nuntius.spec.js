/* eslint-disable import/no-extraneous-dependencies */
import test from 'ava';
import happened from 'happened';
import Nuntius from '../index';

const getBus = () => happened.create({
  scheduler: setImmediate,
});

const getNuntiusInstance = (name) => {
  const bus = getBus();
  const messenger = new Nuntius(bus, name, { interval: 10, timeout: 100 });

  return { messenger, bus };
};

test('should create Nuntius instances', (t) => {
  const { messenger } = getNuntiusInstance('test');
  t.true(messenger instanceof Nuntius);
});

test('should correctly set name property', (t) => {
  const { messenger } = getNuntiusInstance('test');
  t.is(messenger.name, 'test');
});

test.cb('should send ping messages', (t) => {
  const { messenger, bus } = getNuntiusInstance('test');
  const fallback = () => t.end('fallback should not be called');

  bus.on('target:ping', (uid) => {
    t.end(false, uid);
  });

  messenger.ping('target', null, fallback);
});

test.cb('send should try to ping target', (t) => {
  const { messenger, bus } = getNuntiusInstance('test');
  const fallback = () => t.end('fallback should not be called');

  bus.on('target:ping', (uid) => {
    t.end(false, uid);
  });

  messenger.send('event', 'target', 'DATA', fallback);
});

test.cb('when receiving a pong with wrong uid, the event should not be sent', (t) => {
  const { messenger, bus } = getNuntiusInstance('test');
  const fallback = () => t.end(false);

  bus.on('target:ping', () => {
    bus.trigger('target:pong', 'wrong uid');
  });

  bus.on('target:event', () => {
    t.end(true, 'event should not be sent');
  });

  messenger.send('event', 'target', 'DATA', fallback);
});

test.cb('when receiving a pong, the event should be sent', (t) => {
  const { messenger, bus } = getNuntiusInstance('test');
  const fallback = () => t.end('fallback should not be called');

  bus.on('target:ping', (uid) => {
    bus.trigger('target:pong', uid);
  });

  bus.on('target:event', (msg) => {
    t.is(msg.sender, 'test');
    t.is(msg.data, 'DATA');
    t.end(false, msg);
  });

  messenger.send('event', 'target', 'DATA', fallback);
});

test.cb('should listen to event with no data', (t) => {
  const { messenger, bus } = getNuntiusInstance('test');

    messenger.listen('event', (data) => {
      t.end(false);
    });

    bus.trigger('test:event');
});

test.cb('should broadcast events correctly', (t) => {
  const { messenger, bus } = getNuntiusInstance('test');

    bus.on('event', (msg) => {
      t.is(msg, 'DATA');
      t.end(false, msg);
    });

    messenger.broadcast('event', 'DATA');
});
