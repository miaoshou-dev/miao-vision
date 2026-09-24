import { agentError } from './errors'
import { fail, numberFlag, printJson, stringFlag } from './cli-utils'
import type { CliArgs } from './cli-utils'
import { DEFAULT_REVIEW_PORT, startReviewServer } from './review/review-server'
import { runReviewMcp } from './review/review-mcp'

export async function runReviewCommand(args: CliArgs): Promise<void> {
  if (args.subcommand === 'mcp') {
    await runReviewMcp()
    return
  }
  if (args.subcommand !== 'serve') {
    printJson(fail(agentError('UNKNOWN_SUBCOMMAND', `Unknown review subcommand: ${args.subcommand ?? '(none)'}. Available: serve, mcp`, {
      subcommand: args.subcommand, available: ['serve', 'mcp']
    })))
    return
  }
  const server = await startReviewServer({
    port: numberFlag(args, 'port') ?? DEFAULT_REVIEW_PORT,
    artifactRoot: stringFlag(args, 'artifact-root')
  })
  printJson({ ok: true, value: { url: server.url, port: server.port, artifactRoot: stringFlag(args, 'artifact-root') ?? process.cwd() } })
  await new Promise<void>(resolve => {
    const close = () => { void server.close().finally(resolve) }
    process.once('SIGINT', close)
    process.once('SIGTERM', close)
  })
}
