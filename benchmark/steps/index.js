import { Bench } from 'tinybench'
import { registerMutationSteps } from './mutationSteps.js'
import { registerEdgeSteps } from './edgeSteps.js'
import { registerVertexSteps } from './vertexSteps.js'
import { STEP_BENCH_CONFIG } from '../benchConfigs.js'

export async function createBench(g) {
  const bench = new Bench(STEP_BENCH_CONFIG)
  await registerMutationSteps({ bench, g })
  await registerEdgeSteps({ bench, g })
  await registerVertexSteps({ bench, g })
  return bench
}
