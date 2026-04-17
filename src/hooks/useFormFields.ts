import { useState, useEffect, useMemo } from "react"
import type { FormType, FormFieldConfig } from "@/lib/types"
import { getFormFieldConfigs, DEFAULT_FORM_FIELDS } from "@/lib/firestore"

let cache: Record<FormType, FormFieldConfig[]> | null = null

export function useFormFields(formType: FormType) {
  const [fields, setFields] = useState<FormFieldConfig[]>(
    cache?.[formType] ?? DEFAULT_FORM_FIELDS[formType]
  )

  useEffect(() => {
    if (cache) {
      setFields(cache[formType])
      return
    }
    getFormFieldConfigs().then((configs) => {
      cache = configs
      setFields(configs[formType])
    })
  }, [formType])

  return useMemo(() => {
    const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder)

    function isVisible(id: string): boolean {
      const field = sorted.find((f) => f.id === id)
      return field ? field.visible : true
    }

    function getOrder(id: string): number {
      const field = sorted.find((f) => f.id === id)
      return field ? field.sortOrder : 99
    }

    return { fields: sorted, isVisible, getOrder }
  }, [fields])
}
