import * as rf from './FCMreference.js'
import { getSubSlotsForEmployee } from './FCMrules.js'

// Employees are a flat shared pool, not manager-owned subtrees. Empty trailing
// cells are harmless, but an occupied cell outside real capacity is not.
export function isLegalTrainingOrganization(employees, ceoSlots) {
 if (!Number.isInteger(ceoSlots) || ceoSlots < 0) return false
 const capacity = ceoSlots + employees.slice(0, ceoSlots).reduce((n,e) => n + (e < 0 ? 0 : getSubSlotsForEmployee(e)), 0)
 return employees.every((e,i) => Number.isInteger(e) && e >= -1 && (e === -1 || (i < capacity && (!rf.MANAGERS.includes(e) || i < ceoSlots))))
}

// Restore the pre-training organization before validating it, then replace all
// accepted on-duty records exactly once. No real store or inventory is mutated.
export function previewTrainingOrganization(player, pending = [], source = null, target = null) {
 const original = [...player.employees]
 const replacements = []
 for (const entry of pending.filter(e => e.fromStructure)) {
  const index = entry.structureIndex === undefined ? original.length : entry.structureIndex
  if (!Number.isInteger(index) || index < 0 || (entry.structureIndex !== undefined && original[index] !== -1)) return {legal:false,reason:'pending-source'}
  original[index] = entry.from
  replacements.push([index,entry.to])
 }
 if (!isLegalTrainingOrganization(original,player.ceoSlots)) return {legal:false,reason:'invalid-organization'}
 if (source) {
  const index = source.sourceIndex === undefined ? player.employees.indexOf(source.employee) : source.sourceIndex
  if (!Number.isInteger(index) || index < 0 || player.employees[index] !== source.employee) return {legal:false,reason:'missing-source'}
  replacements.push([index,target])
 }
 const completed = [...original]
 for (const [index,to] of replacements) completed[index] = to
 const capacity = player.ceoSlots + completed.slice(0,player.ceoSlots).reduce((n,e)=>n+(e < 0 ? 0 : getSubSlotsForEmployee(e)),0)
 const overflow = completed.slice(capacity).filter(e=>e !== -1)
 const employees = Array.from({length:capacity},(_,i)=>completed[i] ?? -1)
 for (const employee of overflow) {
  const index = employees.findIndex((e,i)=>e === -1 && (!rf.MANAGERS.includes(employee) || i < player.ceoSlots))
  if (index === -1) return {legal:false,reason:'insufficient-slots'}
  employees[index] = employee
 }
 if (!isLegalTrainingOrganization(employees,player.ceoSlots)) return {legal:false,reason:'invalid-completion'}
 return {legal:true,reason:null,employees}
}
