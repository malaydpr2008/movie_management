"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';
import { useToastStore } from '@/stores/useToastStore';

interface WebSocketContextType {
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ isConnected: false });

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const params = useParams();
  const projectId = params.projectId as string;
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!projectId) return;

    // Use dynamic host based on current window location for flexibility, fallback to localhost
    const wsHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
    const wsUrl = `ws://${wsHost}:8000/ws/projects/${projectId}/`;
    const notificationsWsUrl = `ws://${wsHost}:8000/ws/notifications/`;
    
    const ws = new WebSocket(wsUrl);
    const notifWs = new WebSocket(notificationsWsUrl);

    ws.onopen = () => {
      console.log(`[WebSocket] Connected to project ${projectId}`);
      setIsConnected(true);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Message received:', data);
        
        // Invalidate specific queries based on entity to trigger UI refresh
        if (data.entity === 'stripboard') {
          queryClient.invalidateQueries({ queryKey: ['stripboard', projectId] });
        } else if (data.entity === 'narrative') {
          queryClient.invalidateQueries({ queryKey: ['projectTree', projectId] });
        } else if (data.entity === 'budget') {
          queryClient.invalidateQueries({ queryKey: ['budget', projectId] });
        } else if (data.entity === 'vfx') {
          queryClient.invalidateQueries({ queryKey: ['vfx', projectId] });
        } else {
          // Fallback blanket invalidation for generic updates
          queryClient.invalidateQueries();
        }
      } catch (e) {
        console.error('[WebSocket] Failed to parse message', e);
      }
    };

    ws.onclose = () => {
      console.log(`[WebSocket] Disconnected from project ${projectId}`);
      setIsConnected(false);
    };

    notifWs.onopen = () => {
      console.log(`[WebSocket] Connected to global notifications`);
    };

    notifWs.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        console.log('[WebSocket] Global Notification received:', data);
        if (data.message) {
          useToastStore.getState().addToast({
            title: data.message,
            type: data.level || 'info'
          });
        }
        
        if (data.action === "review_breakdown") {
          window.dispatchEvent(new CustomEvent("open-breakdown-review"));
        }
      } catch (e) {
        console.error('[WebSocket] Failed to parse global notification', e);
      }
    };

    notifWs.onclose = () => {
      console.log(`[WebSocket] Disconnected from global notifications`);
    };

    return () => {
      ws.close();
      notifWs.close();
    };
  }, [projectId, queryClient]);

  return (
    <WebSocketContext.Provider value={{ isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
