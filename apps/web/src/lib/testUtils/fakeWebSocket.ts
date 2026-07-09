type Listener = (event: { data: string }) => void;
type SimpleListener = () => void;

// Mirrors the real WebSocket readyState values closely enough for these tests.
const CONNECTING = 0;
const OPEN = 1;

export class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  static readonly CONNECTING = CONNECTING;
  static readonly OPEN = OPEN;

  url: string;
  sent: string[] = [];
  closed = false;
  readyState = CONNECTING;
  private listeners = new Map<string, Set<Listener>>();
  private openListeners = new Set<SimpleListener>();

  constructor(url: string) {
    this.url = url;
    FakeWebSocket.instances.push(this);
  }

  addEventListener(type: string, listener: Listener | SimpleListener): void {
    if (type === "open") {
      this.openListeners.add(listener as SimpleListener);
      return;
    }
    let set = this.listeners.get(type);
    if (!set) {
      set = new Set();
      this.listeners.set(type, set);
    }
    set.add(listener as Listener);
  }

  removeEventListener(type: string, listener: Listener | SimpleListener): void {
    if (type === "open") {
      this.openListeners.delete(listener as SimpleListener);
      return;
    }
    this.listeners.get(type)?.delete(listener as Listener);
  }

  send(data: string): void {
    if (this.readyState !== OPEN) {
      throw new Error("InvalidStateError: Still in CONNECTING state.");
    }
    this.sent.push(data);
  }

  close(): void {
    this.closed = true;
  }

  /** Simulates the connection finishing, as real browsers do asynchronously after `new WebSocket(...)`. */
  emitOpen(): void {
    this.readyState = OPEN;
    for (const listener of this.openListeners) {
      listener();
    }
  }

  emitMessage(data: unknown): void {
    this.emitRaw(JSON.stringify(data));
  }

  emitRaw(rawData: string): void {
    const event = { data: rawData };
    for (const listener of this.listeners.get("message") ?? []) {
      listener(event);
    }
  }

  static reset(): void {
    FakeWebSocket.instances = [];
  }

  static latest(): FakeWebSocket {
    const instance = FakeWebSocket.instances.at(-1);
    if (!instance) throw new Error("No FakeWebSocket instance was created");
    return instance;
  }
}
