/**
 * Formula Generator AudioWorklet Processor
 * Generates audio samples based on mathematical formulas
 */

interface FormulaParams {
  gain: number;
  // FM
  fc: number;
  fm: number;
  I: number;
  // AM
  f1: number;
  f2: number;
  // Logistic
  base: number;
  depth: number;
  r: number;
  lfoHz: number;
  // Gliss
  f0: number;
  k: number;
  // Additive
  fund: number;
  N: number;
  move: number;
  // PM
  f: number;
  f2pm: number;
  // Beats
  fbeat: number;
  df: number;
  // Dist
  fd: number;
  alpha: number;
  // Quasi
  fq: number;
  Aq: number;
  wq: number;
  // Lorenz
  sigma: number;
  rho: number;
  beta: number;
  lBase: number;
  lFreqScale: number;
  lAmp: number;
  // Karplus-Strong
  ksFreq: number;
  ksDamp: number;
  ksBright: number;
  // Bitcrush
  bcFreq: number;
  bcBits: number;
  bcDown: number;
  // Noise LP
  nCut: number;
  // Pink noise
  pinkBright: number;
  // Brown noise
  brownStep: number;
  // Velvet noise
  velvetDensity: number;
  // Rossler
  rossA: number;
  rossB: number;
  rossC: number;
  rossBase: number;
  rossFreqScale: number;
  rossAmp: number;
  // Shepard
  shepBase: number;
  shepSpeed: number;
  shepOctaves: number;
}

type WorkletMessage =
  | { type: 'set'; params: Partial<FormulaParams> }
  | { type: 'reset' };

class FormulaGeneratorProcessor extends AudioWorkletProcessor {
  private formula: string;
  private sr: number;
  private t: number = 0;
  private phase: number = 0;

  // Logistic state
  private logi: number = 0.33;

  // Lorenz state
  private lx: number = 0.1;
  private ly: number = 0.0;
  private lz: number = 0.0;

  // Karplus-Strong state
  private ksBuf: Float32Array | null = null;
  private ksIdx: number = 0;
  private ksN: number = 0;

  // Noise LP state
  private nlp: number = 0;

  // Pink noise state (Paul Kellet's approximation)
  private pinkB0: number = 0;
  private pinkB1: number = 0;
  private pinkB2: number = 0;
  private pinkB3: number = 0;
  private pinkB4: number = 0;
  private pinkB5: number = 0;
  private pinkB6: number = 0;

  // Brown noise state
  private brownVal: number = 0;

  // Velvet noise state
  private velvetCounter: number = 0;
  private velvetNext: number = 0;

  // Rossler attractor state
  private rx: number = 0.1;
  private ry: number = 0.0;
  private rz: number = 0.0;

  // Shepard tone phase accumulators
  private shepardPhases: Float32Array = new Float32Array(10);
  private shepardT: number = 0;

  // Parameters
  private p: FormulaParams;

  constructor(options?: AudioWorkletNodeOptions) {
    super();
    const o = options?.processorOptions || {};
    this.formula = o.formula || 'fm';
    this.sr = sampleRate;

    this.p = {
      gain: 0.2,
      fc: 220,
      fm: 2,
      I: 2,
      f1: 220,
      f2: 221,
      base: 110,
      depth: 330,
      r: 3.86,
      lfoHz: 40,
      f0: 55,
      k: 0.15,
      fund: 110,
      N: 12,
      move: 0.35,
      f: 220,
      f2pm: 3,
      fbeat: 220,
      df: 0.8,
      fd: 110,
      alpha: 3.0,
      fq: 120,
      Aq: 220,
      wq: 0.8,
      sigma: 10,
      rho: 28,
      beta: 2.6667,
      lBase: 120,
      lFreqScale: 40,
      lAmp: 0.25,
      ksFreq: 110,
      ksDamp: 0.985,
      ksBright: 0.5,
      bcFreq: 220,
      bcBits: 6,
      bcDown: 8,
      nCut: 800,
      pinkBright: 0.5,
      brownStep: 0.02,
      velvetDensity: 2000,
      rossA: 0.2,
      rossB: 0.2,
      rossC: 5.7,
      rossBase: 120,
      rossFreqScale: 30,
      rossAmp: 0.25,
      shepBase: 55,
      shepSpeed: 0.1,
      shepOctaves: 6,
      ...o.params,
    };

    this.port.onmessage = (e: MessageEvent<WorkletMessage>) => {
      const msg = e.data;
      if (msg.type === 'set') {
        Object.assign(this.p, msg.params);
      } else if (msg.type === 'reset') {
        this.resetState();
      }
    };

    this.initKS(true);
  }

  private clamp(x: number, a: number, b: number): number {
    return Math.max(a, Math.min(b, x));
  }

