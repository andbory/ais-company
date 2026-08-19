export class EnvironmentConfigError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'EnvironmentConfigError'
  }
}

function readRequired(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new EnvironmentConfigError(`Missing required environment variable: ${name}`)
  return value
}

export function readServerEnvironment() {
  return {
    databaseUrl: readRequired('DATABASE_URL'),
    sessionSecret: readRequired('SESSION_SECRET'),
    nodeEnv: process.env.NODE_ENV === 'production' ? 'production' : 'development',
  } as const
}

