import { request } from '../localDbCore';
import type { MoldRecord, BatchLogRecord, SaleWithDetails } from '../localDbTypes';
import type { SaleInput } from '../models';

export function createOperationsApi() {
  return {
    async recordSale(data: SaleInput): Promise<void> {
      await request('/api/sales/record', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async getSalesWithDetails(): Promise<SaleWithDetails[]> {
      return request('/api/sales/details');
    },

    async deleteSale(id: string): Promise<void> {
      await request(`/api/sales/${id}`, { method: 'DELETE' });
    },

    async updateSaleEmployee(saleId: string, employeeId: string | null): Promise<void> {
      const payload = JSON.stringify({ employee_id: employeeId });
      const methods: Array<'PATCH' | 'POST' | 'PUT'> = ['PATCH', 'POST', 'PUT'];
      let lastError: Error | null = null;

      for (const method of methods) {
        try {
          await request(`/api/sales/${saleId}/employee`, {
            method,
            body: payload,
          });
          return;
        } catch (error) {
          lastError = error as Error;
        }
      }

      throw lastError ?? new Error('Failed to update sale employee');
    },

    async getBatchLogs(): Promise<BatchLogRecord[]> {
      return request('/api/batch-logs');
    },

    async getBatchLog(id: string): Promise<BatchLogRecord> {
      return request(`/api/batch-logs/${id}`);
    },

    async createBatchLog(
      data: Omit<BatchLogRecord, 'id' | 'created_at' | 'updated_at'>
    ): Promise<BatchLogRecord> {
      return request('/api/batch-logs', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateBatchLog(id: string, data: Partial<BatchLogRecord>): Promise<BatchLogRecord> {
      return request(`/api/batch-logs/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async deleteBatchLog(id: string): Promise<void> {
      await request(`/api/batch-logs/${id}`, { method: 'DELETE' });
    },

    async getMolds(): Promise<MoldRecord[]> {
      return request('/api/molds');
    },

    async createMold(data: Omit<MoldRecord, 'id' | 'created_at' | 'updated_at'>): Promise<MoldRecord> {
      return request('/api/molds', {
        method: 'POST',
        body: JSON.stringify(data),
      });
    },

    async updateMold(id: string, data: Partial<MoldRecord>): Promise<MoldRecord> {
      return request(`/api/molds/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      });
    },

    async deleteMold(id: string): Promise<void> {
      await request(`/api/molds/${id}`, { method: 'DELETE' });
    },
  };
}
