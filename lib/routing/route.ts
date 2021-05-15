import { walk } from 'amethyst-hv/dist/lib/util/fs/walk'
import type { File } from 'amethyst-hv/dist/lib/util/fs/walk/types/walk.t'
import { resolve } from 'path'
import type { Next, Request, Response } from 'restify'
import type { CDNServer } from '../../index'
import { Logging } from '../../index'
import type { RouteOptions } from '../types/generic.t'

/**
 * Generic Route Indexing for Building a HTTP API Route
 */
export abstract class GenericRoute {
  public options: RouteOptions
  public readonly server: CDNServer

  /**
   * @param server - Restify HTTP API Server
  */
  public constructor (server: CDNServer) {
    this.server = server
  }

  /**
   * @param options - HTTP API Route Options
   */
  public configure (options: RouteOptions): void {
    this.options = options
  }

  /** Abstracted Handler for Route */
  abstract handle (request: Request, response: Response, next?: Next): Promise<void>
}

// Request Hack for Dynamic Loading... JustWorks:tm:
type ServerRequest = (request: Request, response: Response, next: Next) => void
interface RouteLoadable {
  [key: string]: (path: string, ...middleware: ServerRequest[]) => void
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RouteLoader {
  public static async execute (cdn: CDNServer): Promise<void> {
    for (const file of await this.search()) {
      const { Route } = await import(file.exact)
      const route = new Route(cdn)

      // Route Handler Dynamic Builder
      const server = cdn.server as unknown as RouteLoadable
      server[route.options.allow](route.options.path, ...route.options.middleware, (request: Request, response: Response, next: Next) => {
        route.handle(request, response, next).catch((err: Error) => Logging.GetLogger().error(err))
      })
    }
  }

  public static async search (): Promise<File[]> {
    return (await walk(resolve(__dirname, './routes'), (file) => { return file.includes('.ts') }, {
      recursive: true
    })).files
  }
}
