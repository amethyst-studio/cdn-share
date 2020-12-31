import * as dotenv from 'dotenv'
import { MySQLAdapter } from 'k-value'
import { createServer, plugins, Server } from 'restify'
import { RouteLoader } from './lib/routing/route'
import { AuthMW } from './lib/routing/middleware/auth.verify'
import { ConsoleOverride } from 'amethyst-hv/dist/lib/engine/logger'
import { createBandwidthThrottleGroup } from 'bandwidth-throttle-stream'
import { DateTime } from 'luxon'
import { rm } from 'fs/promises'

// .ENV FILE
dotenv.config()

// Load Logging Interface
export const logger = new ConsoleOverride()

// DB Authentication
const authentication = {
  host: process.env.MYSQL_HOSTNAME as string,
  port: 3306,
  username: process.env.MYSQL_USERNAME as string,
  password: process.env.MYSQL_PASSWORD as string,
  database: process.env.MYSQL_DATABASE as string
}

export class CDNServer {
  initialization: boolean

  readonly server: Server = createServer({
    name: 'cdn-portal',
    version: '1'
  })

  readonly users = new MySQLAdapter({
    authentication,
    table: 'cdn.users',
    encoder: {
      use: true,
      store: 'base64',
      parse: 'utf-8'
    }
  })

  readonly namespaces = new MySQLAdapter({
    authentication,
    table: 'cdn.namespaces',
    encoder: {
      use: true,
      store: 'base64',
      parse: 'utf-8'
    }
  })

  readonly index = new MySQLAdapter({
    authentication,
    table: 'cdn.index',
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
    await this.users.configure()
    await this.namespaces.configure()
    await this.index.configure()

    // Internal Middleware Initialization
    new AuthMW().setServer(this)

    // Restify Middleware Initialization
    this.server.use(plugins.queryParser())
    this.server.use(plugins.bodyParser({
      maxBodySize: 2147483648,
      maxFieldsSize: 2147483648,
      overrideParams: false,
      mapParams: true,
      mapFiles: false,
      keepExtensions: false
    }))

    if ((await this.users.keys()).length === 0) {
      console.info(
        'Thank you for downloading the Amethyst Studio Content Distribution Service.',
        'We have indicated that this application has never been configured before, or encountered some kind of database exception.',
        'Please identify and access the service to create your initial account. This account will be considered the system administrator.',
        `https://${process.env.PORTAL_TLD as string}/v1/users/register?email=you@domain.tld&password=setYourPasswordHere`
      )
    }
  }

  async routes (): Promise<void> {
    await RouteLoader.execute(this)
  }

  async listen (port: number): Promise<void> {
    this.server.listen(port)

    console.info(`Listening for requests on 0.0.0.0:${port}`)
  }

  async expire (): Promise<void> {
    const keys = await this.index.keys()
    for (const key of keys) {
      const index = await this.index.get(key)
      if (index.expire === null) continue
      const expires = DateTime.fromISO(index.expire)
      const diff = expires.diff(DateTime.local().toUTC(), ['millisecond'])

      if (diff.milliseconds !== undefined && diff.milliseconds < 0) {
        await rm(index.file, {
          recursive: true,
          force: true
        }).catch(() => {})
        await this.index.delete(key)
      }
    }
  }
}

async function main (): Promise<void> {
  const srv = new CDNServer()

  await srv.setup()
  await srv.routes()
  await srv.listen(process.env.PORTAL_PORT as unknown as number)

  setInterval((): void => {
    srv.expire().catch(() => {})
  }, 15000)
  srv.expire().catch(() => {})
}

// Initialize Application
main().catch((error) => {
  console.error('GUARDIAN EXCEPTION', 'main()#fatal', error)
})
