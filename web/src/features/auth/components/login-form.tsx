import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { PasswordInput } from '@/components/ui/password-input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField } from '@/components/shared/form-field'
import { LanguageSwitcher } from '@/components/shared/language-switcher'
import { ThemeToggle } from '@/components/shared/theme-toggle'
import { useGoogleLogin, useLogin, useSsoLogin } from '@/features/auth/hooks'
import { useTranslation } from 'react-i18next'

const loginSchema = z.object({
  username: z.string().min(1, 'web.auth.username_required'),
  password: z.string().min(1, 'web.auth.password_required'),
  rememberMe: z.boolean().default(false),
})

type LoginFormValues = z.infer<typeof loginSchema>

interface LoginFormProps {
  onSuccess: () => void
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { t } = useTranslation()
  const { mutateAsync: login, isPending, error } = useLogin()
  const ssoLogin = useSsoLogin()
  const googleLogin = useGoogleLogin()

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { username: '', password: '', rememberMe: false },
  })

  const rememberMe = watch('rememberMe')

  const onSubmit = async (values: LoginFormValues) => {
    await login({ username: values.username, password: values.password })
    onSuccess()
  }

  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? t('auth.invalid_credentials')
        : null

  return (
    <div className="flex flex-col gap-5">
      <div className="flex justify-end gap-2 -mt-2">
        <LanguageSwitcher />
        <ThemeToggle />
      </div>
      <div className="text-center">
        <h2 className="text-lg font-semibold" data-testid="login-title">{t('web.auth.sign_in')}</h2>
        <p className="text-sm text-muted-foreground">{t('web.auth.to_your_account')}</p>
      </div>

      {errorMessage && (
        <Alert variant="destructive" data-testid="login-error">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate data-testid="login-form">
        <FormField
          label={t('web.auth.username')}
          error={errors.username?.message ? t(errors.username.message) : undefined}
          required
        >
          <Input
            type="text"
            autoComplete="username"
            placeholder={t('web.auth.username_placeholder')}
            aria-invalid={!!errors.username}
            data-testid="username-input"
            {...register('username')}
          />
        </FormField>

        <FormField
          label={t('web.auth.password')}
          error={errors.password?.message ? t(errors.password.message) : undefined}
          required
        >
          <PasswordInput
            autoComplete="current-password"
            placeholder={t('web.auth.password_placeholder')}
            aria-invalid={!!errors.password}
            data-testid="password-input"
            {...register('password')}
          />
        </FormField>

        <div className="flex items-center gap-2">
          <Checkbox
            id="rememberMe"
            checked={rememberMe}
            onCheckedChange={(checked) => setValue('rememberMe', !!checked)}
          />
          <Label htmlFor="rememberMe" className="text-sm font-normal cursor-pointer">
            {t('web.auth.remember_me')}
          </Label>
        </div>

        <Button type="submit" className="w-full" disabled={isPending} data-testid="login-submit">
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isPending ? t('web.auth.signing_in') : t('web.auth.sign_in')}
        </Button>
      </form>

      <div className="relative" data-testid="login-divider">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t('web.auth.or')}</span>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          className="w-full relative"
          onClick={googleLogin}
          data-testid="google-button"
        >
          <svg className="mr-2 size-4" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
            <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
          </svg>
          {t('web.auth.sign_in_with_google')}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={ssoLogin}
          data-testid="sso-button"
        >
          {t('web.auth.sign_in_with_sso')}
        </Button>
      </div>
    </div>
  )
}
