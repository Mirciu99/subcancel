import { createClient } from '@/lib/supabase/client'

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api'

// Use shared Supabase client instance to avoid multiple instances
const supabase = createClient()

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl
  }

  private async getAuthToken(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token || null
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = await this.getAuthToken()
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` }),
        ...options.headers,
      },
    }

    // API request logging removed for production

    const response = await fetch(`${this.baseUrl}${endpoint}`, config)

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: 'Network error' }))
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  // Auth methods
  async signup(email: string, password: string, name: string) {
    return this.request('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    })
  }

  async login(email: string, password: string) {
    return this.request('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  }

  async logout() {
    return this.request('/auth/logout', {
      method: 'POST',
    })
  }

  async getCurrentUser() {
    return this.request('/auth/user')
  }

  // Subscription methods
  async getSubscriptions() {
    try {
      const response = await this.request<{ subscriptions: any[] }>('/subscriptions')
      return response.subscriptions || []
    } catch (error) {
      console.error('Error fetching subscriptions:', error)
      throw error
    }
  }

  async detectSubscriptions(transactions: any[]) {
    return this.request('/subscriptions/detect', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    })
  }

  async confirmSubscription(detectedSubscription: any) {
    return this.request('/subscriptions/confirm', {
      method: 'POST',
      body: JSON.stringify({ detectedSubscription }),
    })
  }

  async updateSubscription(id: string, updates: any) {
    return this.request(`/subscriptions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    })
  }

  async deleteSubscription(id: string) {
    return this.request(`/subscriptions/${id}`, {
      method: 'DELETE',
    })
  }

  async getSubscriptionStats() {
    try {
      const response = await this.request('/subscriptions/stats')
      return response
    } catch (error) {
      console.error('Error fetching stats:', error)
      throw error
    }
  }

  // Transaction methods
  async getTransactions(limit = 100, offset = 0) {
    return this.request(`/transactions?limit=${limit}&offset=${offset}`)
  }

  async uploadTransactions(transactions: any[]) {
    return this.request('/transactions', {
      method: 'POST',
      body: JSON.stringify({ transactions }),
    })
  }

  async getTransactionStats() {
    return this.request('/transactions/stats')
  }

  async exportTransactions() {
    const token = await this.getAuthToken()
    
    const response = await fetch(`${this.baseUrl}/transactions/export`, {
      headers: {
        ...(token && { Authorization: `Bearer ${token}` }),
      },
    })

    if (!response.ok) {
      throw new Error('Export failed')
    }

    return response.blob()
  }

  async deleteAllTransactions() {
    return this.request('/transactions', {
      method: 'DELETE',
    })
  }

  // Cancellation methods
  async getCancellationRequests() {
    return this.request('/cancellations')
  }

  async generateCancellationRequest(subscriptionId: string) {
    return this.request('/cancellations/generate', {
      method: 'POST',
      body: JSON.stringify({ subscriptionId }),
    })
  }

  async updateCancellationStatus(id: string, status: string) {
    return this.request(`/cancellations/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    })
  }

  async getCancellationRequest(id: string) {
    return this.request(`/cancellations/${id}`)
  }

  async deleteCancellationRequest(id: string) {
    return this.request(`/cancellations/${id}`, {
      method: 'DELETE',
    })
  }

  async getCancellationStats() {
    return this.request('/cancellations/stats')
  }

  // Health check
  async healthCheck() {
    return this.request('/health', {
      headers: {} // No auth needed for health check
    })
  }
}

// Export singleton instance
export const apiClient = new ApiClient()
export default apiClient