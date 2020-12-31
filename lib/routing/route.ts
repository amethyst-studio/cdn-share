import { walk } from 'amethyst-hv/dist/lib/util/fs/walk'
import { File } from 'amethyst-hv/dist/lib/util/fs/walk/types/structure'
import { resolve } from 'path'
import { Next, Request, Response } from 'restify'
import { RouteOptions } from '../types/generic.t'
import { CDNServer } from '../../index'

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

export const RouteLoader = {
  async execute (cdn: CDNServer): Promise<void> {
    for (const file of await this.search()) {
      const { Route } = await require(file.exact)
      const route = new Route(cdn)
      switch (route.options.allow) {
        case 'get': {
          await cdn.server.get(route.options.path, ...route.options.middleware, (request: Request, response: Response, next: Next) => {
            route.handle(request, response, next).catch((err: Error) => console.error(err))
          })
          break
        }
        case 'head': {
          await cdn.server.head(route.options.path, ...route.options.middleware, (request: Request, response: Response, next: Next) => {
            route.handle(request, response, next).catch((err: Error) => console.error(err))
          })
          break
        }
        case 'post': {
          await cdn.server.post(route.options.path, ...route.options.middleware, (request: Request, response: Response, next: Next) => {
            route.handle(request, response, next).catch((err: Error) => console.error(err))
          })
          break
        }
        case 'put': {
          await cdn.server.put(route.options.path, ...route.options.middleware, (request: Request, response: Response, next: Next) => {
            route.handle(request, response, next).catch((err: Error) => console.error(err))
          })
          break
        }
        case 'patch': {
          await cdn.server.patch(route.options.path, ...route.options.middleware, (request: Request, response: Response, next: Next) => {
            route.handle(request, response, next).catch((err: Error) => console.error(err))
          })
          break
        }
        case 'del': {
          await cdn.server.del(route.options.path, ...route.options.middleware, (request: Request, response: Response, next: Next) => {
            route.handle(request, response, next).catch((err: Error) => console.error(err))
          })
          break
        }
      }
    }
  },
  async search (): Promise<File[]> {
    return (await walk(resolve(__dirname, './routes'), (file) => { return file.includes('.ts') }, {
      recursive: true
    })).files
  }
}
