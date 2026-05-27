import { useEffect } from 'react';
import { io, Socket } from 'socket.io-client';
import { useQueryClient } from '@tanstack/react-query';
import { getGetTablesQueryKey, getGetSessionsQueryKey, getGetDashboardSummaryQueryKey } from '@workspace/api-client-react';

let socket: Socket | null = null;

export function initSocket() {
  if (!socket) {
    socket = io(window.location.origin, {
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}

export function useSocketEvents() {
  const queryClient = useQueryClient();

  useEffect(() => {
    const s = initSocket();

    const handleUpdate = () => {
      queryClient.invalidateQueries({ queryKey: getGetTablesQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSessionsQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetDashboardSummaryQueryKey() });
    };

    s.on('table:updated', handleUpdate);
    s.on('session:created', handleUpdate);

    return () => {
      s.off('table:updated', handleUpdate);
      s.off('session:created', handleUpdate);
    };
  }, [queryClient]);
}
