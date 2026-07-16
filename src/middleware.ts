import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/login',
  },
})

export const config = {
  matcher: [
    '/((?!login/?$|n/|api/auth/|api/subscribe/|_next/static|_next/image|favicon\\.ico|data/|fonts/).*)',
  ],
}