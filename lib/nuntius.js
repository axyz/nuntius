const DEFAULT_OPTIONS = {
  interval: 100,
  timeout: 5000,
  onFunction: 'on',
  offFunction: 'off',
  onceFunction: 'once',
  triggerFunction: 'trigger',
};

export default class Nuntius {
  constructor(bus, name, opts = {}) {
    this.opts = { ...DEFAULT_OPTIONS, ...opts };
    this.interval = opts.interval;
    this.timeout = opts.timeout;
    this.bus = bus;
    this.name = name;
    this.bus[this.opts.onFunction](`${name}:ping`, (uid) => {
      this.bus[this.opts.triggerFunction](`${name}:pong`, uid);
    });
    this.pollings = new Map();
    this.fallbacks = new Map();
    this.listeners = new Map();
    this.pendings = new Set();
  }

  clear(uid, target) {
    if (this.listeners.get(uid)) {
      this.bus[this.opts.offFunction](`${target}:pong`, this.listeners.get(uid));
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
    const UID = Nuntius.generateUID();

    this.bus[this.opts.triggerFunction](`${target}:ping`, UID);
    this.pollings.set(UID, setInterval(() => {
      this.bus[this.opts.triggerFunction](`${target}:ping`, UID);
    }, opts.interval));

    this.fallbacks.set(UID, setTimeout(() => {
      this.clear(UID, target);
      if (fallback) fallback();
    }, opts.timeout));

    this.bus[this.opts.onceFunction](`${target}:pong`, () => {
      this.clear(UID, target);
      if (cb) cb();
    });
  }

  send(event, target, data, fallback, opts = { timeout: this.timeout, interval: this.interval }) {
    const UID = Nuntius.generateUID();

    this.bus[this.opts.triggerFunction](`${target}:ping`, UID);
    this.pollings.set(UID, setInterval(() => {
      this.bus[this.opts.triggerFunction](`${target}:ping`, UID);
    }, opts.interval));

    this.fallbacks.set(UID, setTimeout(() => {
      this.clear(UID, target);
      if (fallback) fallback();
    }, opts.timeout));

    this.listeners.set(UID, (uid) => {
      if (uid !== UID) return;
      this.bus[this.opts.triggerFunction](`${target}:${event}`, {
        uid: UID,
        sender: this.name,
        clear: () => this.clear(UID, target),
        data,
      });
    });

    this.bus[this.opts.onFunction](`${target}:pong`, this.listeners.get(UID));
  }

  listen(event, cb) {
    this.bus[this.opts.onFunction](`${this.name}:${event}`, (msg = {}) => {
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

  broadcast(event, data) {
    this.bus[this.opts.triggerFunction](event, data);
  }
}
