import React, { useMemo, useState } from 'react'

import { useForm } from '@tetherto/pear-apps-lib-ui-react-hooks'
import { Validator } from '@tetherto/pear-apps-utils-validator'
import { PROTECTED_VAULT_ENABLED } from '@tetherto/pearpass-lib-constants'
import {
  Button,
  Dialog,
  Form,
  InputField,
  PasswordField,
  ToggleSwitch,
} from '@tetherto/pearpass-lib-ui-kit'
import type { PasswordIndicatorVariant } from '@tetherto/pearpass-lib-ui-kit'
import { useCreateVault, useVault } from '@tetherto/pearpass-lib-vault'
// @ts-ignore - JS module without type declarations
import { checkPasswordStrength } from '@tetherto/pearpass-utils-password-check'

import { createStyles } from './CreateVaultModalContentV2.styles'
import { useGlobalLoading } from '../../../context/LoadingContext'
import { useRouter } from '../../../context/RouterContext'
import { useTranslation } from '../../../hooks/useTranslation'
import { getDeviceName } from '../../../utils/getDeviceName'
import { logger } from '../../../utils/logger'

const STRENGTH_MAP: Record<string, PasswordIndicatorVariant> = {
  error: 'vulnerable',
  warning: 'decent',
  success: 'strong'
}

export type CreateVaultModalContentV2Props = {
  onClose: () => void
  onSuccess?: () => void
}