  private resetState(): void {
    this.t = 0;
    this.phase = 0;
    this.logi = 0.33;
    this.lx = 0.1;
    this.ly = 0.0;
    this.lz = 0.0;
    this.nlp = 0;
    this.initKS(true);
    // Reset pink noise
    this.pinkB0 = 0;
    this.pinkB1 = 0;
    this.pinkB2 = 0;
    this.pinkB3 = 0;
    this.pinkB4 = 0;
    this.pinkB5 = 0;
    this.pinkB6 = 0;
    // Reset brown noise
    this.brownVal = 0;
    // Reset velvet noise
    this.velvetCounter = 0;
    this.velvetNext = 0;
    // Reset Rossler
    this.rx = 0.1;
    this.ry = 0.0;
    this.rz = 0.0;
    // Reset Shepard
    for (let i = 0; i < this.shepardPhases.length; i++) {
      this.shepardPhases[i] = 0;
    }
    this.shepardT = 0;
  }

  private initKS(force: boolean): void {
    const p = this.p;
    const freq = Math.max(20, p.ksFreq || 110);
    const N = Math.max(2, Math.floor(this.sr / freq));
    if (!force && this.ksBuf && this.ksN === N) return;
    this.ksN = N;
    this.ksBuf = new Float32Array(N);
    this.ksIdx = 0;
    for (let i = 0; i < N; i++) {
      this.ksBuf[i] = Math.random() * 2 - 1;
    }
  }

