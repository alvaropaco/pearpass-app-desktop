import React from 'react'
import { html } from 'htm/react'

import {
  Wrapper,
  TextAreaWrapper,
  AdditionalItemsWrapper,
  TextAreaComponent,
  ReportTextAreaComponent,
  Label
} from './styles'

type Variant = 'default' | 'report'

interface Props {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  isDisabled?: boolean
  onClick?: (value: string) => void
  variant?: Variant
  label?: string
  testId?: string
  dataId?: string
  additionalItems?: React.ReactNode
}

export const TextArea = ({
  value = '',
  onChange,
  placeholder,
  isDisabled = false,
  onClick,
  variant = 'default',
  label,
  testId = 'text-area',
  dataId,
  additionalItems
}: Props) => {
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (isDisabled) {
      return
    }
    onChange?.(e.target.value)
  }

  const handleClick = () => {
    if (isDisabled) {
      return
    }
    onClick?.(value)
  }

  const TextAreaEl = variant === 'report' ? ReportTextAreaComponent : TextAreaComponent

  return html`
    <${Wrapper} data-id=${dataId} onClick=${handleClick}>
      <${TextAreaWrapper}>
        ${label && html`<${Label}>${label}</${Label}>`}
        <${TextAreaEl}
          data-testid=${testId}
          value=${value}
          onChange=${handleChange}
          placeholder=${placeholder}
          readOnly=${isDisabled}
          isDisabled=${isDisabled}
          hasAdditionalItems=${!!additionalItems}
          hasLabel=${!!label}
        />
        ${!!additionalItems && html`
          <${AdditionalItemsWrapper} onMouseDown=${(e: React.MouseEvent) => e.stopPropagation()}>
            ${additionalItems}
          </${AdditionalItemsWrapper}>
        `}
      </${TextAreaWrapper}>
    </${Wrapper}>
  `
}
