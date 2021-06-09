/* eslint-disable @typescript-eslint/unbound-method */
import type { Next, Request, Response } from 'restify'
import { plugins } from 'restify'
import type { CDNServer } from '../../../../index'
import { AuthMiddleware } from '../../middleware/auth.verify'
import { GenericRouting } from '../../route'

export class Route extends GenericRouting {
  public constructor (server: CDNServer) {
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
        AuthMiddleware.email,
        AuthMiddleware.password
      ]
    })
  }

  public async handle (request: Request, response: Response, next: Next): Promise<void> {
    const { email } = request.params as { email: string; }

    // Get Profile from Database
    const profile = await this.server.users.get(email) as { token: string; }

    // Respond to Client
    response.json({
      code: 'recover',
      message: 'Your token has been successfully recovered, please try not to lose it next time.',
      body: {
        'Authorization-Token': profile.token
      }
    })
  }
}
