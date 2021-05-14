import { getHasher } from 'cryptocipher'
import { Next, Request, Response } from 'restify'
import { ConflictError, UnauthorizedError } from 'restify-errors'
import { CDNServer } from '../../../index'

export class AuthMiddleware {
  private static server: CDNServer

  setServer (server: CDNServer): void {
    AuthMiddleware.server = server
  }

  static async email (request: Request, response: Response, next: Next): Promise<void> {
    const { email } = request.params

    if (email === undefined) return next(new UnauthorizedError('IdentityRejected: You must specify the email address associated with your account using a Multi-part Form body. Please use \'email\' as the key.'))

    if (!await AuthMiddleware.server.users.has(email)) {
      await next(new ConflictError('IdentityRejected: The requested email may already exist, require verification, or be permanently disabled.'))
    }

    return next()
  }

  static async password (request: Request, response: Response, next: Next): Promise<void> {
    const { email, password } = request.params

    if (password === undefined) return next(new UnauthorizedError('IdentityRejected: You must specify the password associated with your account using a Multi-part Form body. Please use \'password\' as the key.'))

    const profile = await AuthMiddleware.server.users.get(email)

    const hasher = getHasher('sha512')
    const hash = (await hasher.digest({
      content: password,
      digest: 'hex',
      iter: 20000
    })).content

    if (profile.password !== hash) {
      await next(new UnauthorizedError('IdentityRejected: The request password may be incorrect, invalid, or throttled to prevent abuse.'))
    }

    return next()
  }

  static async token (request: Request, response: Response, next: Next): Promise<void> {
    const { email, token } = request.params

    if (token === undefined) return next(new UnauthorizedError('IdentityRejected: You must specify the token associated with your account using a Multi-part Form body. Please use \'token\' as the key.'))

    const profile = await AuthMiddleware.server.users.get(email)
    if (profile.token !== token) {
      await next(new UnauthorizedError('IdentityRejected: The request token may be incorrect, invalid, or be permanently disabled to prevent abuse.'))
    }

    return next()
  }
}