  process(
    _inputs: Float32Array[][],
    outputs: Float32Array[][],
    _parameters: Record<string, Float32Array>
  ): boolean {
    const out = outputs[0];
    const ch0 = out[0];
    const n = ch0.length;
    const sr = this.sr;
    const twoPi = 2 * Math.PI;

    const p = this.p;
    let phase = this.phase;
    let t = this.t;
    let logi = this.logi;
    let lx = this.lx,
      ly = this.ly,
      lz = this.lz;
    let nlp = this.nlp;

    for (let i = 0; i < n; i++) {
      let x = 0;

      switch (this.formula) {
        case 'fm':
          x = Math.sin(twoPi * p.fc * t + p.I * Math.sin(twoPi * p.fm * t));
          break;

        case 'logistic': {
          const step = Math.max(1, Math.floor(sr / Math.max(1e-3, p.lfoHz)));
          if (i % step === 0) {
            logi = p.r * logi * (1 - logi);
            logi = this.clamp(logi, 0, 1);
          }
          const f = p.base + p.depth * (logi - 0.5);
          phase += twoPi * (Math.max(0, f) / sr);
          x = Math.sin(phase);
          break;
        }

        case 'gliss': {
          const f = p.f0 * Math.exp(p.k * t);
          phase += twoPi * (f / sr);
          x = Math.sin(phase);
          break;
        }

        case 'additive': {
          const fund = p.fund;
          const N = Math.max(1, Math.floor(p.N));
          const move = p.move;
          let s = 0;
          for (let k = 1; k <= N; k++) {
            const ak = (1 / k) * Math.sin(twoPi * move * t + k);
            s += ak * Math.sin(twoPi * (k * fund) * t);
          }
          x = s * (1.0 / Math.log2(N + 1));
          break;
        }

        case 'pm': {
          const phi = Math.sin(Math.sin(twoPi * p.f2pm * t));
          x = Math.sin(twoPi * p.f * t + phi * 5.0);
          break;
        }

        case 'beats':
          x =
            0.5 *
            (Math.sin(twoPi * p.fbeat * t) +
              Math.sin(twoPi * (p.fbeat + p.df) * t));
          break;

        case 'dist':
          x = Math.tanh(p.alpha * Math.sin(twoPi * p.fd * t));
          break;

        case 'quasi': {
          const mod = Math.sin(Math.sin(Math.sin(p.wq * t)));
          const f = Math.max(0, p.fq + p.Aq * mod);
          phase += twoPi * (f / sr);
          x = Math.sin(phase);
          break;
        }

        case 'lorenz': {
          const dt = 1 / sr;
          const dx = p.sigma * (ly - lx);
          const dy = lx * (p.rho - lz) - ly;
          const dz = lx * ly - p.beta * lz;
          lx += dx * dt;
          ly += dy * dt;
          lz += dz * dt;

          const freq = Math.max(0, p.lBase + p.lFreqScale * Math.abs(lx));
          const amp = this.clamp(
            p.lAmp * (0.3 + 0.7 * (0.5 + 0.5 * Math.tanh(ly))),
            0,
            1
          );
          phase += twoPi * (freq / sr);
          x = amp * Math.sin(phase);
          break;
        }

        case 'karplus': {
          this.initKS(false);
          const buf = this.ksBuf!;
          const N = this.ksN;
          const idx = this.ksIdx;
          const y0 = buf[idx];
          const y1 = buf[(idx + 1) % N];
          const damp = this.clamp(p.ksDamp, 0.8, 0.99999);
          const bright = this.clamp(p.ksBright, 0, 1);
          const avg = 0.5 * (y0 + y1);
          const next = damp * (bright * y0 + (1 - bright) * avg);
          buf[idx] = next;
          this.ksIdx = (idx + 1) % N;
          x = y0;
          break;
        }

        case 'noiselp': {
          const white = Math.random() * 2 - 1;
          const cut = this.clamp(p.nCut, 20, 18000);
          const a = 1 - Math.exp((-2 * Math.PI * cut) / sr);
          nlp = nlp + a * (white - nlp);
          x = nlp;
          break;
        }

        case 'pinknoise': {
          const white = Math.random() * 2 - 1;
          this.pinkB0 = 0.99886 * this.pinkB0 + white * 0.0555179;
          this.pinkB1 = 0.99332 * this.pinkB1 + white * 0.0750759;
          this.pinkB2 = 0.969 * this.pinkB2 + white * 0.153852;
          this.pinkB3 = 0.8665 * this.pinkB3 + white * 0.3104856;
          this.pinkB4 = 0.55 * this.pinkB4 + white * 0.5329522;
          this.pinkB5 = -0.7616 * this.pinkB5 - white * 0.016898;
          const pink =
            this.pinkB0 +
            this.pinkB1 +
            this.pinkB2 +
            this.pinkB3 +
            this.pinkB4 +
            this.pinkB5 +
            this.pinkB6 +
            white * 0.5362;
          this.pinkB6 = white * 0.115926;
          const bright = this.clamp(p.pinkBright, 0, 1);
          x = pink * 0.11 * (1 - bright) + white * bright * 0.5;
          break;
        }

        case 'brownnoise': {
          const white = Math.random() * 2 - 1;
          const step = this.clamp(p.brownStep, 0.001, 0.1);
          this.brownVal = this.clamp(this.brownVal + white * step, -1, 1);
          x = this.brownVal;
          break;
        }

        case 'velvetnoise': {
          const density = Math.max(100, p.velvetDensity);
          const avgSamples = sr / density;
          if (this.velvetCounter >= this.velvetNext) {
            x = Math.random() > 0.5 ? 1 : -1;
            this.velvetNext =
              this.velvetCounter + avgSamples * (0.5 + Math.random());
          } else {
            x = 0;
          }
          this.velvetCounter++;
          break;
        }

        case 'rossler': {
          const dt = 1 / sr;
          const a = p.rossA,
            b = p.rossB,
            c = p.rossC;
          const dx = -this.ry - this.rz;
          const dy = this.rx + a * this.ry;
          const dz = b + this.rz * (this.rx - c);
          this.rx += dx * dt * 100;
          this.ry += dy * dt * 100;
          this.rz += dz * dt * 100;
          this.rx = this.clamp(this.rx, -50, 50);
          this.ry = this.clamp(this.ry, -50, 50);
          this.rz = this.clamp(this.rz, -50, 50);

          const freq = Math.max(0, p.rossBase + p.rossFreqScale * this.rx);
          const amp = this.clamp(
            p.rossAmp * (0.3 + 0.7 * (0.5 + 0.02 * this.ry)),
            0,
            1
          );
          phase += twoPi * (freq / sr);
          x = amp * Math.sin(phase);
          break;
        }

        case 'shepard': {
          const baseF = Math.max(20, p.shepBase);
          const speed = p.shepSpeed;
          const octaves = Math.max(1, Math.min(10, Math.floor(p.shepOctaves)));
          const centerLog = Math.log2(440);
          const sigma = 1.5;

          this.shepardT += speed / sr;
          if (this.shepardT > 1) this.shepardT -= 1;

          let sum = 0;
          for (let k = 0; k < octaves; k++) {
            const freqMult = Math.pow(2, k + this.shepardT);
            const freq = baseF * freqMult;
            if (freq > 18000) continue;

            const logF = Math.log2(freq);
            const envelope = Math.exp(
              -0.5 * Math.pow((logF - centerLog) / sigma, 2)
            );

            this.shepardPhases[k] += twoPi * (freq / sr);
            if (this.shepardPhases[k] > twoPi) this.shepardPhases[k] -= twoPi;
            sum += envelope * Math.sin(this.shepardPhases[k]);
          }
          x = sum / Math.sqrt(octaves);
          break;
        }

        default:
          x = 0;
      }

      ch0[i] = x * (p.gain ?? 0.2);
      t += 1 / sr;
      if (phase > 1e9) phase %= twoPi;
    }

    this.phase = phase;
    this.t = t;
    this.logi = logi;
    this.lx = lx;
    this.ly = ly;
    this.lz = lz;
    this.nlp = nlp;

    return true;
  }
}

registerProcessor('formula-generator', FormulaGeneratorProcessor);
