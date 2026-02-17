import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from './prisma'
import bcrypt from 'bcryptjs'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name: string
      userType: string
      role: string
      clinicId: string | null
      dentistId: string | null
    }
  }
  interface User {
    id: string
    email: string
    name: string
    userType: string
    role: string
    clinicId: string | null
    dentistId: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    userType: string
    role: string
    clinicId: string | null
    dentistId: string | null
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        })

        if (!user || !user.active) return null

        const isValid = await bcrypt.compare(credentials.password, user.passwordHash)
        if (!isValid) return null

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLogin: new Date() },
        })

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          userType: user.userType,
          role: user.role,
          clinicId: user.clinicId,
          dentistId: user.dentistId,
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.userType = user.userType
        token.role = user.role
        token.clinicId = user.clinicId
        token.dentistId = user.dentistId
      }
      return token
    },
    async session({ session, token }) {
      session.user.id = token.id
      session.user.userType = token.userType
      session.user.role = token.role
      session.user.clinicId = token.clinicId
      session.user.dentistId = token.dentistId
      return session
    },
  },
  pages: {
    signIn: '/auth/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 24 * 60 * 60, // 24 hours
  },
  secret: process.env.NEXTAUTH_SECRET || 'kXylHuz4dxPT8kNokZ7X8Ij2HpZ1GJRlL403vkm9lEU=',
  debug: true,
}
