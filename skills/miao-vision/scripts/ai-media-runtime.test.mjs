import assert from 'node:assert/strict'
import { chmod, mkdir, mkdtemp, readFile, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import test from 'node:test'
import {
  MediaError, buildAiArguments, inspectRuntime, loadCompatibility, parseAiCliVersion, parseNodeMajor,
  selectModel, validateGeneratedFiles, validateReferences, validateRequest
} from './ai-media-runtime.mjs'
import { runMediaGeneration } from './run-ai-media.mjs'

const config = loadCompatibility()
const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 0])
const mp4 = Buffer.from([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109])

async function fixture(kind = 'image', overrides = {}) {
  const root = await mkdtemp(join(tmpdir(), 'miao-media-'))
  const cwd = join(root, 'task')
  const outputDir = join(cwd, 'miao-vision', 'artifacts', `${kind}-fixture`)
  await mkdir(cwd, { recursive: true })
  const requestPath = join(root, 'request.json')
  const request = {
    schemaVersion: 1,
    kind,
    prompt: 'A clear visual story',
    promptMode: 'passthrough',
    qualityMode: 'standard',
    aspectRatio: '16:9',
    duration: kind === 'video' ? 8 : null,
    references: [],
    source: { kind: 'user_prompt' },
    ...overrides
  }
  await writeFile(requestPath, JSON.stringify(request))
  return { root, cwd, outputDir, requestPath, request }
}

function runtime(kind, model = selectModel(config, kind, 'standard')) {
  return async () => ({ ok: true, value: { executable: '/fake/ai', model, pricingSummary: 'test price' } })
}

test('parses Node versions and maps only configured models', () => {
  assert.equal(parseNodeMajor('v22.4.1'), 22)
  assert.equal(parseAiCliVersion('ai-cli 1.2.3'), '1.2.3')
  assert.equal(selectModel(config, 'image', 'standard'), config.image.model)
  assert.equal(selectModel(config, 'video', 'high'), config.video.models.high)
  assert.throws(() => selectModel(config, 'audio'), { code: 'MEDIA_KIND_INVALID' })
})

test('runtime distinguishes unsupported Node, missing key, missing model and invalid catalog', async () => {
  await assert.rejects(inspectRuntime('image', { config, nodeVersion: 'v20.1.0', env: {} }), { code: 'NODE_VERSION_UNSUPPORTED' })
  await assert.rejects(inspectRuntime('image', { config, nodeVersion: 'v22.1.0', env: {}, executable: '/fake/ai' }), { code: 'MEDIA_CREDENTIAL_MISSING' })
  const base = { config, nodeVersion: 'v22.1.0', env: { AI_GATEWAY_API_KEY: 'do-not-log-this' }, executable: '/fake/ai' }
  await assert.rejects(inspectRuntime('image', { ...base, runner: async (_exe, args) => args[0] === '--version' ? { code: 0, stdout: '1.0.0' } : { code: 1, stdout: '{}' } }), { code: 'MEDIA_MODEL_UNAVAILABLE' })
  await assert.rejects(inspectRuntime('image', { ...base, runner: async (_exe, args) => args[0] === '--version' ? { code: 0, stdout: '1.0.0' } : { code: 0, stdout: 'bad-json' } }), { code: 'MODEL_CATALOG_UNAVAILABLE' })
})

test('runtime resolves a fake ai executable from PATH without exposing the key', async () => {
  const root = await mkdtemp(join(tmpdir(), 'fake-ai-'))
  const executable = join(root, 'ai')
  await writeFile(executable, '#!/bin/sh\nexit 0\n')
  await chmod(executable, 0o755)
  const calls = []
  const result = await inspectRuntime('image', {
    config,
    env: { PATH: root, AI_GATEWAY_API_KEY: 'super-secret' },
    runner: async (_exe, args) => {
      calls.push(args)
      return args[0] === '--version'
        ? { code: 0, stdout: 'ai-cli 9.9.9' }
        : { code: 0, stdout: JSON.stringify({ id: config.image.model, pricing: { image: 'catalog rate' } }) }
    }
  })
  assert.equal(result.ok, true)
  assert.equal(result.value.executable, executable)
  assert.equal(result.value.aiCliVersion, '9.9.9')
  assert.equal(JSON.stringify(result).includes('super-secret'), false)
  assert.deepEqual(calls[1], ['models', config.image.model, '--json'])
})

