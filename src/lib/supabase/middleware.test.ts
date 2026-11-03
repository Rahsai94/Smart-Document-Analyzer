import { updateSession } from './middleware'
import { NextRequest } from 'next/server'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

const mockGetUser = vi.fn();

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      getUser: mockGetUser
    }
  }))
}))

describe('Supabase Middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    process.env.USE_DEMO_MODE = 'false'
  })

  afterEach(() => {
      mockGetUser.mockReset();
  })

  it('should redirect unauthenticated users away from protected routes', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('unauth') })

    const req = new NextRequest('http://localhost:3000/protected')
    const res = await updateSession(req)

    expect(res.status).toBe(307)
    expect(res.headers.get('Location')).toBe('http://localhost:3000/login')
  })

  it('should allow unauthenticated users to access login route', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('unauth') })

    const req = new NextRequest('http://localhost:3000/login')
    const res = await updateSession(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Location')).toBeNull()
  })

  it('should allow authenticated users to access protected routes', async () => {
    mockGetUser.mockResolvedValueOnce({ data: { user: { id: 'test' } }, error: null })
    const req = new NextRequest('http://localhost:3000/protected')
    const res = await updateSession(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Location')).toBeNull()
  })

  it('should return 401 for unauthenticated API requests', async () => {
      mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('unauth') })

      const req = new NextRequest('http://localhost:3000/api/upload')
      const res = await updateSession(req)

      expect(res.status).toBe(401)
  })

  it('should bypass auth in demo mode', async () => {
    process.env.USE_DEMO_MODE = 'true'
    mockGetUser.mockResolvedValueOnce({ data: { user: null }, error: new Error('unauth') })

    const req = new NextRequest('http://localhost:3000/protected')
    const res = await updateSession(req)

    expect(res.status).toBe(200)
    expect(res.headers.get('Location')).toBeNull()
  })
})
