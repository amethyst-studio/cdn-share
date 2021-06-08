import type { Request, Response } from 'restify'
import { plugins } from 'restify'
import type { CDNServer } from '../../../'
import { GenericRouting } from '../route'

export class Route extends GenericRouting {
  public constructor (server: CDNServer) {
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

  public handle (request: Request, response: Response): void {
    response.json({
      code: 200,
      message: 'OK'
    })
  }
}
