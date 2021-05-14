import { RequestHandlerType } from 'restify'

export interface RouteOptions {
  path: string
  allow: 'get' | 'head' | 'post' | 'put' | 'patch' | 'del'
  middleware: RequestHandlerType[]
}
