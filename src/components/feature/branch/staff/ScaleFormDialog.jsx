import { useEffect, useMemo, useState } from 'react'
import { FormDialog, DialogCancelButton } from '@/components/shared/FormDialog'
import { FieldError } from '@/components/shared/FieldError'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { WholeNumberInput } from '@/components/shared/WholeNumberInput'
import {
  SCALE_SUM_TARGET,
  parseScaleMaxPoints,
  sumScalePoints,
} from '@/lib/branch/performanceScales'
import { fieldErrorClass } from '@/lib/validation/fieldErrors'
import { useFieldErrors } from '@/hooks/shared/useFieldErrors'
import { useFormBaseline } from '@/hooks/shared/useFormBaseline'

const EMPTY = { name: '', maxPoints: '' }

const FIELD_IDS = {
  name: 'scale-name',
  maxPoints: 'scale-points',
}

const SCALE_FIELD_ORDER = ['name', 'maxPoints']

// Add / Edit one criterion in the local draft (parent saves the full version)
export function ScaleFormDialog({
  open,
  onOpenChange,
  mode = 'create',
  initialScale = null,
  scales = [],
  onApply,
}) {
  const isEdit = mode === 'edit'
  const [form, setForm] = useState(EMPTY)
  const [touchedPoints, setTouchedPoints] = useState(false)
  const { fieldErrors, formError, resetErrors, clearField, applyErrors } = useFieldErrors()
  const { captureBaseline, isDirty } = useFormBaseline(open)

  const excludeId = isEdit ? initialScale?.id : null
  const otherUsed = useMemo(() => sumScalePoints(scales, excludeId), [scales, excludeId])

  useEffect(() => {
    if (!open) {
      setForm(EMPTY)
      setTouchedPoints(false)
      return
    }
    resetErrors()
    setTouchedPoints(false)
    const next =
      isEdit && initialScale
        ? {
            name: initialScale.name || '',
            maxPoints: String(initialScale.maxPoints ?? ''),
          }
        : { name: '', maxPoints: '' }
    setForm(next)
    captureBaseline(next)
  }, [open, isEdit, initialScale, resetErrors, captureBaseline])

  const parsed = parseScaleMaxPoints(form.maxPoints)
  const pointsValue = parsed.ok ? parsed.value : null
  const rangeError =
    form.maxPoints !== '' && !parsed.ok
      ? parsed.error
      : touchedPoints && form.maxPoints === ''
        ? parsed.error
        : null

  const pointsHint = fieldErrors.maxPoints || rangeError
  const projectedTotal = pointsValue == null ? otherUsed : otherUsed + pointsValue
  const scaleCapError =
    pointsValue != null && projectedTotal > SCALE_SUM_TARGET
      ? `Adding this criterion would exceed the 100-point cap (projected ${projectedTotal} pts). Reduce the points or remove another criterion first.`
      : null
  const canSubmit = Boolean(form.name.trim()) && parsed.ok && !scaleCapError

  const handleSubmit = (e) => {
    e.preventDefault()
    setTouchedPoints(true)

    const errors = {}
    const name = form.name.trim()
    if (!name) errors.name = 'Criteria name is required'

    const check = parseScaleMaxPoints(form.maxPoints)
    if (!check.ok) errors.maxPoints = check.error

    if (scaleCapError) errors.maxPoints = scaleCapError

    if (Object.keys(errors).length) {
      applyErrors(errors, FIELD_IDS, SCALE_FIELD_ORDER)
      return
    }

    resetErrors()
    onApply?.({
      id: isEdit ? initialScale?.id : undefined,
      name,
      maxPoints: check.value,
      _localKey: isEdit ? initialScale?._localKey : `local-${Date.now()}`,
    })
    onOpenChange?.(false)
  }

  return (
    <FormDialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={isDirty(form)}
      title={isEdit ? 'Edit Criterion' : 'Add Criterion'}
      description="Max points per criterion must be a whole number of 1 or more. Total scale cannot exceed 100 points."
      contentClassName="sm:max-w-md"
      footer={
        <>
          <DialogCancelButton />
          <Button type="submit" form="scale-form" disabled={!canSubmit} variant="brand">
            {isEdit ? 'Update' : 'Add'}
          </Button>
        </>
      }
    >
      {formError ? (
        <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{formError}</p>
      ) : null}

      <form id="scale-form" className="space-y-4 py-1" onSubmit={handleSubmit} noValidate>
        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            pointsHint
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-slate-200 bg-slate-50 text-slate-600'
          }`}
        >
          Projected total: <strong>{projectedTotal}</strong> pts
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scale-name">Criteria Name</Label>
          <Input
            id="scale-name"
            placeholder="e.g. Customer Service"
            value={form.name}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, name: e.target.value }))
              clearField('name')
            }}
            aria-invalid={Boolean(fieldErrors.name)}
            className={fieldErrorClass(fieldErrors.name)}
          />
          <FieldError message={fieldErrors.name} />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="scale-points">Maximum Score Points</Label>
          <WholeNumberInput
            id="scale-points"
            min={1}
            placeholder="e.g. 25"
            value={form.maxPoints}
            onChange={(e) => {
              setForm((prev) => ({ ...prev, maxPoints: e.target.value }))
              clearField('maxPoints')
            }}
            onBlur={() => setTouchedPoints(true)}
            aria-invalid={Boolean(fieldErrors.maxPoints || rangeError)}
            className={fieldErrorClass(fieldErrors.maxPoints || rangeError)}
          />
          <FieldError message={fieldErrors.maxPoints || (touchedPoints ? rangeError : null)} />
        </div>
      </form>
    </FormDialog>
  )
}

export default ScaleFormDialog
