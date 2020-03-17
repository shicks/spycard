const IM1 = 2147483563;
const IM2 = 2147483399;
const AM = 1 / IM1;
const IMM1 = IM1 - 1;
const IA1 = 40014;
const IA2 = 40692;
const IQ1 = 53668;
const IQ2 = 52774;
const IR1 = 12211;
const IR2 = 3791;
const NTAB = 32;
const NDIV = 1 + Math.floor(IMM1 / NTAB);
const EPS = 1.2e-7;
const RNMX = 1 - EPS;

class Random {

  // Returns a new seed at random, using the system PRNG.
  static newSeed() {
    return Math.floor(Math.random() * 0x100000000);
  }

  constructor(seed = Math.floor(Math.random() * 0x100000000)) {
    this.idum = 0;
    this.idum2 = 0;
    this.iy = 0;
    this.iv = [];
    this.z1 = null; // extra normal deviate
    this.seed(seed);
  }

  seed(seed) {
    this.idum = Math.max(1, Math.floor(seed));
    this.idum2 = this.idum;
    this.iy = 0;
    this.iv = new Array(NTAB).fill(0);
    for (let j = NTAB + 7; j >= 0; j--) {
      const k = Math.floor(this.idum / IQ1);
      this.idum = IA1 * (this.idum - k * IQ1) - k * IR1;
      if (this.idum < 0) this.idum += IM1;
      if (j < NTAB) this.iv[j] = this.idum;
    }
    this.iy = this.iv[0];
  }

  next() {
    let k = Math.floor(this.idum / IQ1);
    this.idum = IA1 * (this.idum - k * IQ1) - k * IR1;
    if (this.idum < 0) this.idum += IM1;
    k = Math.floor(this.idum2 / IQ2);
    this.idum2 = IA2 * (this.idum2 - k * IQ2) - k * IR2;
    if (this.idum2 < 0) this.idum2 += IM2;
    const j = Math.floor(this.iy / NDIV);
    this.iy = this.iv[j] - this.idum2;
    this.iv[j] = this.idum;
    if (this.iy < 1) this.iy += IMM1;
    return Math.min(AM * this.iy, RNMX);
  }

  nextInt(n) {
    return Math.floor(this.next() * n);
  }

  nextNormal(mean = 0, stdev = 1, min = -Infinity, max = Infinity) {
    while (true) {
      let z = this.z1;
      if (z == null) {
        const r = Math.sqrt(-2 * Math.log(this.next()));
        const theta = TWOPI * this.next();
        z = r * Math.cos(theta);
        this.z1 = r * Math.sin(theta);
      } else {
        this.z1 = null;
      }
      z = mean + z * stdev;
      if (z >= min && z <= max) return z;
    }
  }

  shuffle(array) {
    for (let i = array.length; i;) {
      const j = this.nextInt(i--);
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  /** Does not destroy the input iterable. */
  * ishuffle(iterable) {
    const arr = [];
    if (!Array.isArray(iterable)) {
      if (hasSize(iterable)) {
        const iter = iterable[Symbol.iterator]();
        for (let i = 0; i < iterable.size; i++) {
          const j = this.nextInt(iterable.size - i);
          const k = Math.max(i, j);
          while (arr.length <= k) {
            arr.push(iter.next().value);
          }
          yield arr[j];
          arr[j] = arr[i];
        }
        return; // TODO - why was this not required?
      } else {
        iterable = [...iterable];
      }
    }
    if (!Array.isArray(iterable)) throw new Error('impossible');
    for (let i = 0; i < iterable.length; i++) {
      const j = i + this.nextInt(iterable.length - i);
      yield j in arr ? arr[j] : iterable[j];
      arr[j] = i in arr ? arr[i] : iterable[i];
    }
  }

  pick(arr) {
    if (!arr.length) throw new Error('empty array');
    return arr[this.nextInt(arr.length)];
  }

  pickWeighted(arr) {
    if (!arr.length) throw new Error('empty array');
    let total = 0;
    for (const [weight] of arr) total += weight;
    let choice = this.next() * total;
    for (const [weight, elem] of arr) {
      if (choice < weight) return elem;
      choice -= weight;
    }
    throw new Error('bad weights');
  }

  bitGenerator() {
    let bits = 0;
    let next = 0;
    return () => {
      if (!bits) {
        bits = 32;
        next = this.nextInt(0x100000000);
      }
      bits--;
      const result = !(next & 1);
      next >>>= 1
      return result;
    };
  }
}

function hasSize(iter) {
  return 'size' in iter;
}

const TWOPI = 2 * Math.PI;

function shuffle(seed) {
  if (!seed) {
    seed = Random.newSeed();
    window.location.hash = seed.toString(16);
  }
  const grid = document.getElementById('grid');
  function repl(count, instance) {
    return new Array(count).fill(instance);
  }
  const random = new Random(seed);
  const colors =
      [...repl(8, 'red'), ...repl(8, 'blue'), ...repl(7, ''), 'black'];
  const first = random.pick(['red', 'blue']);
  colors.push(first);
  random.shuffle(colors);
  while (grid.children.length) {
    grid.children[0].remove();
  }
  const top = document.createElement('div');
  top.dataset['color'] = first;
  top.textContent = `first: ${first}`;
  grid.appendChild(top);
  for (const color of colors) {
    const child = document.createElement('div');
    child.dataset['color'] = color;
    grid.appendChild(child);
  }
}
document.getElementById('shuffle').addEventListener('click', () => shuffle());

window.onhashchange = () => {
  shuffle(parseInt((window.location.hash || '').substring(1), 16));
}
window.onhashchange();
