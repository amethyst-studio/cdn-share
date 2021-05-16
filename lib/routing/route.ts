import type { Next, Request, Response } from 'restify'
import type { CDNServer } from '../../index'
import { Logging } from '../../index'
import type { RouteOptions } from '../types/generic.t'
import { Route as RecoverRoute } from './routes/auth/recover.route'
import { Route as RegisterRoute } from './routes/auth/register.route'
import { Route as ResetRoute } from './routes/auth/reset.route'
import { Route as DeleteRoute } from './routes/file/delete.route'
import { Route as UploadRoute } from './routes/file/upload.route'
import { Route as HealthCheckRoute } from './routes/health-check.route'
import { Route as RawViewerRoute } from './routes/viewer/raw-viewer.route'
import { Route as ViewerRoute } from './routes/viewer/viewer.route'

/**
 * Generic Route Indexing for Building a HTTP API Route
 */
export class GenericRoute {
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
  public async handle (request: Request, response: Response, next?: Next): Promise<void> {
    /** */
  }
}

// Request Hack for Dynamic Loading... JustWorks:tm:
type ServerRequest = (request: Request, response: Response, next: Next) => void
interface RouteLoadable {
  [key: string]: (path: string, ...middleware: ServerRequest[]) => void
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RouteLoader {
  public static async execute (cdn: CDNServer): Promise<void> {
    const routes: GenericRoute[] = []

    routes.push(new RecoverRoute(cdn))
    routes.push(new RegisterRoute(cdn))
    routes.push(new ResetRoute(cdn))
    routes.push(new DeleteRoute(cdn))
    routes.push(new UploadRoute(cdn))
    routes.push(new RawViewerRoute(cdn))
    routes.push(new ViewerRoute(cdn))
    routes.push(new HealthCheckRoute(cdn))

    for (const route of routes) {
      // Route Handler Dynamic Builder
      const server = cdn.server as unknown as RouteLoadable
      this.register(server, route)
    }
  }

  public static register (server: RouteLoadable, route: GenericRoute): void {
    server[route.options.allow](route.options.path, ...route.options.middleware as ServerRequest[], (request: Request, response: Response, next: Next) => {
      route.handle(request, response, next).catch((err: Error) => Logging.GetLogger().error(err))
    })
  }
}
