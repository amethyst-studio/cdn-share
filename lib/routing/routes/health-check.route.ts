import { Request, Response } from 'restify'
import { CDNServer } from '../../../'
import { GenericRoute } from '../route'

export class Route extends GenericRoute {
  constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/v1/-/health-check',
      allow: 'get',
      middleware: [],
      contributors: {
        maintainer: {
          name: 'Samuel J Voeller',
          email: 'samuel.voeller@amethyst.live',
          previous: []
        }
      }
    })
  }

  async handle (request: Request, response: Response): Promise<void> {
    return response.json({
      code: 200,
      message: 'OK'
    })
  }
}
