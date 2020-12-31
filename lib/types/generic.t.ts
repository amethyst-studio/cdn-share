import { RequestHandlerType } from 'restify'

export interface GenericMaintainer {
  maintainer: {
    name: string
    email: string
    previous: string[]
  }
}

export interface RouteOptions {
  path: string
  allow: 'get' | 'head' | 'post' | 'put' | 'patch' | 'del'
  middleware: RequestHandlerType[]
  contributors: GenericMaintainer
}
