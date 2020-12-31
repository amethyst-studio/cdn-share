import { Next, plugins, Request, Response } from 'restify'
import { CDNServer } from '../../../../index'
import { AuthMW } from '../../middleware/auth.verify'
import { GenericRoute } from '../../route'

export class Route extends GenericRoute {
  constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/v1/auth/-/token/recover',
      allow: 'post',
      middleware: [
        plugins.throttle({
          burst: 0,
          rate: 0.5,
          xff: true,
          maxKeys: 65535
        }),
        AuthMW.email,
        AuthMW.password
      ],
      contributors: {
        maintainer: {
          name: 'Samuel J Voeller',
          email: 'samuel.voeller@amethyst.live',
          previous: []
        }
      }
    })
  }

  async handle (request: Request, response: Response, next: Next): Promise<void> {
    const { email } = request.params

    // Get Profile from Database
    const profile = await this.server.users.get(email)

    // Respond to Client
    return response.json({
      code: 'OK',
      message: 'Your token has been successfully recovered, please try not to lose it next time.',
      body: {
        'Authorization-Token': profile.token
      }
    })
  }
}
