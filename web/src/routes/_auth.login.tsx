/* eslint-disable react-refresh/only-export-components */
import { createRoute, useRouter } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { authLayoutRoute } from './_auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { FormField } from '@/components/shared/form-field'
import { useLogin, useSsoLogin } from '@/features/auth/hooks'
import { useTranslation } from 'react-i18next'

const loginSchema = z.object({
  username: z.string().min(1, 'web.auth.username_required'),
  password: z.string().min(1, 'web.auth.password_required'),
  rememberMe: z.boolean().default(false),
})

type LoginFormValues = z.infer<typeof loginSchema>

function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { mutateAsync: login, isPending, error } = useLogin()
  const ssoLogin = useSsoLogin()

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
    router.navigate({ to: '/app/dashboard' })
  }

  const errorMessage =
    error instanceof Error
      ? error.message
      : error
        ? t('auth.invalid_credentials')
        : null

  return (
    <div className="flex flex-col gap-5">
      <div className="text-center">
        <h2 className="text-lg font-semibold">{t('web.auth.sign_in')}</h2>
        <p className="text-sm text-muted-foreground">{t('web.auth.to_your_account')}</p>
      </div>

      {errorMessage && (
        <Alert variant="destructive">
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
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
            {...register('username')}
          />
        </FormField>

        <FormField
          label={t('auth.password')}
          error={errors.password?.message ? t(errors.password.message) : undefined}
          required
        >
          <Input
            type="password"
            autoComplete="current-password"
            placeholder="••••••••"
            aria-invalid={!!errors.password}
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

        <Button type="submit" className="w-full" disabled={isPending}>
          {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
          {isPending ? t('web.auth.signing_in') : t('web.auth.sign_in')}
        </Button>
      </form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">{t('web.auth.or')}</span>
        </div>
      </div>

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
  )
}

export const loginRoute = createRoute({
  path: '/login',
  getParentRoute: () => authLayoutRoute,
  component: LoginPage,
})
