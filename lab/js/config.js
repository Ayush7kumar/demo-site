/* Workflow 3D — every tunable and the whole wall live here. Plain script: edit and reload, no rebuild.
   Layout units: 1 = roughly one node spacing. x grows right, y grows DOWN. */

const CONFIG = {
  background: '#050607',
  colors: {
    green: '#34d977', orange: '#ff9b3d', teal: '#22c7c2', blue: '#4c8dff', pink: '#ff6a9c',
    purple: '#9a86ff', white: '#e6ebf0', gray: '#aab1b8', red: '#ff5a63'
  },

  // THE ANGLE IS LOCKED (owner's rule). yaw / pitch / roll / fov / dist are constants; the camera only slides.
  camera: {
    fov: 38, yaw: -46, pitch: -17, roll: -3,
    dist: 13.5,            // distance from the wall (constant)
    lead: [1.3, 0.2],      // keep the light this far left / above the screen centre (layout units)
    smoothing: 0.7,        // seconds; higher = lazier slide
    drift: 0.18            // pointer parallax: a small sideways slide, never a rotation
  },

  node: { size: 0.66, depth: 0.18, standoff: 0.18, body: '#5b5f66', screen: '#07080a', border: 0.22 },
  pipe: { radius: 0.03, color: '#7c8189', cable: 0.016, teal: '#1aa5a0', clampEvery: 1.3 },
  wall: { roughness: 0.9, metalness: 0.15, bump: 3, reflect: 0.3 },

  // the travelling light
  active: {
    color: '#ff8a1e', intensity: 1.45, radius: 0.036,     // lit pipe (default flow colour; each run can override)
    wallGlow: 0.4, light: 9,                               // glow it throws on the wall, and the moving lamp at its head
    head: '#a8f6ff', litColor: '#3fdcff', lit: 0.85,       // spark, and the cyan used when a node is tapped
    // the flow colours used by the routes below; a node lights up in its own icon colour as the flow passes
    palette: { orange: '#ff8a1e', teal: '#2fe0da', blue: '#5b9bff', purple: '#a594ff', green: '#43e585', pink: '#ff6fa0' }
  },

  motion: {
    speed: 2.8,            // units per second of story time along a pipe
    longEdge: 0.42,        // long rails are travelled faster
    dwell: 0.34,           // seconds a node "runs"
    dwellOf: { agent: 1.5, merge: 0.55, order: 0.4, hook: 0.4, image: 0.4 },
    hold: 1.2              // story seconds after the last node lights up
  },

  scroll: { screens: 7, smooth: 1.1, hint: 'Scroll' },    // page length in screen heights; glide in seconds
  tap: { dim: 0.3, radius: 0.34 },                         // how dark the rest goes, and the size of the spotlight

  post: {
    exposure: 1.1,
    bloom: { strength: 0.5, radius: 0.5, threshold: 0.96 },
    dof: { strength: 22, max: 18, aperture: 0.8 },
    vignette: 0.6, grain: 0.03, aberration: 0.01
  },
  quality: { maxPixelRatio: 2, pixelBudget: 8.5e6, minScale: 0.85 },        // never drops below 85% of native, so it never goes blurry      // 8.5 million pixels = native 4K
  packets: 12,
  filler: { x: [-12, 34], y: [-7.5, 27], step: 2.1, gap: [1.6, 4.6], keepOut: [-1.7, 14.3, -1.3, 19.0] }
};

/* What a tapped node shows. `default` applies to every node; add an entry by node id to override.
   text is optional (falls back to the node's title and subtitle). */
const INFO = {
  default: { url: 'https://n8n.io/' },
  hook:    { text: 'Starts the workflow when a new lead is posted.' },
  merge:   { text: 'Joins the order data with the customer record.' },
  agent:   { text: 'Decides what to do next, using a model, memory and tools.', url: 'https://www.make.com/' },
  reply:   { text: 'Sends the answer back to the customer.', url: 'https://zapier.com/' },
  crm:     { text: 'Writes the result to the contact record.' }
};

/* [id, x, y, icon, colour, title, subtitle, kind, width]
   kind: square (default) | trigger | circle | wide.  icon: a name from textures.js, or a path to an image file. */
