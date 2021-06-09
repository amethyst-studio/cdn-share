import { randomBytes } from 'crypto'
import { getHasher } from 'cryptocipher'
import type { Next, Request, Response } from 'restify'
import { plugins } from 'restify'
import { BadRequestError, ConflictError } from 'restify-errors'
import type { CDNServer } from '../../../../index'
import { GenericRouting } from '../../route'

export class Route extends GenericRouting {
  public constructor (server: CDNServer) {
    super(server)

    this.configure({
      path: '/v1/auth/-/user/register',
      allow: 'post',
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

  public async handle (request: Request, response: Response, next: Next): Promise<void> {
    const { email, password, namespace } = request.params as { email: string; password: string; namespace: string | undefined; }

    if (!/^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$/.test(email)) {
      next(new BadRequestError('IdentityRejected: Please provide a valid email address for registration.'))
      return
    }

    if (await this.server.users.has(email)) {
      next(new ConflictError('IdentityRejected: The requested email may already exist, require verification, or be permanently disabled.'))
      return
    }

    if (namespace !== undefined && await this.server.namespaces.has(namespace)) {
      next(new ConflictError('IdentityRejected: The requested namespace may already exist, require verification, or be permanently disabled.'))
      return
    }

    // Generate API Token
    const hasher = getHasher('sha512')
    const seedForRandom = randomBytes(96)
    randomBytes(96).copy(seedForRandom, Math.floor(Math.random() * 64), Math.floor(Math.random() * 64))
    const hashed = await hasher.digest({
      content: seedForRandom.toString('base64') + Date.now().toLocaleString(),
      digest: 'hex',
      iter: 25
    })

    // Generate Namespace and Verify Unique Status
    let addr = 0
    let generatedNamespace = randomBytes(4).toString('hex')
    while (await this.server.namespaces.has(generatedNamespace)) {
      generatedNamespace = randomBytes(4 + addr).toString('hex')
      addr = addr + 1
    }
    await this.server.namespaces.set((namespace !== undefined ? namespace : generatedNamespace), {
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
      token: hashed.content,
      namespace: (namespace !== undefined ? namespace : generatedNamespace),
      role: ((await this.server.users.keys()).length === 0 ? 'ADMIN' : 'USER')
    })

    // Respond to Client
    response.json({
      code: 'register',
      message: 'Registration has been completed. The following access token will be used for accessing the API. Should this token become compromised or lost, you can reset or recover this token at the following endpoints.',
      body: {
        'Authorization-Token': hashed.content,
        'Namespace-ID': (namespace !== undefined ? namespace : generatedNamespace),
        'Lost-Token': `/v1/auth/-/token/lost?email=${email}&password=yourPassword`,
        'Reset-Token': `/v1/auth/-/token/reset?email=${email}&password=yourPassword&token=currentToken`
      }
    })
  }
}
