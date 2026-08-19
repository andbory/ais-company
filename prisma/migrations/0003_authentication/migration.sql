-- Authentication sessions are server-side and store only a hash of the cookie token.
CREATE TABLE "ais_auth_sessions" (
    "id" UUID NOT NULL,
    "tokenHash" VARCHAR(128) NOT NULL,
    "userId" UUID NOT NULL,
    "expiresAt" TIMESTAMPTZ(3) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSeenAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMPTZ(3),

    CONSTRAINT "ais_auth_sessions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ais_auth_sessions_tokenHash_key" ON "ais_auth_sessions"("tokenHash");
CREATE INDEX "ais_auth_sessions_userId_revokedAt_expiresAt_idx" ON "ais_auth_sessions"("userId", "revokedAt", "expiresAt");
CREATE INDEX "ais_auth_sessions_expiresAt_idx" ON "ais_auth_sessions"("expiresAt");

ALTER TABLE "ais_auth_sessions" ADD CONSTRAINT "ais_auth_sessions_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "ais_users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
