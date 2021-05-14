import { RequestHandlerType } from 'restify'

/** Route Builder Options */
export interface RouteOptions {
  path: string
  allow: 'get' | 'head' | 'post' | 'put' | 'patch' | 'del'
  middleware: RequestHandlerType[]
}
