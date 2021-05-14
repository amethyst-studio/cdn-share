import { walk } from 'amethyst-hv/dist/lib/util/fs/walk'
import { File } from 'amethyst-hv/dist/lib/util/fs/walk/types/walk.t'
import { resolve } from 'path'
import { Next, Request, Response } from 'restify'
import { CDNServer } from '../../index'
import { RouteOptions } from '../types/generic.t'

export abstract class GenericRoute {
  readonly server: CDNServer
  options: RouteOptions

  constructor (server: CDNServer) {
    this.server = server
  }

  configure (options: RouteOptions): void {
    this.options = options
  }

  async handle (request: Request, response: Response, next?: Next): Promise<void> {

  }
}

type ServerRequest = (request: Request, response: Response, next: Next) => void

interface RouteLoadable {
  [key: string]: (path: string, ...middleware: ServerRequest[]) => void
}

export const RouteLoader = {
  async execute (cdn: CDNServer): Promise<void> {
    for (const file of await this.search()) {
      const { Route } = await require(file.exact)
      const route = new Route(cdn)

      // Dynamic Wrapping Handler
      await (cdn.server as unknown as RouteLoadable)[route.options.allow](route.options.path, ...route.options.middleware, (request: Request, response: Response, next: Next) => {
        route.handle(request, response, next).catch((err: Error) => console.error(err))
      })
    }
  },
  async search (): Promise<File[]> {
    return (await walk(resolve(__dirname, './routes'), (file) => { return file.includes('.ts') }, {
      recursive: true
    })).files
  }
}