test('runtime reports ai-cli missing independently from credentials', async () => {
  await assert.rejects(inspectRuntime('image', {
    config,
    nodeVersion: 'v22.1.0',
    env: { PATH: '/directory/that/does/not/exist', AI_GATEWAY_API_KEY: 'configured' }
  }), { code: 'AI_CLI_NOT_FOUND' })
})

test('request rejects model overrides and invalid Unicode length', () => {
  assert.throws(() => validateRequest({ schemaVersion: 1, kind: 'image', prompt: '', promptMode: 'passthrough', qualityMode: 'standard', references: [], source: { kind: 'user_prompt' } }, config), { code: 'PROMPT_INVALID' })
  assert.throws(() => validateRequest({ schemaVersion: 1, kind: 'image', prompt: 'x', promptMode: 'passthrough', qualityMode: 'standard', aspectRatio: '16:9', references: [], source: { kind: 'user_prompt' }, model: 'arbitrary' }, config), { code: 'MODEL_OVERRIDE_FORBIDDEN' })
})

test('reference validation checks absolute paths, count, size and real MIME', async () => {
  const { root, request } = await fixture()
  const valid = join(root, 'reference.png')
  await writeFile(valid, png)
  assert.equal((await validateReferences({ ...request, references: [valid] }, config))[0].mimeType, 'image/png')
  await assert.rejects(validateReferences({ ...request, references: ['remote.png'] }, config), { code: 'REFERENCE_PATH_INVALID' })
  const bad = join(root, 'fake.png')
  await writeFile(bad, 'not an image')
  await assert.rejects(validateReferences({ ...request, references: [bad] }, config), { code: 'REFERENCE_MIME_INVALID' })
  await assert.rejects(validateReferences({ ...request, references: Array(5).fill(valid) }, config), { code: 'REFERENCE_LIMIT_EXCEEDED' })
})

test('builds shell-safe fixed image and video argument arrays', async () => {
  const prompt = 'quote " newline\n $(touch /tmp/nope); `id`'
  const imageArgs = buildAiArguments({ kind: 'image', prompt, qualityMode: 'standard', aspectRatio: '4:5' }, config, '/safe/out').args
  assert.equal(imageArgs[1], prompt)
  assert.deepEqual(imageArgs.slice(2), ['--json', '--no-preview', '-n', '1', '-m', config.image.model, '-o', '/safe/out', '--aspect-ratio', '4:5'])
  const videoArgs = buildAiArguments({ kind: 'video', prompt, qualityMode: 'high', aspectRatio: '16:9', duration: 8 }, config, '/safe/out').args
  assert.ok(videoArgs.includes(config.video.models.high))
  assert.deepEqual(videoArgs.slice(-4), ['--duration', '8', '--resolution', '1280x720'])
})

for (const [kind, bytes] of [['image', png], ['video', mp4]]) {
  test(`generates and manifests a valid ${kind}`, async () => {
    const data = await fixture(kind)
    const runner = async (_exe, args) => {
      const outputDir = args[args.indexOf('-o') + 1]
      const file = join(outputDir, kind === 'image' ? 'media.png' : 'media.mp4')
      await writeFile(file, bytes)
      return { code: 0, stdout: JSON.stringify({ elapsed_ms: 12, count: 1, results: [{ model: selectModel(config, kind), success: true, file }] }), stderr: '' }
    }
    const result = await runMediaGeneration({ ...data, confirmRemote: true }, { config, cwd: data.cwd, inspectRuntime: runtime(kind), runner, env: {} })
    assert.equal(result.ok, true)
    const manifest = JSON.parse(await readFile(result.value.manifest, 'utf8'))
    assert.equal(manifest.kind, kind)
    assert.equal(manifest.artifacts.length, 1)
  })
}

test('confirmation gate runs before directory creation or subprocess', async () => {
  const data = await fixture()
  let called = false
  await assert.rejects(runMediaGeneration({ ...data, confirmRemote: false }, { runner: async () => { called = true } }), { code: 'REMOTE_GENERATION_CONFIRMATION_REQUIRED' })
  assert.equal(called, false)
  await assert.rejects(readFile(data.outputDir), { code: 'ENOENT' })
})

