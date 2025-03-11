// ref: https://github.com/turbomaze/JS-Fourier-Image-Analysis/blob/master/js/fourier.js

export class Complex {
    real: number;
    imag: number;

    constructor(re: number, im: number) {
        this.real = re;
        this.imag = im;
    }

    magnitude2(): number {
        return this.real * this.real + this.imag * this.imag;
    }

    magnitude(): number {
        return Math.sqrt(this.magnitude2());
    }

    plus(z: Complex): Complex {
        return new Complex(this.real + z.real, this.imag + z.imag);
    }

    minus(z: Complex): Complex {
        return new Complex(this.real - z.real, this.imag - z.imag);
    }

    times(z: Complex | number): Complex {
        if (typeof z === 'object') { // complex multiplication
            const rePart = this.real * z.real - this.imag * z.imag;
            const imPart = this.real * z.imag + this.imag * z.real;
            return new Complex(rePart, imPart);
        } else { // scalar multiplication
            return new Complex(z * this.real, z * this.imag);
        }
    }
}

function cisExp(x: number): Complex { // e^ix = cos x + i*sin x
    return new Complex(Math.cos(x), Math.sin(x));
}

function filter(data: Complex[], dims: [number, number], lowPass: number, highPass: number): void {
    const lowPassSq = Math.pow(lowPass, 2);
    const highPassSq = Math.pow(highPass, 2);
    const N = dims[1];
    const M = dims[0];
    for (let k = 0; k < N; k++) {
        for (let l = 0; l < M; l++) {
            const idx = k * M + l;
            const d = Math.pow(k - M / 2, 2) + Math.pow(l - N / 2, 2);
            if (
                (d > lowPassSq && isNaN(highPass)) ||
                (d < highPassSq && isNaN(lowPass)) ||
                (d < lowPassSq && !isNaN(lowPass) && !isNaN(highPass)) ||
                (d > highPassSq && !isNaN(lowPass) && !isNaN(highPass))
            ) {
                data[idx] = new Complex(0, 0);
            }
        }
    }
}

function FFT(sig: number[], out: Complex[]): void {
    if (sig.length === 0) {
        const e = new Error("Cannot transform an image with size of zero.");
        e.name = "RangeError";
        throw e;
    }
    if (sig.length & (sig.length - 1)) {
        const e = new Error("Unimplemented: Only FFT of signals of length power of 2 supported by this implementation. Given: " + sig.length);
        e.name = "RangeError";
        throw e;
    }
    rec_FFT_radix2(out, 0, sig, 0, sig.length, 1);
}

function rec_FFT_radix2(out: Complex[], start: number, sig: number[], offset: number, N: number, s: number): void {
    if (N === 1) {
        out[start] = new Complex(sig[offset], 0); // array
    } else {
        rec_FFT_radix2(out, start, sig, offset, N / 2, 2 * s);
        rec_FFT_radix2(out, start + N / 2, sig, offset + s, N / 2, 2 * s);
        for (let k = 0; k < N / 2; k++) {
            const twiddle = cisExp(-2 * Math.PI * k / N);
            const t = out[start + k];
            out[start + k] = t.plus(twiddle.times(out[start + k + N / 2]));
            out[start + k + N / 2] = t.minus(twiddle.times(out[start + k + N / 2]));
        }
    }
}

function shiftFFT(transform: Complex[], dims: [number, number]): Complex[] {
    return flipRightHalf(halfShiftFFT(halfShiftFFT(transform, dims), dims), dims);
}

function unshiftFFT(transform: Complex[], dims: [number, number]): Complex[] {
    return halfShiftFFT(halfShiftFFT(flipRightHalf(transform, dims), dims), dims);
}

function halfShiftFFT(transform: Complex[], dims: [number, number]): Complex[] {
    const ret: Complex[] = [];
    const N = dims[1];
    const M = dims[0];
    for (let n = 0, vOff = N / 2; n < N; n++) {
        for (let m = 0; m < M / 2; m++) {
            const idx = vOff * dims[0] + m;
            ret.push(transform[idx]);
        }
        vOff += vOff >= N / 2 ? -N / 2 : (N / 2) + 1;
    }
    for (let n = 0, vOff = N / 2; n < N; n++) {
        for (let m = M / 2; m < M; m++) {
            const idx = vOff * dims[0] + m;
            ret.push(transform[idx]);
        }
        vOff += vOff >= N / 2 ? -N / 2 : (N / 2) + 1;
    }
    return ret;
}

function flipRightHalf(transform: Complex[], dims: [number, number]): Complex[] {
    const ret: Complex[] = [];
    const N = dims[1];
    const M = dims[0];
    for (let n = 0; n < N; n++) {
        for (let m = 0; m < M; m++) {
            const $n = m < M / 2 ? n : (N - 1) - n;
            const idx = $n * dims[0] + m;
            ret.push(transform[idx]);
        }
    }
    return ret;
}

export const Fourier = {
    Complex,
    transform: FFT,
    shift: shiftFFT,
    unshift: unshiftFFT,
    filter: filter
};