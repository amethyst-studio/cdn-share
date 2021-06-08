/* eslint-disable @typescript-eslint/no-unsafe-call */
import type { Next, Request, Response } from 'restify'
import type { CDNServer } from '../../index'
import { Logging } from '../../index'
import type { RouteOptions } from '../types/generic.t'

/**
 * Generic Route Indexing for Building a HTTP API Route
 */
export abstract class GenericRouting {
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
  public abstract handle (request: Request, response: Response, next?: Next): Promise<void>
}

// Request Hack for Dynamic Loading... JustWorks:tm:
type ServerRequest = (request: Request, response: Response, next: Next) => void
interface RouteLoadable {
  [key: string]: (path: string, ...middleware: ServerRequest[]) => void
}

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class RouteLoader {
  public static async execute (cdn: CDNServer): Promise<void> {
    const routes: GenericRouting[] = []

    // import { Route as DeleteRoute } from './routes/file/delete.route'
    // import { Route as UploadRoute } from './routes/file/upload.route'
    // import { Route as RawViewerRoute } from './routes/viewer/raw-viewer.route'
    // import { Route as ViewerRoute } from './routes/viewer/viewer.route'

    const { Route: RecoverRoute } = await import('./routes/auth/recover.route') // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const { Route: RegisterRoute } = await import('./routes/auth/register.route') // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const { Route: ResetRoute } = await import('./routes/auth/reset.route') // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const { Route: DeleteRoute } = await import('./routes/file/delete.route') // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const { Route: UploadRoute } = await import('./routes/file/upload.route') // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const { Route: RawViewerRoute } = await import('./routes/viewer/raw-viewer.route') // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const { Route: ViewerRoute } = await import('./routes/viewer/viewer.route') // eslint-disable-line @typescript-eslint/no-unsafe-assignment
    const { Route: HealthCheckRoute } = await import('./routes/health-check.route') // eslint-disable-line @typescript-eslint/no-unsafe-assignment

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

  public static register (server: RouteLoadable, route: GenericRouting): void {
    server[route.options.allow](route.options.path, ...route.options.middleware as ServerRequest[], (request: Request, response: Response, next: Next) => {
      route.handle(request, response, next).catch((err: Error) => Logging.GetLogger().error(err))
    })
  }
}
