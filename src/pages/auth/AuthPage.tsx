import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import Logo from '../../components/common/Logo'
import { useAuth } from '../../contexts/AuthContext'

type Errors = Partial<Record<'name' | 'email' | 'password', string>>
export default function AuthPage({ mode }: { mode: 'login' | 'register' }) {
  const { user, login, register } = useAuth()
  const nav = useNavigate()
  const [f, setF] = useState({ name: '', email: '', password: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [busy, setBusy] = useState(false)
  const [fail, setFail] = useState('')
  if (user) return <Navigate to="/app" replace />
  const isReg = mode === 'register'

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const err: Errors = {}
    if (isReg && f.name.trim().length < 2) err.name = 'Enter your full name.'
    if (!/^\S+@\S+\.\S+$/.test(f.email)) err.email = 'Enter a valid email address.'
    if (f.password.length < 8) err.password = 'Use at least 8 characters.'
    setErrors(err); setFail('')
    if (Object.keys(err).length) return
    setBusy(true)
    try { await (isReg ? register(f.name, f.email, f.password) : login(f.email, f.password)); nav('/app') }
    catch (x) { setFail(x instanceof Error ? x.message : 'Something went wrong. Try again.') }
    finally { setBusy(false) }
  }
  const field = (k: keyof Errors, label: string, type = 'text') => (
    <div><label htmlFor={k} className="mb-1 block text-sm">{label}</label>
      <input id={k} type={type} className="input" value={f[k]} onChange={e => setF({ ...f, [k]: e.target.value })} aria-invalid={!!errors[k]} aria-describedby={errors[k] ? `${k}-err` : undefined} />
      {errors[k] && <p id={`${k}-err`} className="mt-1 text-xs text-[#d70015]">{errors[k]}</p>}</div>)
  return (
    <div className="grid min-h-screen place-items-center px-5">
      <form onSubmit={submit} noValidate className="glass w-full max-w-sm space-y-4 p-7">
        <Logo height={40} />
        <h1 className="text-xl font-semibold text-[#1d1d1f]">{isReg ? 'Create your account' : 'Welcome back'}</h1>
        {isReg && field('name', 'Full name')}{field('email', 'Email', 'email')}{field('password', 'Password', 'password')}
        {fail && <p role="alert" className="text-sm text-[#d70015]">{fail}</p>}
        <button className="btn-primary w-full" disabled={busy}>{busy ? 'Please wait…' : isReg ? 'Create account' : 'Log in'}</button>
        <p className="text-center text-sm text-[#6e6e73]">Your password is securely hashed on our server and is never stored in plain text.</p>
        <p className="text-center text-sm">{isReg ? <>Have an account? <Link className="text-[#007AFF]" to="/login">Log in</Link></> : <>New here? <Link className="text-[#007AFF]" to="/register">Create an account</Link></>}</p>
      </form>
    </div>
  )
}
