import assert from 'node:assert/strict'
import test from 'node:test'
import { chmodSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { resolveCli } from './runtime.mjs'

test('Pi accepts compatible non-recommended global CLI and requires Viewer capability', { skip: process.platform === 'win32' }, () => {
  const root = mkdtempSync(join(tmpdir(), 'pi-global-cli-'))
  const executable = join(root, 'miao-viz')
  const original = process.env.PATH
  try {
    process.env.PATH = `${root}:${original}`
    writeFileSync(executable, '#!/bin/sh\nif [ "$1" = "--version" ]; then echo 0.9.5; else echo "$*"; fi\n')
    chmodSync(executable, 0o755)
    assert.equal(resolveCli().version, '0.9.5')
    writeFileSync(executable, '#!/bin/sh\ncase "$1" in --version) echo 0.9.5;; review) exit 1;; *) echo "$*";; esac\n')
    assert.throws(() => resolveCli(), /capabilities required/)
  } finally { process.env.PATH = original; rmSync(root, { recursive: true, force: true }) }
})
