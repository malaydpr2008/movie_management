"use client";

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'next/navigation';

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
    
    const ws = new WebSocket(wsUrl);

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

    return () => {
      ws.close();
    };
  }, [projectId, queryClient]);

  return (
    <WebSocketContext.Provider value={{ isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
