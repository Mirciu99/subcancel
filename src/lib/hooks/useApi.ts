import { useState, useEffect } from 'react'
import { apiClient } from '../api/client'

interface UseApiOptions {
  immediate?: boolean
  onSuccess?: (data: any) => void
  onError?: (error: Error) => void
}

interface UseApiReturn<T> {
  data: T | null
  loading: boolean
  error: string | null
  execute: (...args: any[]) => Promise<T | void>
  refetch: () => Promise<T | void>
}

export function useApi<T = any>(
  apiFunction: (...args: any[]) => Promise<T>,
  options: UseApiOptions = {}
): UseApiReturn<T> {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const execute = async (...args: any[]): Promise<T | void> => {
    try {
      setLoading(true)
      setError(null)
      
      const result = await apiFunction(...args)
      setData(result)
      
      if (options.onSuccess) {
        options.onSuccess(result)
      }
      
      return result
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      
      if (options.onError) {
        options.onError(err instanceof Error ? err : new Error(errorMessage))
      }
      
      throw err
    } finally {
      setLoading(false)
    }
  }

  const refetch = () => execute()

  useEffect(() => {
    if (options.immediate) {
      execute()
    }
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    refetch
  }
}

// Specific API hooks
export const useSubscriptions = (immediate = true) => {
  return useApi(() => apiClient.getSubscriptions(), { immediate })
}

export const useSubscriptionStats = (immediate = true) => {
  return useApi(() => apiClient.getSubscriptionStats(), { immediate })
}

export const useTransactions = (limit = 100, offset = 0, immediate = true) => {
  return useApi(() => apiClient.getTransactions(limit, offset), { immediate })
}

export const useTransactionStats = (immediate = true) => {
  return useApi(() => apiClient.getTransactionStats(), { immediate })
}

export const useCancellationRequests = (immediate = true) => {
  return useApi(() => apiClient.getCancellationRequests(), { immediate })
}

export const useCancellationStats = (immediate = true) => {
  return useApi(() => apiClient.getCancellationStats(), { immediate })
}

export const useCurrentUser = (immediate = true) => {
  return useApi(() => apiClient.getCurrentUser(), { immediate })
}

// Mutation hooks (for POST, PUT, DELETE operations)
export const useDetectSubscriptions = () => {
  return useApi((transactions: any[]) => apiClient.detectSubscriptions(transactions))
}

export const useConfirmSubscription = () => {
  return useApi((detectedSubscription: any) => apiClient.confirmSubscription(detectedSubscription))
}

export const useUpdateSubscription = () => {
  return useApi((id: string, updates: any) => apiClient.updateSubscription(id, updates))
}

export const useDeleteSubscription = () => {
  return useApi((id: string) => apiClient.deleteSubscription(id))
}

export const useUploadTransactions = () => {
  return useApi((transactions: any[]) => apiClient.uploadTransactions(transactions))
}

export const useGenerateCancellation = () => {
  return useApi((subscriptionId: string) => apiClient.generateCancellationRequest(subscriptionId))
}

export const useUpdateCancellationStatus = () => {
  return useApi((id: string, status: string) => apiClient.updateCancellationStatus(id, status))
}

// Utility hook for handling multiple API calls
export const useMultipleApi = (apiCalls: (() => Promise<any>)[]) => {
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const executeAll = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const results = await Promise.all(apiCalls.map(call => call()))
      setData(results)
      
      return results
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return {
    data,
    loading,
    error,
    executeAll
  }
}