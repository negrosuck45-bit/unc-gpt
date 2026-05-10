'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';

const PROVIDERS = [
  { name: 'github', label: 'GitHub', icon: '🐙' },
  { name: 'linear', label: 'Linear', icon: '📋' },
  { name: 'slack', label: 'Slack', icon: '💬' },
];

export function OAuthConnectors() {
  const [status, setStatus] = useState<Record<string, { connected: boolean; configured: boolean }>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatus();
  }, []);

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/mcp/oauth/status');
      const data = await res.json();
      setStatus(data);
    } catch (error) {
      console.error('Failed to fetch OAuth status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = (provider: string) => {
    window.location.href = `/api/mcp/oauth/${provider}/start`;
  };

  const handleDisconnect = async (provider: string) => {
    try {
      await fetch('/api/mcp/oauth/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider }),
      });
      fetchStatus();
    } catch (error) {
      console.error('Failed to disconnect:', error);
    }
  };

  if (loading) {
    return <div className="text-xs text-gray-500">Loading connectors...</div>;
  }

  return (
    <div className="flex gap-2 flex-wrap">
      {PROVIDERS.map((provider) => {
        const isConnected = status[provider.name]?.connected;
        const isConfigured = status[provider.name]?.configured;

        if (!isConfigured) {
          return (
            <div
              key={provider.name}
              className="px-2 py-1 text-xs bg-gray-200 text-gray-500 rounded-full opacity-50 cursor-not-allowed"
              title={`${provider.label} not configured`}
            >
              {provider.icon} {provider.label}
            </div>
          );
        }

        return (
          <Button
            key={provider.name}
            size="sm"
            variant={isConnected ? 'default' : 'outline'}
            onClick={() =>
              isConnected
                ? handleDisconnect(provider.name)
                : handleConnect(provider.name)
            }
            className="text-xs h-8 px-2 gap-1"
          >
            {provider.icon}
            {provider.label}
            {isConnected && ' ✓'}
          </Button>
        );
      })}
    </div>
  );
}