export const CreateVaultModalContentV2 = ({
  onClose,
  onSuccess
}: CreateVaultModalContentV2Props) => {
  const { t } = useTranslation()
  const { navigate } = useRouter()
  const styles = createStyles()

  const [setVaultPassword, setSetVaultPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  useGlobalLoading({ isLoading })

  const schema = Validator.object({
    name: Validator.string().required(t('Name is required')),
    password: Validator.string(),
    passwordConfirm: Validator.string()
  })

  const { addDevice } = useVault()
  const { createVault } = useCreateVault()

  const { register, handleSubmit, setErrors, setValue, values } = useForm({
      initialValues: {
        name: '',
        password: '',
        passwordConfirm: ''
      },
      validate: (formValues: {
        name: string
        password: string
        passwordConfirm: string
      }) => schema.validate(formValues)
    })

  const nameField = register('name')
  const passwordField = register('password')
  const passwordConfirmField = register('passwordConfirm')

  const passwordStrengthResult = useMemo(
    () =>
      checkPasswordStrength(values.password || '', {
        rules: { length: 12 },
        errors: {
          minLength: t('Password must be at least 12 characters long'),
          hasLowerCase: t('Password is missing a lowercase letter'),
          hasUpperCase: t('Password is missing an uppercase letter'),
          hasNumbers: t('Password is missing a number'),
          hasSymbols: t('Password is missing a special character')
        }
      }),
    [values.password, t]
  )

  const passwordIndicator: PasswordIndicatorVariant | undefined =
    values.password && passwordStrengthResult.strengthType
      ? STRENGTH_MAP[passwordStrengthResult.strengthType]
      : undefined

  const passwordsMatch =
    passwordStrengthResult.strengthType === 'success' &&
    values.password.length > 0 &&
    values.password === values.passwordConfirm

  const nameOk = values.name.trim().length > 0

  let vaultPasswordOk = true
  if (PROTECTED_VAULT_ENABLED && setVaultPassword) {
    vaultPasswordOk =
      passwordStrengthResult.success && values.password === values.passwordConfirm
  }

  const isSaveDisabled = !nameOk || !vaultPasswordOk || isLoading

  const handleVaultPasswordToggle = (checked: boolean) => {
    setSetVaultPassword(checked)
    if (!checked) {
      setValue('password', '')
      setValue('passwordConfirm', '')
      setErrors({})
    }
  }

  const submit = async (formValues: {
    name: string
    password: string
    passwordConfirm: string
  }) => {
    if (isLoading) {
      return
    }

    if (PROTECTED_VAULT_ENABLED && setVaultPassword && formValues.password) {
      const strengthResult = checkPasswordStrength(formValues.password, {
        rules: { length: 12 },
        errors: {
          minLength: t('Password must be at least 12 characters long'),
          hasLowerCase: t('Password is missing a lowercase letter'),
          hasUpperCase: t('Password is missing an uppercase letter'),
          hasNumbers: t('Password is missing a number'),
          hasSymbols: t('Password is missing a special character')
        }
      })

      if (!strengthResult.success) {
        setErrors({
          password:
            strengthResult.errors?.[0] || t('Password is not strong enough')
        })
        return
      }

      if (formValues.password !== formValues.passwordConfirm) {
        setErrors({ passwordConfirm: t('Passwords do not match') })
        return
      }
    }

    try {
      setIsLoading(true)

      const password =
        PROTECTED_VAULT_ENABLED && setVaultPassword
          ? formValues.password
          : ''

      await createVault({
        name: formValues.name,
        password
      })

      await addDevice(getDeviceName())

      onSuccess?.()
      navigate('vault', { recordType: 'all' })

      setIsLoading(false)
    } catch (error) {
      setIsLoading(false)
      logger.error(
        'CreateVaultModalContentV2',
        'Error creating vault:',
        error
      )
    }
  }

  const nameError = nameField.error
  const passwordError = passwordField.error
  const passwordConfirmError = passwordConfirmField.error

  return (
    <Dialog
      title={t('Create New Vault')}
      onClose={onClose}
      testID="createvault-dialog-v2"
      closeButtonTestID="createvault-close-v2"
      footer={
        <>
          <Button
            variant="secondary"
            size="small"
            type="button"
            onClick={onClose}
            data-testid="createvault-discard-v2"
          >
            {t('Discard')}
          </Button>
          <Button
            variant="primary"
            size="small"
            type="button"
            disabled={isSaveDisabled}
            isLoading={isLoading}
            onClick={() => handleSubmit(submit)()}
            data-testid="createvault-save-v2"
          >
            {t('Save')}
          </Button>
        </>
      }
    >
      <Form
        onSubmit={handleSubmit(submit)}
        style={styles.form as React.ComponentProps<typeof Form>['style']}
        testID="createvault-form-v2"
      >
        <InputField
          label={t('Vault Name')}
          placeholderText={t('Enter Name')}
          value={nameField.value}
          onChangeText={(v) => nameField.onChange(v)}
          variant={nameError ? 'error' : 'default'}
          errorMessage={nameError || undefined}
          testID="createvault-name-v2"
        />

        {PROTECTED_VAULT_ENABLED ? (
          <>
            <div style={styles.toggleWrap}>
              <ToggleSwitch
                checked={setVaultPassword}
                onChange={handleVaultPasswordToggle}
                label={t('Set Vault Password')}
                description={t(
                  'Add extra password on top of your master password'
                )}
                data-testid="createvault-password-toggle-v2"
              />
            </div>

            {setVaultPassword ? (
              <div style={styles.passwordFields}>
                <PasswordField
                  label={t('Password')}
                  placeholderText={t('Create Vault Password (optional)')}
                  value={passwordField.value}
                  onChangeText={(v) => passwordField.onChange(v)}
                  passwordIndicator={passwordIndicator}
                  variant={passwordError ? 'error' : 'default'}
                  errorMessage={passwordError || undefined}
                  testID="createvault-password-v2"
                />
                <PasswordField
                  label={t('Repeat Password')}
                  placeholderText={t('Repeat Vault Password')}
                  value={passwordConfirmField.value}
                  onChangeText={(v) => passwordConfirmField.onChange(v)}
                  passwordIndicator={passwordsMatch ? 'match' : undefined}
                  variant={passwordConfirmError ? 'error' : 'default'}
                  errorMessage={passwordConfirmError || undefined}
                  testID="createvault-passwordconfirm-v2"
                />
              </div>
            ) : null}
          </>
        ) : null}
      </Form>
    </Dialog>
  )
}
