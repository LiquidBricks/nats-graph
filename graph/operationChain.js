import { createHash } from 'node:crypto'
import { ulid } from 'ulid'
import buildMeta from '../build-meta.js'
import { operationFactoryKey, operationName, operationNameKey, operationStreamWrapperKey } from '../steps/types.js'
import { optimizeOpsChain } from './optimizer.js'

const hashOperationsChain = (operationsChain) => createHash('sha1')
  .update(JSON.stringify(operationsChain.map(({ prop, args }) => ({ prop, args }))))
  .digest('hex')

const toTraverser = (candidate) => {
  if (candidate && typeof candidate === 'object' && 'value' in candidate && Array.isArray(candidate.path)) {
    return { value: candidate.value, path: [...candidate.path] }
  }
  return { value: candidate, path: [] }
}

const appendPath = (path = [], value, shouldAppend) => shouldAppend ? [...path, value] : [...path]

export async function* operationChainExecutor({ operationsChain, kvStore, diagnostics }) {
  const optimizedChain = optimizeOpsChain(operationsChain, { diagnostics })
  const chainHash = hashOperationsChain(optimizedChain)
  const hasPathStep = optimizedChain.some(({ operation }) => operation?.[operationNameKey] === operationName.path)
  let trackPaths = hasPathStep
  let pipeline = seedPipeline({ trackPaths })
  const queryId = ulid()
  const queryMetaKey = `${buildMeta.packageHash}-query`
  const stepMetaKey = `${buildMeta.packageHash}-step`
  const queryMeta = {
    id: queryId,
    hash: chainHash,
    query: optimizedChain.map(({ prop, args }) => ({ prop, args }))
  }
  const chainDiagnostics = diagnostics.child({ [queryMetaKey]: queryMeta })

  for (const [index, step] of optimizedChain.entries()) {
    const { prop, args } = step
    const stepDiagnostics = chainDiagnostics.child({
      [stepMetaKey]: { prop, args, index, hash: chainHash, queryId }
    })
    pipeline = attachStep({
      pipeline,
      step,
      ctx: { kvStore, diagnostics: stepDiagnostics },
      trackPaths
    })
    if (step.operation?.[operationNameKey] === operationName.path) trackPaths = false
  }

  for await (const result of pipeline) {
    yield result
  }
}

export function seedPipeline({ trackPaths = false } = {}) {
  const seed = trackPaths ? { value: null, path: [] } : null
  return (async function* () { yield seed })()
}

export function attachStep({ pipeline, step, ctx, trackPaths = false }) {
  const { args, operation } = step
  const stepCtx = { kvStore: ctx?.kvStore, diagnostics: ctx?.diagnostics }
  const appendToPath = operation?.[operationNameKey] !== operationName.Graph

  const streamWrap = operation[operationStreamWrapperKey]
  if (typeof streamWrap === 'function') {
    if (trackPaths && operation?.[operationNameKey] === operationName.path) {
      return streamWrap({ ctx: stepCtx, args })(pipeline)
    }

    if (!trackPaths) return streamWrap({ ctx: stepCtx, args })(pipeline)

    return (async function* () {
      let currentParent = { value: null, path: [] }
      const sourceValues = (async function* () {
        for await (const traverser of pipeline) {
          currentParent = toTraverser(traverser)
          yield currentParent.value
        }
      })()

      const stepIter = streamWrap({ ctx: stepCtx, args })(sourceValues)
      for await (const value of stepIter) {
        yield {
          value,
          path: appendPath(currentParent.path, value, appendToPath)
        }
      }
    })()
  }

  const stepFactory = operation[operationFactoryKey]

  return (async function* () {
    for await (const traverser of pipeline) {
      const { value: parent, path } = trackPaths ? toTraverser(traverser) : { value: traverser, path: [] }
      const itemIter = stepFactory({
        parent,
        ctx: stepCtx,
        args
      })

      for await (const item of itemIter) {
        if (!trackPaths) {
          yield item
          continue
        }

        yield {
          value: item,
          path: appendPath(path, item, appendToPath)
        }
      }
    }
  })()
}
