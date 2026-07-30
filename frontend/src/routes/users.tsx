import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { authFetch } from '@/lib/auth'

export const Route = createFileRoute('/users')({
  component: UsersComponent,
})

function UsersComponent() {
  const [users, setUsers] = useState<any[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // Fetch users from the Django backend
    authFetch('http://127.0.0.1:8000/api/users/')
      .then((res) => {
        if (!res.ok) {
          throw new Error('Network response was not ok')
        }
        return res.json()
      })
      .then((data) => setUsers(Array.isArray(data) ? data : []))
      .catch((err) => setError(err.message))
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Users from Backend</h1>
      {error && <p className="text-red-500">Error fetching users: {error}</p>}
      <ul className="space-y-4">
        {users.map((user) => (
          <li key={user.id} className="p-4 border rounded shadow-sm bg-white">
            <p><strong>Username:</strong> {user.username}</p>
            <p><strong>Email:</strong> {user.email || 'N/A'}</p>
            <p><strong>Role:</strong> {user.role}</p>
          </li>
        ))}
      </ul>
      {users.length === 0 && !error && <p>No users found or loading...</p>}
    </div>
  )
}
