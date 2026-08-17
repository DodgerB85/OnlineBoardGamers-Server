import { toRaw, isReactive, isRef } from "vue"

export function indexArray(count) {
	let res = new Array()
	for (let i = 0; i < count; i++) res.push(i)
	return res
}

export function makeArrayOfSizeWithFill(count, value) {
	let arr = new Array(count).fill(value)
	return arr
}

export function getByIndices(arr, indices) {
	let res = []
	for (const i of indices) res.push(arr[i])
	return res
}

export function indicesOf(arr, cond) {
	let res = new Array()
	for (let i = 0; i < arr.length; i++) if (cond(arr[i])) res.push(i)
	return res
}

export function arraysEqual(a, b) {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (a[i] !== b[i]) return false
	}
	return true
}

// Could crash on circular references
export function deepCloneValue(value) {
  // 1. Instantly return primitives or null
  if (value === null || typeof value !== "object") {
    return value
  }

  // 2. Unpack Pinia store state if passed directly
  //let current = value.$state ? value.$state : value
  let current = value

  // FIX 2: Check reactivity independently on EVERY iteration loop
  if (isRef(current)) {
    return deepCloneValue(current.value)
  }
  
  if (isReactive(current)) {
    current = toRaw(current)
  }

  // 4. Handle Arrays recursively
  if (Array.isArray(current)) {
    return current.map((item) => deepCloneValue(item))
  }

  // 5. Handle standard plain Objects recursively
  const clone = {}
  for (const key of Object.keys(current)) {
    clone[key] = deepCloneValue(current[key])
  }

  return clone
}

// CAUTION!!! THIS WILL MAKE [0,0,0,1] equivalent to [0,1,1,1]
// but doesn't matter if entries are unique
// NB the FIRST array is checked in order. So [1,1] will truthy with [0,1]
// So put [0,1] first if needed
export function arraysEquivalent(a, b) {
	if (a.length !== b.length) return false
	for (let i = 0; i < a.length; i++) {
		if (!b.includes(a[i])) return false
	}
	return true
}

export function indexOf(arr, value) {
	for (let i = 0; i < arr.length; i++) if (arr[i] === value) return i
	return arr.length
}

export function indexOfArrayInArray(arrays, arr) {
	for (let i = 0; i < arrays.length; i++) {
		if (arraysEqual(arrays[i], arr)) return i
	}
	return arrays.length
}

export function includesArray(arrays, arr) {
	return indexOfArrayInArray(arrays, arr) < arrays.length
}

export function boolFilter(arr, bools) {
	let res = []
	for (let i = 0; i < bools.length; i++) {
		if (bools[i]) res.push(arr[i])
	}
	return res
}

export function uniqueOnly(arr) {
	return [...new Set(arr)]
}

export function isNumber(value) {
	return typeof value === "number"
}

export function makeUniqueSubarrays(arrays) {
	let res = []
	for (const arr of arrays) {
		if (!includesArray(res, arr)) {
			res.push(arr)
		}
	}
	return res
}
