const CAPTURE_FRAME = 320;
const REPORT_EVERY = 1600;

class ArgusCaptureProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.ratio = sampleRate / options.processorOptions.targetRate;
    this.position = 0;
    this.frame = new Int16Array(CAPTURE_FRAME);
    this.filled = 0;
  }

  push(value) {
    const clamped = Math.max(-1, Math.min(1, value));
    this.frame[this.filled] = clamped < 0 ? clamped * 32768 : clamped * 32767;
    this.filled += 1;
    if (this.filled === CAPTURE_FRAME) {
      const out = this.frame.slice().buffer;
      this.port.postMessage(out, [out]);
      this.filled = 0;
    }
  }

  process(inputs) {
    const channel = inputs[0] && inputs[0][0];
    if (!channel) return true;
    if (this.ratio === 1) {
      for (let i = 0; i < channel.length; i += 1) this.push(channel[i]);
      return true;
    }
    while (this.position < channel.length) {
      const start = Math.floor(this.position);
      const end = Math.min(channel.length, Math.floor(this.position + this.ratio));
      let sum = 0;
      for (let i = start; i < end; i += 1) sum += channel[i];
      this.push(end > start ? sum / (end - start) : channel[start]);
      this.position += this.ratio;
    }
    this.position -= channel.length;
    return true;
  }
}

class ArgusPlayerProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super();
    this.step = options.processorOptions.sourceRate / sampleRate;
    this.capacity = options.processorOptions.sourceRate * 60;
    this.ring = new Float32Array(this.capacity);
    this.readAt = 0;
    this.writeAt = 0;
    this.phase = 0;
    this.played = 0;
    this.sinceReport = 0;
    this.pending = false;
    this.port.onmessage = (event) => {
      const data = event.data;
      if (data === 'flush') {
        this.played += this.available();
        this.readAt = this.writeAt;
        this.phase = 0;
        this.pending = false;
        this.port.postMessage({ played: this.played });
        return;
      }
      const samples = new Int16Array(data);
      for (let i = 0; i < samples.length; i += 1) {
        this.ring[this.writeAt % this.capacity] = samples[i] / 32768;
        this.writeAt += 1;
      }
      if (this.writeAt - this.readAt > this.capacity) this.readAt = this.writeAt - this.capacity;
      this.pending = true;
    };
  }

  available() {
    return this.writeAt - this.readAt;
  }

  process(_inputs, outputs) {
    const output = outputs[0][0];
    let consumed = 0;
    for (let i = 0; i < output.length; i += 1) {
      const available = this.available();
      if (available <= 0) {
        output[i] = 0;
        continue;
      }
      const current = this.ring[this.readAt % this.capacity];
      const next = available > 1 ? this.ring[(this.readAt + 1) % this.capacity] : current;
      output[i] = current + (next - current) * this.phase;
      this.phase += this.step;
      while (this.phase >= 1 && this.available() > 0) {
        this.phase -= 1;
        this.readAt += 1;
        consumed += 1;
      }
    }
    this.played += consumed;
    this.sinceReport += consumed;
    if (this.sinceReport >= REPORT_EVERY || (this.pending && this.available() <= 0)) {
      this.sinceReport = 0;
      const idle = this.pending && this.available() <= 0;
      if (idle) this.pending = false;
      this.port.postMessage({ played: this.played, idle });
    }
    return true;
  }
}

registerProcessor('argus-capture', ArgusCaptureProcessor);
registerProcessor('argus-player', ArgusPlayerProcessor);
