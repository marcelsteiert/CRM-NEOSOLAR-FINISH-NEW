import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { CalculatorConfig } from '../lib/pvCalculator'
import { DEFAULT_CONFIG } from '../lib/calculatorConfig'

const KEY = ['calculator-pricing']

/**
 * Preise und Annahmen des Verkaufsrechners.
 * Fallback auf DEFAULT_CONFIG, damit die Praesentation auch dann laeuft,
 * wenn der Endpunkt noch keine Werte kennt.
 */
export function useCalculatorPricing() {
  const query = useQuery({
    queryKey: KEY,
    queryFn: () => api.get<{ data: CalculatorConfig }>('/admin/calculator-pricing'),
    staleTime: 10 * 60 * 1000,
  })

  return {
    config: query.data?.data ?? DEFAULT_CONFIG,
    istStandard: !query.data?.data,
    isLoading: query.isLoading,
    error: query.error,
  }
}

export function useUpdateCalculatorPricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (werte: Partial<CalculatorConfig>) =>
      api.put<{ data: CalculatorConfig }>('/admin/calculator-pricing', werte),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}

export function useResetCalculatorPricing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post<{ data: CalculatorConfig }>('/admin/calculator-pricing/reset', {}),
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  })
}