const NODES = [
  // order intake
  ['order',  0.8, 0.6, 'cart',   'blue',   'New order',     'store trigger', 'trigger'],
  ['switch', 2.4, 0.6, 'branch', 'teal',   'Route',         'by channel'],
  ['enrich', 4.0, 0.0, 'code',   'orange', 'Enrich',        'run code'],
  ['http1',  5.6, 0.0, 'globe',  'purple', 'HTTP Request',  'GET inventory'],
  ['pg',     7.2, 0.0, 'db',     'blue',   'Postgres',      'insert row'],
  ['team',   8.8, 0.0, 'chat',   'pink',   'Notify team',   'post message'],
  ['stock',  4.0, 1.9, 'sheet',  'green',  'Read stock',    'get rows'],
  ['append', 5.6, 1.9, 'sheet',  'green',  'Append row',    'sheet'],
  ['xform',  7.2, 1.9, 'code',   'orange', 'Transform',     'set fields'],
  ['mail1',  8.8, 1.9, 'mail',   'red',    'Send email',    'confirmation'],
  // media
  ['image',  1.4, 3.7, 'image',  'white',  'Product image', 'download'],
  ['up1',    3.0, 3.7, 'cloud',  'white',  'Upload',        'storage'],
  ['ocr',    4.6, 3.7, 'doc',    'white',  'Extract text',  'document'],
  ['sum',    6.2, 3.7, 'spark',  'purple', 'Summarize',     'AI model'],
  ['post',   7.8, 3.7, 'send',   'blue',   'Publish',       'webhook out'],
  ['wait',   4.4, 5.6, 'hourglass', 'red', 'Wait',          '5 minutes'],
  ['class',  6.0, 5.6, 'spark',  'purple', 'Classify',      'AI model'],
  ['sw2',    7.6, 5.6, 'branch', 'teal',   'Switch',        'by intent'],
  ['dm',     9.2, 5.6, 'chat',   'pink',   'Direct message', 'chat'],
  ['cal',    10.8, 5.6, 'calendar', 'blue', 'Create event', 'calendar'],
  // lead scoring
  ['match',  2.6, 7.5, 'filter', 'teal',   'Match SKU',     'filter'],
  ['c1',     4.2, 7.5, 'code',   'orange', 'Validate',      'run code'],
  ['c2',     5.8, 7.5, 'code',   'orange', 'Normalize',     'run code'],
  ['c3',     7.4, 7.5, 'code',   'orange', 'Score lead',    'run code'],
  ['c4',     9.0, 7.5, 'code',   'orange', 'Dedupe',        'run code'],
  ['r1',     10.8, 7.5, 'chat',  'pink',   'Alert sales',   'post message'],
  ['r2',     12.4, 6.9, 'sheet', 'green',  'Log',           'append row'],
  ['r3',     12.4, 8.3, 'mail',  'red',    'Email',         'send'],
  // main line
  ['hook',   0.0, 9.9, 'webhook', 'gray',  'Webhook',       'POST /lead', 'trigger'],
  ['fetch',  1.6, 9.9, 'sheet',  'green',  'Get customer',  'get rows'],
  ['lookup', 3.2, 9.9, 'sheet',  'green',  'Lookup order',  'lookup'],
  ['merge',  4.8, 9.9, 'merge',  'teal',   'Merge',         'combine'],
  ['parse',  6.4, 9.9, 'code',   'orange', 'Parse',         'run code'],
  ['fmt',    8.0, 9.9, 'code',   'orange', 'Format',        'set fields'],
  ['r4',     10.8, 9.9, 'db',    'blue',   'Save',          'insert row'],
  ['r5',     12.4, 9.9, 'send',  'blue',   'Callback',      'webhook out'],
  // agent line
  ['cron',   0.6, 12.4, 'clock', 'gray',   'Schedule',      'every hour', 'trigger'],
  ['queue',  2.2, 12.4, 'sheet', 'green',  'Read queue',    'get rows'],
  ['iff',    3.8, 12.4, 'branch', 'green', 'If',            'has items'],
  ['up2',    5.4, 12.4, 'cloud', 'white',  'Upload',        'storage'],
  ['prompt', 7.0, 12.4, 'code',  'orange', 'Build prompt',  'run code'],
  ['agent',  9.6, 12.4, 'bot',   'white',  'AI Agent',      '', 'wide', 2.2],
  ['reply',  11.6, 12.4, 'chat', 'pink',   'Send reply',    'chat'],
  ['crm',    13.2, 12.4, 'user', 'blue',   'Update CRM',    'contact'],
  ['model',  8.95, 14.05, 'spark', 'purple', 'Model',  '', 'circle'],
  ['memory', 9.6,  14.05, 'chip',  'teal',   'Memory', '', 'circle'],
  ['tools',  10.25, 14.05, 'bolt', 'orange', 'Tools',  '', 'circle'],
  // support line
  ['chatin', 2.0, 16.0, 'chat',  'teal',   'Chat message',  'trigger', 'trigger'],
  ['guard',  3.6, 16.0, 'filter', 'teal',  'Guardrail',     'filter'],
  ['ctx',    5.2, 16.0, 'db',    'blue',   'Load context',  'vector store'],
  ['agent2', 7.4, 16.0, 'bot',   'white',  'AI Agent',      '', 'wide', 2.2],
  ['f3',     9.4, 16.0, 'sheet', 'green',  'Log answer',    'append row'],
  ['f4',     11.0, 16.0, 'mail', 'red',    'Escalate',      'send email'],
  ['f5',     12.6, 16.0, 'chat', 'pink',   'Respond',       'chat'],
  ['model2',  6.75, 17.65, 'spark', 'purple', 'Model',  '', 'circle'],
  ['memory2', 7.4,  17.65, 'chip',  'teal',   'Memory', '', 'circle'],
  ['tools2',  8.05, 17.65, 'bolt',  'orange', 'Tools',  '', 'circle']
];

