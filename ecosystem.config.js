require('dotenv').config()

// Production Version of SC-CDN
const production = {
  name: 'amethyst-scn',
  script: './node_modules/.bin/ts-node',
  args: [
    './index.ts',
    '--color'
  ],
  env: {
    NODE_ENV: 'production',
    PRODUCTION_MODE: true,
    BIND_ADDRESS: process.env.BIND_ADDRESS || '0.0.0.0',
    PORTAL_PORT: process.env.BIND_PORT || 3000
  },
  exec_mode: 'cluster',
  instances: 4
}

// Development Version of SC-CDN. You can safely ignore everything here.
const developer = {
  name: 'amethyst-scn-development',
  script: './node_modules/.bin/ts-node',
  args: [
    '--trace-deprecation',
    './index.ts',
    '--color'
  ],
  env: {
    NODE_ENV: 'development',
    PRODUCTION_MODE: false,
    BIND_ADDRESS: '0.0.0.0',
    PORTAL_PORT: 3100
  },
  exec_mode: 'fork'
}

// Dynamically Generate Application List
const apps = []
if (process.env.NODE_ENV !== 'production') {
  apps.push(developer)
} else {
  apps.push(production)
}

// Export Applications
module.exports = {
  apps
}
