import { randomBytes } from 'crypto'
import { getHasher } from 'cryptocipher'
import { Next, Request, Response } from 'restify'
import { BadRequestError, ConflictError } from 'restify-errors'
import { CDNServer } from '../../../../index'
import { GenericRoute } from '../../route'

export class Route extends GenericRoute {
  constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/v1/auth/-/user/register',
      allow: 'post',
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

  async handle (request: Request, response: Response, next: Next): Promise<void> {
    const { email, password, namespace } = request.params

    if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email)) {
      return next(new BadRequestError('IdentityRejected: Please provide a valid email address for registration.'))
    }

    if (await this.server.users.has(email)) {
      return next(new ConflictError('IdentityRejected: The requested email may already exist, require verification, or be permanently disabled.'))
    }

    if (namespace !== undefined && await this.server.namespaces.has(namespace)) {
      return next(new ConflictError('IdentityRejected: The requested namespace may already exist, require verification, or be permanently disabled.'))
    }

    // Generate API Token
    const hasher = getHasher('sha512')
    const randomness = randomBytes(96)
    randomBytes(96).copy(randomness, Math.floor(Math.random() * 64), Math.floor(Math.random() * 64))
    const seed = await hasher.digest({
      content: randomness.toString('base64') + Date.now().toLocaleString(),
      digest: 'hex',
      iter: 25
    })

    // Generate Namespace and Verify Unique Status
    let addr = 0
    let _genNS = randomBytes(4).toString('hex')
    while (await this.server.namespaces.has(_genNS)) {
      _genNS = randomBytes(4 + addr).toString('hex')
      addr = addr + 1
    }
    await this.server.namespaces.set((namespace !== undefined ? namespace : _genNS), {
      email
    })

    // Write to Database
    await this.server.users.set(email, {
      email,
      password: (await hasher.digest({
        content: password,
        digest: 'hex',
        iter: 20000
      })).content,
      token: seed.content,
      namespace: (namespace !== undefined ? namespace : _genNS),
      role: ((await this.server.users.keys()).length === 0 ? 'ADMIN' : 'USER')
    })

    // Respond to Client
    return response.json({
      code: 'OK',
      message: 'Registration has been completed. The following access token will be used for accessing the API. Should this token become compromised or lost, you can reset or recover this token at the following endpoints.',
      body: {
        'Authorization-Token': seed.content,
        'Namespace-ID': (namespace !== undefined ? namespace : _genNS),
        'Lost-Token': `/v1/auth/-/token/lost?email=${email as string}&password=yourPassword`,
        'Reset-Token': `/v1/auth/-/token/reset?email=${email as string}&password=yourPassword&token=currentToken`
      }
    })
  }
}
