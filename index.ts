import { createBandwidthThrottleGroup } from 'bandwidth-throttle-stream'
import * as dotenv from 'dotenv'
import { MySQLAdapter } from 'k-value'
import morgan from 'morgan'
import type { Server } from 'restify'
import { createServer, plugins } from 'restify'
import type { Logger } from 'winston'
import { createLogger, format, transports } from 'winston'
import { runExpire } from './lib/helper/expire'
import { runIndexPurge } from './lib/helper/purge'
import { AuthMiddleware } from './lib/routing/middleware/auth.verify'
import { RouteLoader } from './lib/routing/route'

// .ENV FILE
dotenv.config()

// Load Logging Interface
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class Logging {
  /** Default Logging Interface */
  public static readonly ILogger: Logger = createLogger({
    level: 'silly',
    format: format.combine(
      format.colorize(),
      format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
      format.errors({ stack: true }),
      format.splat(),
      format.prettyPrint(),
      format.json(),
      format.printf(info => `[${info.timestamp as string}] ${info.level}: ${info.message}`)
    ),
    defaultMeta: { service: 'http-client' },
    transports: [
      new transports.Console()
    ]
  })

  /**
   * Fetch the default logger functionally.
   *
   * @returns - WinstonLogger
   */
  public static GetLogger (): Logger {
    return Logging.ILogger
  }
}

// DB Authentication Credentials
const authentication = {
  host: process.env.MYSQL_HOSTNAME!,
  port: 3306,
  username: process.env.MYSQL_USERNAME!,
  password: process.env.MYSQL_PASSWORD!,
  database: process.env.MYSQL_DATABASE!
}

export class CDNServer {
  // Initialize File Meta Index
  public readonly index = new MySQLAdapter({
    authentication,
    table: `cdn.index${process.env.PRODUCTION_MODE === 'true' ? '' : '.devel'}`,
    encoder: {
      use: true,
      store: 'base64',
      parse: 'utf-8'
    }
  })

  // Initialize Namespace Meta Index
  public readonly namespaces = new MySQLAdapter({
    authentication,
    table: 'cdn.namespaces',
    encoder: {
      use: true,
      store: 'base64',
      parse: 'utf-8'
    }
  })

  // Bandwidth Throttler
  public readonly responseThrottler = createBandwidthThrottleGroup({
    bytesPerSecond: 104857600
  })

  // Restify Server
  public readonly server: Server = createServer({
    name: 'cdn-portal',
    version: '1'
  })

  // Initialize Users Index
  public readonly users = new MySQLAdapter({
    authentication,
    table: 'cdn.users',
    encoder: {
      use: true,
      store: 'base64',
      parse: 'utf-8'
    }
  })

  // Listen on Restify Server w/ Notification
  public async listen (port: number): Promise<void> {
    this.server.listen(port, process.env.BIND_ADDRESS!)
    Logging.GetLogger().info(`Listening for requests on ${process.env.BIND_ADDRESS!}:${port}`)
  }

  // Initialize Routes
  public async routes (): Promise<void> {
    await RouteLoader.execute(this)
  }

  public async setup (): Promise<void> {
    // Configure key-value Database
    await this.users.configure()
    await this.namespaces.configure()
    await this.index.configure()

    // Internal Middleware Initialization
    new AuthMiddleware().setServer(this)

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
      Logging.GetLogger().info(
        'Thank you for downloading the Amethyst Studio Content Distribution Service.',
        'We have indicated that this application has never been configured before, or encountered some kind of database critical error.',
        'Please identify and access the service to create your first account. This account will be considered the server administrator.',
        'Also note that, if using an insecure network, each query flag may also alternatively be passed as multi-part body elements.',
        'https://your-domain.tld/v1/users/register?email=you@domain.tld&password=setYourPasswordHere'
      )
    }
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
      Logging.GetLogger().error('Expiring Content Failed', err)
    })
  }, 15000)
  runExpire(srv.index).catch((err) => {
    Logging.GetLogger().error('Expiring Content Failed', err)
  })

  // Task: Index Cleaning
  setInterval((): void => {
    runIndexPurge(srv.index).catch((err) => {
      Logging.GetLogger().error('Purging Deleted Content Failed', err)
    })
  }, 3600000)
  runIndexPurge(srv.index).catch((err) => {
    Logging.GetLogger().error('Purging Deleted Content Failed', err)
  })
}

main().then(() => {
  // Post Ready to Service
  Logging.GetLogger().info(
    'Initialization Finishes... NO_OP @ [0]'
  )
  if (process.send !== undefined) process.send('ready')
}).catch((err) => {
  // Post Error to Service when Uncaught Encountered
  Logging.GetLogger().error(
    'Initialization Failure... TERMINATE @ [-127]',
    err
  )
  return process.exit(-127)
})
