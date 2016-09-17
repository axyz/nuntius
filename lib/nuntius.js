export default class Nuntius {
  constructor(bus, name, opts = { interval: 125, timeout: 5000 }) {
    this.interval = opts.interval;
    this.timeout = opts.timeout;
    this.bus = bus;
    this.name = name;
    this.bus.on(`${name}:ping`, (uid) => {
      this.bus.trigger(`${name}:pong`, uid);
    });
    this.pollings = new Map();
    this.fallbacks = new Map();
    this.listeners = new Map();
    this.pendings = new Set();
  }

  clear(uid, target) {
    if (this.listeners.get(uid)) {
      this.bus.off(`${target}:pong`, this.listeners.get(uid));
      this.listeners.delete(uid);
    }

    // clear ping polling
    clearInterval(this.pollings.get(uid));
    this.pollings.delete(uid);

    // clear fallback timeout
    clearTimeout(this.fallbacks.get(uid));
    this.fallbacks.delete(uid);
  }

  static generateUID() {
    // 60466176 is 36^5, 36 is numbers + letters
    return (`00000 ${(Math.random() * 60466176 << 0).toString(36)}`).slice(-5); // eslint-disable-line no-bitwise
  }

  ping(target, cb, fallback, opts = { timeout: this.timeout, interval: this.interval }) {
    const UID = this.generateUID();

    this.bus.trigger(`${target}:ping`, UID);
    this.pollings.set(UID, setInterval(() => {
      this.bus.trigger(`${target}:ping`, UID);
    }, opts.interval));

    this.fallbacks.set(UID, setTimeout(() => {
      this.clear(UID, target);
      if (fallback) fallback();
    }, opts.timeout));

    this.bus.once(`${target}:pong`, () => {
      this.clear(UID, target);
      if (cb) cb();
    });
  }

  send(event, target, data, fallback, opts = { timeout: this.timeout, interval: this.interval }) {
    const UID = this.generateUID();

    this.bus.trigger(`${target}:ping`, UID);
    this.pollings.set(UID, setInterval(() => {
      this.bus.trigger(`${target}:ping`, UID);
    }, opts.interval));

    this.fallbacks.set(UID, setTimeout(() => {
      this.clear(UID, target);
      if (fallback) fallback();
    }, opts.timeout));

    this.listeners.set(UID, (uid) => {
      if (uid !== UID) return;
      this.bus.trigger(`${target}:${event}`, {
        uid: UID,
        sender: this.name,
        clear: () => this.clear(UID, target),
        data,
      });
    });

    this.bus.on(`${target}:pong`, this.listeners.get(UID));
  }

  listen(event, cb) {
    this.bus.on(`${this.name}:${event}`, (msg) => {
      if (msg.uid && msg.sender) {
        // if event was already handled
        if (this.pendings.has(msg.uid)) return;

        const cbPromise = new Promise((resolve) => {
          // mark the event as pending
          this.pendings.add(msg.uid);
          resolve(cb(msg.data, msg.clear));
        });

        setImmediate(() => {
          cbPromise.then(() => {
            this.pendings.delete(msg.uid);
          });
        });
      } else {
        cb(msg, () => {});
      }
    });
  }
}
