import assert from 'node:assert/strict'
import test, { suite } from 'node:test'

export function runAsSuite({ label, setup }) {
  suite(`as() traversal integration [${label}]`, () => {
    test('labels traversers without changing streamed values', async (t) => {
      const graph = await setup(t)
      const [id] = await graph.g.addV('Person')

      const out = await graph.g.V(id).as('start')

      assert.deepEqual(out, [id])
    })

    test('records label bindings on traverser metadata', async (t) => {
      const graph = await setup(t)
      const [vertexId] = await graph.g.addV('person')

      const traversal = graph.g.V(vertexId).as('origin', 'source')
      const traversers = await graph.run(traversal, { yieldTraversers: true })

      assert.equal(traversers.length, 1)
      const [traverser] = traversers
      assert.equal(traverser.value, vertexId)
      assert.equal(traverser.labels?.get('origin'), vertexId)
      assert.equal(traverser.labels?.get('source'), vertexId)
    })

    test('preserves label snapshot after downstream traversals', async (t) => {
      const graph = await setup(t)
      const [[startId], [endId]] = await Promise.all([
        graph.g.addV('person'),
        graph.g.addV('person'),
      ])
      await graph.g.addE('knows', startId, endId)

      const traversal = graph.g.V(startId).as('origin').out('knows')
      const traversers = await graph.run(traversal, { yieldTraversers: true })

      assert.equal(traversers.length, 1)
      const [traverser] = traversers
      assert.equal(traverser.value, endId)
      assert.equal(traverser.labels?.get('origin'), startId)
    })
  })
}
