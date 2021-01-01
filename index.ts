import { ConsoleOverride } from 'amethyst-hv/dist/lib/engine/logger'
import { createBandwidthThrottleGroup } from 'bandwidth-throttle-stream'
import * as dotenv from 'dotenv'
import { MySQLAdapter } from 'k-value'
import morgan from 'morgan'
import { createServer, plugins, Server } from 'restify'
import { runExpire } from './lib/helper/expire'
import { runIndexPurge } from './lib/helper/purge'
import { AuthMW } from './lib/routing/middleware/auth.verify'
import { RouteLoader } from './lib/routing/route'

// .ENV FILE
dotenv.config()

// Load Logging Interface
export const logger = new ConsoleOverride()

// DB Authentication Credentials
const authentication = {
  host: process.env.MYSQL_HOSTNAME as string,
  port: 3306,
  username: process.env.MYSQL_USERNAME as string,
  password: process.env.MYSQL_PASSWORD as string,
  database: process.env.MYSQL_DATABASE as string
}

export class CDNServer {
  initialization: boolean

  // Restify Server
  readonly server: Server = createServer({
    name: 'cdn-portal',
    version: '1'
  })

  // Initialize Users Index
  readonly users = new MySQLAdapter({
    authentication,
    table: 'cdn.users',
    encoder: {
      use: true,
      store: 'base64',
      parse: 'utf-8'
    }
  })

  // Initialize Namespace Meta Index
  readonly namespaces = new MySQLAdapter({
    authentication,
    table: 'cdn.namespaces',
    encoder: {
      use: true,
      store: 'base64',
      parse: 'utf-8'
    }
  })

  // Initialize File Meta Index
  readonly index = new MySQLAdapter({
    authentication,
    table: `cdn.index${process.env.PRODUCTION_MODE === 'true' ? '' : '.devel'}`,
    encoder: {
      use: true,
      store: 'base64',
      parse: 'utf-8'
    }
  })

  readonly responseThrottler = createBandwidthThrottleGroup({
    bytesPerSecond: 104857600
  })

  async setup (): Promise<void> {
    // Configure key-value Database
    await this.users.configure()
    await this.namespaces.configure()
    await this.index.configure()

    // Internal Middleware Initialization
    new AuthMW().setServer(this)

    // Restify Middleware Initialization
    this.server.use(morgan('combined'))
    this.server.use(plugins.queryParser())
    this.server.use(plugins.bodyParser({
      maxBodySize: 2147483648,
      maxFieldsSize: 2147483648,
      overrideParams: false,
      mapParams: true,
      mapFiles: false,
      keepExtensions: false
    }))

    // Initial Setup Advisory
    if ((await this.users.keys()).length === 0) {
      console.info(
        'Thank you for downloading the Amethyst Studio Content Distribution Service.',
        'We have indicated that this application has never been configured before, or encountered some kind of database exception.',
        'Please identify and access the service to create your initial account. This account will be considered the system administrator.',
        `https://${process.env.PORTAL_TLD as string}/v1/users/register?email=you@domain.tld&password=setYourPasswordHere`
      )
    }
  }

  // Initialize Routes
  async routes (): Promise<void> {
    await RouteLoader.execute(this)
  }

  // Listen on Restify Server w/ Notification
  async listen (port: number): Promise<void> {
    this.server.listen(port)

    console.info(`Listening for requests on 0.0.0.0:${port}`)
  }
}

// TS Self Initialization and Runtime
async function main (): Promise<void> {
  const srv = new CDNServer()

  await srv.setup()
  await srv.routes()
  await srv.listen(process.env.PORTAL_PORT as unknown as number)

  // Register Periodic Tasks
  // Task: Expire
  setInterval((): void => {
    runExpire(srv.index).catch((err) => {
      console.error('Expiring Content Failed', err)
    })
  }, 15000)
  runExpire(srv.index).catch((err) => {
    console.error('Expiring Content Failed', err)
  })

  // Task: Index Cleaning
  setInterval((): void => {
    runIndexPurge(srv.index).catch((err) => {
      console.error('Purging Deleted Content Failed', err)
    })
  }, 3600000)
  runIndexPurge(srv.index).catch((err) => {
    console.error('Purging Deleted Content Failed', err)
  })
}

// Initialize Application
main().catch((err) => {
  console.error('Thread:main():EXCEPTION_GUARD', 'main()#catch', err)
})
