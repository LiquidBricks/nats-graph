export const graphKeyspace = Object.freeze({
  vertex: Object.freeze({
    record: (id) => `node.${id}`,
    all: () => 'node.*',
    allDeep: () => 'node.>',
    descendantsPattern: (id) => `node.${id}.>`,

    label: (id) => `node.${id}.label`,
    labelMarker: (id, label) => `node.${id}.label.${label}`,
    byLabelPattern: (label) => `node.*.label.${label}`,

    property: (id, key) => `node.${id}.property.${key}`,
    propertiesPattern: (id) => `node.${id}.property.*`,

    outE: Object.freeze({
      key: (fromId, edgeId) => `node.${fromId}.outE.${edgeId}`,
      keyByLabel: (fromId, label, edgeId) => `node.${fromId}.outE.${label}.${edgeId}`,
      pattern: (fromId) => `node.${fromId}.outE.>`,
      patternByLabel: (fromId, label) => `node.${fromId}.outE.${label}.>`,
      index: (fromId) => `node.${fromId}.outE.__index`,
      indexByLabel: (fromId, label) => `node.${fromId}.outE.${label}.__index`,
      scanFallbackPattern: (fromId) => `node.${fromId}.outE.*`,
    }),

    inE: Object.freeze({
      key: (toId, edgeId) => `node.${toId}.inE.${edgeId}`,
      keyByLabel: (toId, label, edgeId) => `node.${toId}.inE.${label}.${edgeId}`,
      pattern: (toId) => `node.${toId}.inE.>`,
      patternByLabel: (toId, label) => `node.${toId}.inE.${label}.>`,
      index: (toId) => `node.${toId}.inE.__index`,
      indexByLabel: (toId, label) => `node.${toId}.inE.${label}.__index`,
      scanFallbackPattern: (toId) => `node.${toId}.inE.*`,
    }),

    outV: Object.freeze({
      key: (fromId, toId) => `node.${fromId}.outV.${toId}`,
      keyByLabel: (fromId, label, toId) => `node.${fromId}.outV.${label}.${toId}`,
      pattern: (fromId) => `node.${fromId}.outV.*`,
      patternByLabel: (fromId, label) => `node.${fromId}.outV.${label}.*`,
      index: (fromId) => `node.${fromId}.outV.__index`,
      indexByLabel: (fromId, label) => `node.${fromId}.outV.${label}.__index`,
    }),

    inV: Object.freeze({
      key: (toId, fromId) => `node.${toId}.inV.${fromId}`,
      keyByLabel: (toId, label, fromId) => `node.${toId}.inV.${label}.${fromId}`,
      pattern: (toId) => `node.${toId}.inV.*`,
      patternByLabel: (toId, label) => `node.${toId}.inV.${label}.*`,
      index: (toId) => `node.${toId}.inV.__index`,
      indexByLabel: (toId, label) => `node.${toId}.inV.${label}.__index`,
    }),
  }),

  edge: Object.freeze({
    record: (id) => `edge.${id}`,
    allDeep: () => 'edge.>',
    fieldsPattern: (id) => `edge.${id}.*`,
    descendantsPattern: (id) => `edge.${id}.>`,
    label: (id) => `edge.${id}.label`,
    incoming: (id) => `edge.${id}.incoming`,
    outgoing: (id) => `edge.${id}.outgoing`,
    property: (id, key) => `edge.${id}.property.${key}`,
    propertiesPattern: (id) => `edge.${id}.property.*`,
  }),

  edgesIndex: Object.freeze({
    record: (id) => `edges.${id}`,
    all: () => 'edges.*',
    allDeep: () => 'edges.>',
  }),
})
