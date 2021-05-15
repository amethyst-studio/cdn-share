import type { RequestHandlerType } from 'restify'

/** Route Builder Options */
export interface RouteOptions {
  allow: 'get' | 'head' | 'post' | 'put' | 'patch' | 'del'
  middleware: RequestHandlerType[]
  path: string
}
