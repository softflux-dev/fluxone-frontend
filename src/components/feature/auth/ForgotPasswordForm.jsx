import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { API_BASE_URL, BRAND } from '@/lib/constants'
import { BrandLogo } from '@/components/shared/BrandLogo'

const LOGIN_PATH = '/login'

// UI only: same gradient as the login button
const BRAND_GRADIENT = {
  background: `linear-gradient(90deg, ${BRAND.purple}, ${BRAND.deep})`,
}
const BTN_CLASS = 'h-11 w-full rounded-lg text-base font-semibold'

const TITLES = {
  request: { title: 'Forgot Password', sub: 'Reset your password using a verification code' },
  verify: { title: 'Verify OTP', sub: 'Check your email for the code' },
  reset: { title: 'Reset Password', sub: 'Choose a new password' },
  done: { title: 'All Set!', sub: 'Your password has been updated' },
}

// Sends a POST request to /api/auth/<path> and returns the response data.
// Throws an Error with the server's message if the request fails.
async function callAuth(path, body) {
  const res = await fetch(`${API_BASE_URL}/auth/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = await res.json().catch(() => ({}))
  if (!res.ok) {
    const message =
      (typeof json?.error === 'string' ? json.error : json?.error?.message) ||
      json?.message ||
      'Something went wrong. Please try again.'
     const err = new Error(message)
    err.status = res.status
    err.code = json?.code || json?.error?.code
    throw err
  }
  return json?.data ?? json
}

export function ForgotPasswordForm() {
  const navigate = useNavigate()
  const [step, setStep] = useState('request') 
  const [userId, setUserId] = useState('')
  const [otp, setOtp] = useState('')
  const [resetToken, setResetToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [info, setInfo] = useState('')
  const [cooldown, setCooldown] = useState(0)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [notEligible, setNotEligible] = useState(false)

  // Resend timer
  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  // Redirect to login after success
  useEffect(() => {
    if (step !== 'done') return
    const t = setTimeout(() => navigate(LOGIN_PATH), 2500)
    return () => clearTimeout(t)
  }, [step, navigate])

  const NOT_ELIGIBLE_CODE = 'LOGIN_ID_NOT_ELIGIBLE' 
   const NOT_ELIGIBLE_MESSAGE =
  'OTP reset isn’t available for this account. Contact your Branch Manager.'
 async function run(task) {
  setLoading(true)
  setError('')
  try {
    await task()
  } catch (err) {
    setError(err.code === NOT_ELIGIBLE_CODE ? NOT_ELIGIBLE_MESSAGE : err.message)
  } finally {
    setLoading(false)
  }
}

  function sendOtp(e) {
    e?.preventDefault()
    if (!userId.trim()) return setError('Please enter your User ID')
    run(async () => {
      const data = await callAuth('forgot-password', { id: userId.trim() })
      setInfo(data?.message || 'An OTP has been sent to your registered email.')
      setOtp('')
      setCooldown(60)
      setStep('verify')
    })
  }

  function verifyOtp(e) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit OTP')
    run(async () => {
      const data = await callAuth('verify-otp', { id: userId.trim(), otp })
      setResetToken(data.resetToken)
      setInfo('')
      setStep('reset')
    })
  }

  function submitReset(e) {
    e.preventDefault()
    if (newPassword !== confirmPassword) return setError('Passwords do not match')
    run(async () => {
      await callAuth('reset-password', { resetToken, newPassword, confirmPassword })
      setStep('done')
    })
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="mb-3">
  <BrandLogo size="xl" />
</div>
      <h1 className="text-center text-xl font-bold tracking-tight text-foreground sm:text-2xl">
        {TITLES[step].title}
      </h1>
      <p className="mt-1 text-center text-sm text-muted-foreground">
        {TITLES[step].sub}
      </p>

      <div className="mt-6 w-full space-y-5">
        {step === 'request' && (
          <form onSubmit={sendOtp} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fp-userid" className="font-semibold">
                User ID
              </Label>
              <Input
                id="fp-userid"
                placeholder="Enter your user ID"
                autoComplete="username"
                value={userId}
               onChange={(e) => {
                setUserId(e.target.value)
                setNotEligible(false)}} 
                className="h-11 rounded-lg"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              variant="brand"
              loading={loading}
              className={BTN_CLASS}
              style={BRAND_GRADIENT}
            >
              Send OTP
            </Button>
          </form>
        )}

        {step === 'verify' && (
          <form onSubmit={verifyOtp} className="space-y-4">
            {info ? <p className="text-sm text-slate-600">{info}</p> : null}
            <div className="space-y-2">
              <Label htmlFor="fp-otp" className="font-semibold">
                6-digit OTP
              </Label>
              <Input
                id="fp-otp"
                placeholder="Enter 6-digit OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                inputMode="numeric"
                maxLength={6}
                className="h-11 rounded-lg"
                autoFocus
              />
            </div>
            <Button
              type="submit"
              variant="brand"
              loading={loading}
              className={BTN_CLASS}
              style={BRAND_GRADIENT}
            >
              Verify OTP
            </Button>
            <div className="flex items-center justify-between pt-1 text-sm">
              <button
                type="button"
                className="hover:underline"
                onClick={() => {
                  setStep('request')
                  setError('')
                }}
              >
                Change User ID
              </button>
              <button
                type="button"
                className="font-medium hover:underline disabled:opacity-50"
                disabled={cooldown > 0 || loading}
                onClick={sendOtp}
              >
                {cooldown > 0 ? `Resend OTP in ${cooldown}s` : 'Resend OTP'}
              </button>
            </div>
          </form>
        )}

                {step === 'reset' && (
          <form onSubmit={submitReset} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="fp-new" className="font-semibold">
                New Password
              </Label>
              <div className="relative">
                <Input
                  id="fp-new"
                  type={showNew ? 'text' : 'password'}
                  placeholder="Enter new password"
                  autoComplete="new-password"
                  value={newPassword}
                  disabled={loading}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="h-11 rounded-lg pr-11"
                  autoFocus
                />
                <button
                  type="button"
                  tabIndex={0}
                  disabled={loading}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                  onClick={() => setShowNew((v) => !v)}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-50"
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="fp-confirm" className="font-semibold">
                Confirm Password
              </Label>
              <div className="relative">
                <Input
                  id="fp-confirm"
                  type={showConfirm ? 'text' : 'password'}
                  placeholder="Confirm new password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  disabled={loading}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="h-11 rounded-lg pr-11"
                />
                <button
                  type="button"
                  tabIndex={0}
                  disabled={loading}
                  aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  onClick={() => setShowConfirm((v) => !v)}
                  className="absolute top-1/2 right-2 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-50"
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              variant="brand"
              loading={loading}
              className={BTN_CLASS}
              style={BRAND_GRADIENT}
            >
              Reset Password
            </Button>
          </form>
        )}
        {step === 'done' && (
          <p className="rounded-lg bg-green-50 p-3 text-sm text-green-700">
            Your password has been reset successfully. Redirecting to login…
          </p>
        )}
        
        {notEligible ? (
        <div
          role="alert"
          className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-900"
        >
          <p className="font-semibold">Password Reset Not Available</p>
          <p className="mt-1">{NOT_ELIGIBLE_MESSAGE}</p>
        </div>
      ) : null} 

        {error ? (
          <p
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </p>
        ) : null}

        {step !== 'done' && (
          <div className="pt-2 text-center text-sm">
            <Link to={LOGIN_PATH} className="font-medium hover:underline">
              Back to login
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}