test('partial success delivers only validated files', async () => {
  const data = await fixture()
  const runner = async (_exe, args) => {
    const file = join(args[args.indexOf('-o') + 1], 'good.png')
    await writeFile(file, png)
    return { code: 2, stdout: JSON.stringify({ elapsed_ms: 5, count: 2, results: [{ success: true, file }, { success: false }] }), stderr: 'not persisted' }
  }
  const result = await runMediaGeneration({ ...data, confirmRemote: true }, { config, cwd: data.cwd, inspectRuntime: runtime('image'), runner })
  assert.equal(result.value.delivery.status, 'partial')
  assert.equal(result.value.delivery.artifacts.length, 1)
})

test('all failed and timeout results return stable failures', async () => {
  for (const scenario of ['failed', 'timeout']) {
    const data = await fixture()
    const runner = async () => scenario === 'timeout'
      ? { code: 1, timedOut: true, stdout: '', stderr: '' }
      : { code: 1, stdout: JSON.stringify({ elapsed_ms: 3, count: 1, results: [{ success: false }] }), stderr: '' }
    await assert.rejects(
      runMediaGeneration({ ...data, confirmRemote: true }, { config, cwd: data.cwd, inspectRuntime: runtime('image'), runner }),
      scenario === 'timeout' ? { code: 'AI_CLI_TIMEOUT' } : { code: 'MEDIA_GENERATION_FAILED' }
    )
  }
})

test('skill media contracts keep text agents, raw data, and paid calls out of scope', async () => {
  const skillRoot = resolve(import.meta.dirname, '..')
  const skill = await readFile(join(skillRoot, 'SKILL.md'), 'utf8')
  const imageReference = await readFile(join(skillRoot, 'references', 'media-image.md'), 'utf8')
  const videoReference = await readFile(join(skillRoot, 'references', 'media-video.md'), 'utf8')
  const setupReference = await readFile(join(skillRoot, 'references', 'media-setup.md'), 'utf8')
  assert.match(skill, /Never invoke `ai text`/)
  assert.match(imageReference, /Never send raw rows/)
  assert.match(imageReference, /Ask whether to proceed/)
  assert.match(videoReference, /one continuous shot only/i)
  assert.match(setupReference, /Every remote generation needs confirmation/)
})

test('rejects invalid JSON, escaped paths, empty files, bad signatures and nonempty output', async () => {
  for (const scenario of ['json', 'escape', 'empty', 'signature']) {
    const data = await fixture()
    const runner = async (_exe, args) => {
      if (scenario === 'json') return { code: 1, stdout: 'not-json', stderr: '' }
      const output = args[args.indexOf('-o') + 1]
      const file = scenario === 'escape' ? join(data.root, 'outside.png') : join(output, 'media.png')
      await writeFile(file, scenario === 'empty' ? Buffer.alloc(0) : scenario === 'signature' ? 'bad' : png)
      return { code: 0, stdout: JSON.stringify({ results: [{ success: true, file }] }), stderr: '' }
    }
    await assert.rejects(runMediaGeneration({ ...data, confirmRemote: true }, { config, cwd: data.cwd, inspectRuntime: runtime('image'), runner }), MediaError)
  }
  const data = await fixture()
  await mkdir(data.outputDir, { recursive: true })
  await writeFile(join(data.outputDir, 'existing'), 'x')
  await assert.rejects(runMediaGeneration({ ...data, confirmRemote: true }, { config, cwd: data.cwd, inspectRuntime: runtime('image') }), { code: 'OUTPUT_DIRECTORY_NOT_EMPTY' })
})

test('generated file validator rejects a missing file', async () => {
  const root = await mkdtemp(join(tmpdir(), 'missing-media-'))
  await assert.rejects(validateGeneratedFiles({ results: [{ success: true, file: join(root, 'missing.png') }] }, root, 'image'), { code: 'OUTPUT_FILE_MISSING' })
})

test('generated file validator rejects a symlink escaping the output directory', async () => {
  const root = await mkdtemp(join(tmpdir(), 'linked-media-'))
  const output = join(root, 'output')
  const outside = join(root, 'outside.png')
  const linked = join(output, 'linked.png')
  await mkdir(output)
  await writeFile(outside, png)
  await symlink(outside, linked)
  await assert.rejects(validateGeneratedFiles({ results: [{ success: true, file: linked }] }, output, 'image'), { code: 'OUTPUT_PATH_ESCAPE' })
})
