import { randomBytes } from 'crypto'
import { getHasher } from 'cryptocipher'
import type { Next, Request, Response } from 'restify'
import { plugins } from 'restify'
import type { CDNServer } from '../../../../index'
import { AuthMiddleware } from '../../middleware/auth.verify'
import { GenericRoute } from '../../route'

export class Route extends GenericRoute {
  public constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/v1/auth/-/token/reset',
      allow: 'post',
      middleware: [
        plugins.throttle({
          burst: 0,
          rate: 0.5,
          xff: true,
          maxKeys: 65535
        }),
        AuthMiddleware.email,
        AuthMiddleware.token
      ]
    })
  }

  public async handle (request: Request, response: Response, next: Next): Promise<void> {
    const { email } = request.params

    // Generate API Token
    const hasher = getHasher('sha512')
    const seedForRandom = randomBytes(96)
    randomBytes(96).copy(seedForRandom, Math.floor(Math.random() * 64), Math.floor(Math.random() * 64))
    const hashed = await hasher.digest({
      content: seedForRandom.toString('base64') + Date.now().toLocaleString(),
      digest: 'hex',
      iter: 50
    })

    // Get Profile and Update to Database
    const profile = await this.server.users.get(email)
    profile.token = hashed.content
    await this.server.users.set(email, profile)

    // Respond to Client
    return response.json({
      code: 'reset',
      message: 'Your token has been successfully regenerated. Please use the new token provided for all future requests.',
      body: {
        'Authorization-Token': hashed.content
      }
    })
  }
}