/* [from, to, style, { via: [[x,y]...] }]   style: gray = metal conduit, teal = thin cable.
   via = explicit waypoints, otherwise auto-routed left to right with right-angle turns. */
const EDGES = [
  ['order', 'switch', 'teal'], ['switch', 'enrich', 'teal'], ['enrich', 'http1'], ['http1', 'pg'], ['pg', 'team'],
  ['switch', 'stock', 'teal'], ['stock', 'append'], ['append', 'xform'], ['xform', 'mail1'],
  ['image', 'up1'], ['up1', 'ocr'], ['ocr', 'sum', 'teal'], ['sum', 'post'],
  ['up1', 'wait', 'teal'], ['wait', 'class'], ['class', 'sw2'], ['sw2', 'dm', 'teal'], ['dm', 'cal'],
  // the two long rails down the left side
  ['order', 'merge', 'gray', { via: [[0.47, 0.6], [-0.9, 0.6], [-0.9, 8.85], [3.95, 8.85], [3.95, 9.74], [4.47, 9.74]] }],
  ['image', 'match', 'teal', { via: [[1.07, 3.7], [-0.45, 3.7], [-0.45, 7.5], [2.27, 7.5]] }],
  ['match', 'c1', 'teal'], ['c1', 'c2'], ['c2', 'c3'], ['c3', 'c4'], ['c4', 'r1', 'teal'], ['r1', 'r2', 'teal'], ['r1', 'r3', 'teal'],
  ['c4', 'r4', 'teal'],
  ['hook', 'fetch'], ['fetch', 'lookup'], ['lookup', 'merge'], ['merge', 'parse'], ['parse', 'fmt'],
  ['fmt', 'r4', 'teal'], ['r4', 'r5'], ['fmt', 'agent'],
  ['cron', 'queue'], ['queue', 'iff'], ['iff', 'up2'], ['up2', 'prompt'], ['prompt', 'agent'], ['agent', 'reply'], ['reply', 'crm'],
  ['agent', 'model',  'gray', { via: [[9.3, 12.73], [9.3, 13.3], [8.95, 13.3], [8.95, 13.82]] }],
  ['agent', 'memory', 'gray', { via: [[9.6, 12.73], [9.6, 13.82]] }],
  ['agent', 'tools',  'gray', { via: [[9.9, 12.73], [9.9, 13.3], [10.25, 13.3], [10.25, 13.82]] }],
  ['iff', 'ctx', 'teal'],
  ['chatin', 'guard'], ['guard', 'ctx'], ['ctx', 'agent2'], ['agent2', 'f3'], ['f3', 'f4'], ['f4', 'f5'],
  ['agent2', 'model2',  'gray', { via: [[7.1, 16.33], [7.1, 16.9], [6.75, 16.9], [6.75, 17.42]] }],
  ['agent2', 'memory2', 'gray', { via: [[7.4, 16.33], [7.4, 17.42]] }],
  ['agent2', 'tools2',  'gray', { via: [[7.7, 16.33], [7.7, 16.9], [8.05, 16.9], [8.05, 17.42]] }]
];

/* The story the scroll plays. Each run is a light travelling along `path` (every hop must be an edge above).
   start = story seconds | sync = arrive at that node together with an earlier run | after = leave from a node an earlier run reached.
   follow = the camera slides with it (the first one until the join, then the main one). */
const RUNS = [
  { path: ['order', 'merge'], start: 0.3, follow: true, color: 'orange' },
  { path: ['hook', 'fetch', 'lookup', 'merge', 'parse', 'fmt', 'agent', 'reply', 'crm'], sync: 'merge', main: true, follow: true, color: 'orange' },
  { path: ['order', 'switch', 'enrich', 'http1', 'pg', 'team'], start: 0.55, color: 'teal' },
  { path: ['image', 'match', 'c1', 'c2', 'c3', 'c4', 'r1', 'r3'], start: 1.2, color: 'blue' },
  { path: ['fmt', 'r4', 'r5'], after: 'fmt', delay: 0.3, color: 'teal' },
  { path: ['agent', 'model'],  after: 'agent', delay: 0.2, color: 'purple' },
  { path: ['agent', 'memory'], after: 'agent', delay: 0.5, color: 'teal' },
  { path: ['agent', 'tools'],  after: 'agent', delay: 0.8, color: 'orange' }
];
const MARKERS = { join: 'merge', agent: 'agent' };          // named story moments = arrival at these nodes
const BURSTS = [{ node: 'merge', size: 1.0, color: 'orange' }, { node: 'crm', size: 1.4, color: 'orange' }];   // flare when the light reaches these

window.W3D = { CONFIG, INFO, NODES, EDGES, RUNS, MARKERS, BURSTS };
