import { useEffect, useState } from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
} from 'firebase/auth'
import { doc, serverTimestamp, setDoc } from 'firebase/firestore'
import { auth, db } from './firebase'
import './auth.css'

function friendlyError(code) {
  switch (code) {
    case 'auth/email-already-in-use':
      return 'An account already exists with that email.'
    case 'auth/invalid-email':
      return 'Enter a valid email address.'
    case 'auth/weak-password':
      return 'Use a stronger password.'
    case 'auth/invalid-credential':
      return 'Email or password is incorrect.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Try again later.'
    default:
      return 'Something went wrong. Try again.'
  }
}

export default function AuthGate({ children }) {
  const [user, setUser] = useState(null)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser)
      setCheckingAuth(false)
    })

    return unsubscribe
  }, [])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')

    if (mode === 'signup' && password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)

    try {
      if (mode === 'signup') {
        const credential = await createUserWithEmailAndPassword(
          auth,
          email.trim(),
          password,
        )

        await setDoc(doc(db, 'users', credential.user.uid), {
          email: credential.user.email,
          setupComplete: false,
          createdAt: serverTimestamp(),
        })
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password)
      }
    } catch (err) {
      setError(friendlyError(err.code))
    } finally {
      setSubmitting(false)
    }
  }

  if (checkingAuth) {
    return (
      <div className="auth-loading">
        <div className="auth-loader" />
      </div>
    )
  }

  if (user) return children

  return (
    <main className="auth-page">
      <section className="auth-card">
        <div className="auth-brand">
          <div className="auth-logo">$</div>
          <div>
            <h1>Paycheck</h1>
            <span>Budget</span>
          </div>
        </div>

        <div className="auth-heading">
          <h2>{mode === 'login' ? 'Sign in' : 'Create account'}</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </label>

          {mode === 'signup' && (
            <label>
              Confirm password
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                minLength={6}
                required
              />
            </label>
          )}

          {error && <div className="auth-error">{error}</div>}

          <button className="auth-submit" disabled={submitting}>
            {submitting
              ? 'Please wait...'
              : mode === 'login'
                ? 'Sign in'
                : 'Create account'}
          </button>
        </form>

        <button
          type="button"
          className="auth-switch"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError('')
          }}
        >
          {mode === 'login'
            ? 'Create an account'
            : 'Already have an account? Sign in'}
        </button>
      </section>
    </main>
  )
}
