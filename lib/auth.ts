import type { NextAuthOptions } from "next-auth"
import GoogleProvider from "next-auth/providers/google"
// Writing comments for people who are not familiar with my code lmao.


const scopes = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/gmail.readonly",
].join(" ")
// basically the scopes that we will be requesting from the user. Guess which one is sensitive ;).

export async function refreshGoogleAccessToken(token: any) {
  try {
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID!,
        client_secret: process.env.GOOGLE_CLIENT_SECRET!,
        grant_type: "refresh_token",
        refresh_token: token.refreshToken,
      }),
    })

    const data = await res.json()
    if (!res.ok) throw new Error(data.error || "Failed to refresh token")

    return {
      ...token,
      accessToken: data.access_token,
      accessTokenExpires: Date.now() + Number(data.expires_in) * 1000,
      refreshToken: data.refresh_token ?? token.refreshToken,
    }
  } catch {
    return { ...token, accessToken: null, accessTokenExpires: 0, error: "RefreshAccessTokenError" }
  }
}
// basically requests the access token by using the refresh token. if you don't know what a refresh token is, you should probably not be reading this code..
// its boilerplate.. lol

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/auth/signin",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "consent",
          access_type: "offline",
          response_type: "code",
          include_granted_scopes: "true",
          scope: scopes,
        },
      },
    }),
  ],
  callbacks: {
    async jwt({ token, account, profile }) {
      if (account) {
        return {
          ...token,
          accessToken: (account as any).access_token,
          refreshToken: (account as any).refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : Date.now() + 3600 * 1000,
          picture: (profile as any)?.picture,
        }
      }

      if (token.accessToken && typeof (token as any).accessTokenExpires === "number" && Date.now() < (token as any).accessTokenExpires) {
        return token
      }

      if ((token as any).refreshToken) {
        return await refreshGoogleAccessToken(token)
      }

      return { ...token, accessToken: null, accessTokenExpires: 0, error: "NoRefreshToken" }
    },
    async session({ session, token }) {
      ;(session.user as any).picture = (token as any).picture ?? session.user?.image ?? null
      return session
    },
  },
}


