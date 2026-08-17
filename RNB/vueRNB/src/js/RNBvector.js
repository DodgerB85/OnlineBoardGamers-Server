
const dims = [0, 1]

export function sum(a, b) {
    return dims.map(n => a[n] + b[n])
}

export function subtract(a, b) {
    return dims.map(n => a[n] - b[n])
}

export function squaredLength(a) {
    return a.map(val => val * val).reduce((acc, val) => acc + val, 0)
}

export function length(a) {
    return Math.sqrt(squaredLength(a))
}

export function distance(a, b) {
    return length(subtract(a, b))
}

export function normal(a) {
    let len = length(a)
    return (len <= 0) ? [0, 0] : a.map(val => val / len)
}

export function scaleBy(k, a) {
    return a.map(val => k * val)
}

export function scaleTo(k, a) {
    return scaleBy(k, normal(a))
}
