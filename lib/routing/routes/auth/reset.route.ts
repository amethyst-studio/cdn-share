import { randomBytes } from 'crypto'
import { getHasher } from 'cryptocipher'
import { Next, Request, Response } from 'restify'
import { CDNServer } from '../../../../index'
import { AuthMW } from '../../middleware/auth.verify'
import { GenericRoute } from '../../route'

export class Route extends GenericRoute {
  constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/v1/auth/-/token/reset',
      allow: 'post',
      middleware: [
        AuthMW.email,
        AuthMW.token
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

    // Generate API Token
    const hasher = getHasher('sha512')
    const randomness = randomBytes(96)
    randomBytes(96).copy(randomness, Math.floor(Math.random() * 64), Math.floor(Math.random() * 64))
    const seed = await hasher.digest({
      content: randomness.toString('base64') + Date.now().toLocaleString(),
      digest: 'hex',
      iter: 50
    })

    // Get Profile and Update to Database
    const profile = await this.server.users.get(email)
    profile.token = seed.content
    await this.server.users.set(email, profile)

    // Respond to Client
    return response.json({
      code: 'OK',
      message: 'Your token has been successfully regenerated. Please use the new token provided for all future requests.',
      body: {
        'Authorization-Token': seed.content
      }
    })
  }
}
