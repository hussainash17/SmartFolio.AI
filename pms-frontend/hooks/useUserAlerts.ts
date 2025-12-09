import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AlertsService } from '../src/client';
import type { AlertPublic, AlertCreate, AlertUpdate } from '../src/client';
import { queryKeys } from './queryKeys';

interface UseUserAlertsOptions {
  enabled?: boolean;
}

/**
 * Hook for managing user price alerts
 */
export function useUserAlerts(options: UseUserAlertsOptions = {}) {
  const { enabled = true } = options;
  const queryClient = useQueryClient();

  const alertsQuery = useQuery({
    queryKey: queryKeys.alerts,
    enabled,
    queryFn: async (): Promise<AlertPublic[]> => {
      const data = await AlertsService.listAlerts();
      return data || [];
    },
    staleTime: 30 * 1000, // 30 seconds
  });

  const createAlertMutation = useMutation({
    mutationFn: async (alertData: AlertCreate) => {
      return await AlertsService.createAlert({ requestBody: alertData });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });

  const updateAlertMutation = useMutation({
    mutationFn: async ({ alertId, data }: { alertId: string; data: AlertUpdate }) => {
      return await AlertsService.updateAlert({ alertId, requestBody: data });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });

  const deleteAlertMutation = useMutation({
    mutationFn: async (alertId: string) => {
      return await AlertsService.deleteAlert({ alertId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.alerts });
    },
  });

  return {
    alerts: alertsQuery.data || [],
    isLoading: alertsQuery.isLoading,
    error: alertsQuery.error,
    refetch: alertsQuery.refetch,
    createAlert: createAlertMutation.mutateAsync,
    updateAlert: updateAlertMutation.mutateAsync,
    deleteAlert: deleteAlertMutation.mutateAsync,
    isCreating: createAlertMutation.isPending,
    isUpdating: updateAlertMutation.isPending,
    isDeleting: deleteAlertMutation.isPending,
  };
}
