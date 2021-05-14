import { plugins, Request, Response } from 'restify'
import { CDNServer } from '../../../'
import { GenericRoute } from '../route'

export class Route extends GenericRoute {
  constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/v1/-/health-check',
      allow: 'get',
      middleware: [
        plugins.throttle({
          burst: 0,
          rate: 0.5,
          xff: true,
          maxKeys: 65535
        })
      ]
    })
  }

  async handle (request: Request, response: Response): Promise<void> {
    return response.json({
      code: 200,
      message: 'OK'
    })
  }
}
