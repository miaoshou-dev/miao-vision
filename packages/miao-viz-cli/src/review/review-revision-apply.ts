import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, extname, join } from 'node:path'
import * as YAML from 'yaml'
import type { PatchSet, RevisionRequest } from './review-revision'

export function writeRevisionSpec(request: RevisionRequest, patchSet: PatchSet): string {
  const source = request.sourceSpecPath
  const extension = extname(source).toLowerCase()
  const document = extension === '.json' ? JSON.parse(readFileSync(source, 'utf8')) : YAML.parse(readFileSync(source, 'utf8'))
  if (!document || typeof document !== 'object' || Array.isArray(document)) throw new Error('Source Spec must be an object.')
  for (const operation of patchSet.operations) replaceAtPath(document as Record<string, unknown>, operation.path, operation.value)
  const directory = join(dirname(source), '.miao-review', request.revisionId)
  mkdirSync(directory, { recursive: true })
  const output = join(directory, `spec${extension === '.json' ? '.json' : '.yaml'}`)
  writeFileSync(output, extension === '.json' ? JSON.stringify(document, null, 2) : YAML.stringify(document), 'utf8')
  return output
}

export function revisionOutputPath(request: RevisionRequest, originalOutput: string): string {
  const extension = extname(originalOutput) || '.html'
  return join(dirname(request.sourceSpecPath), '.miao-review', request.revisionId, `artifact${extension}`)
}

function replaceAtPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.match(/[^.\[\]]+/g) ?? []
  if (!parts.length) throw new Error(`Invalid patch path: ${path}`)
  let node: unknown = root
  for (const part of parts.slice(0, -1)) {
    const key = Number.isInteger(Number(part)) ? Number(part) : part
    if (!node || typeof node !== 'object' || !(key in node)) throw new Error(`Patch path does not exist: ${path}`)
    node = (node as Record<string | number, unknown>)[key]
  }
  const last = parts.at(-1)!
  const key = Number.isInteger(Number(last)) ? Number(last) : last
  if (!node || typeof node !== 'object') throw new Error(`Patch path does not exist: ${path}`)
  ;(node as Record<string | number, unknown>)[key] = value
}
