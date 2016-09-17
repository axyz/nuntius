# nuntius
Reliable messaging protocol on top of any client-side JavaScript event bus.

Nuntius (messenger in Latin) is an abstraction layer that can be used on top of any client-side pub/sub event bus. With Nuntius You can create entities capable to send messages to other entities or listen for specific events without worrying about timing issues thanks to a custom retry policy and fallback strategies.

# Usage

## Creating entities
Nuntius is available as an UMD module on npm.
`$ npm install --save nuntius`

To create a new entity use the provided constructor:
```
import Nuntius from 'nuntius';

const messenger = new Nuntius(bus, name, options);
```

where `bus` should be an event bus instance that implements at least these methods:

- on(event: string, callback: function(msg)) // to fire a callback on an event
- off(event: string, callback: function(msg)) // to stop firing the callback on the specified event
- once(event: string, callback: function(msg)) // to fire a callback only once on a specified event
- trigger(event: string, msg: any) // to trigger an event providing a payload

Nuntius is battle tested and used in prouction with [happened](https://github.com/grassator/happened), but it should work correctly with any event-bus implementation (also basic node EventEmitter).

If your event bus uses different name for these core functions you can override the names in the options.
```
const messenger = new Nuntius(myBus, 'messenger', {
  onFunction: 'listen',
  offFunction: 'forget',
  onceFunction: 'listenOnce',
  triggerFunction: 'send',
});
```

## Listening for messages
`listen(event: string, callback: function({ data: any }))`
will subscribe to a specific message type.

```
const messenger = new Nuntius(bus, 'messenger');

messenger.listen('hello', (data, done) => {
  console.log(`Hello from messenger, ${data.name}`);
  done() // callback to notify that the message has been correctly handled.
});
```

N.B. `done` has to be called in order to stop the retry and avoid the fallback function to be executed.
You can also have your own logic to decide to calling it or not (e.g. you may have multiple entities of the same type and use a unique id in the message payload to be checked in order to handle or not the message, this way the retry will keep going until the correct entity will handle the event).

## Sending messages
`send(event: string, target: string, data: any, fallback: function, options)`
will send a message(`event`) to the `target` entity with `data` as the payload.

```
const entity = new Nuntius(bus, 'entity');

entity.send('hello', 'messenger', { name: 'Andrea' }, () => {
  // fallback function
  console.log('sorry it was not possible to deliver the message');
});
```

In this example we are sending a `hello` message to the `messenger` entity and our name as a payload.
A fallback function is also provided in the case the other entity do not exist or do not listen on that message type, or whatever possible reason for the message not to be delivered.

## Custom retry interval an timeout
By default Nuntius will try to send the message every 100ms until it get handled correctly by the target entity. After a timeout of 5s it stops trying and executes the fallback function.

These default values can be overridden both on the entity constructor:
```
const messenger = new Nuntius(myBus, 'messenger', {
  interval: 50, // retry interval in ms
  timeout: 1000, // timeout in ms
});
```

or for a specific send:
```
entity.send('hello', 'messenger', { name: 'Andrea' }, () => {
  // fallback function
  console.log('sorry it was not possible to deliver the message');
}, {
  interval: 250,
  timeout: 2000,
});
```

## Pinging entities
A `ping(target: string, callback, fallback, options)` function is also provided in order to ping an entity to check its existence, if it gets a response from the entity, then the callback function will be executed, otherwise after the timeout the fallback will be executed.

Interval and timeout can be overridden as for the `send` function.

## How does it work
Basically when an Entity gets created it will immediately subscribe to the `entityName:ping` event and will trigger a `entityName:pong` event for every incoming `ping`.

`listen(event, cb)` will subscribe to the `entityName:event` in order to execute the callback.

`send(event, target, data, fallback)` at first will try to ping the target, then as soon as it receives the `target:pong` event it will try to send the `target:event` event.

Under the hood Nuntius makes sure that messages are handled only once and that fallback are executed only after real failures.

Note that Nuntius will not break the compatibility with your event bus: if you want you can directly send events from the bus:
```
bus.trigger('messenger:hello',  { name: 'Andrea' })
```

this way however you will not have any retry policy or fallback strategy.
