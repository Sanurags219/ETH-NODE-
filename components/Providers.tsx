'use client';

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { WagmiProvider, createConfig, http } from 'wagmi';
import { base, mainnet } from 'viem/chains';
import { coinbaseWallet, walletConnect, injected } from 'wagmi/connectors';
 
// WalletConnect project ID from environment or fallback placeholder
const projectId = process.env.NEXT_PUBLIC_PROJECT_ID || '85c63529a67451478f77341031d27571';
 
const config = createConfig({
  chains: [base, mainnet],
  connectors: [
    injected(),
    coinbaseWallet({
      appName: 'EtherNode Explorer',
      preference: 'smartWalletOnly',
    }),
    walletConnect({
       projectId,
    })
  ],
  ssr: true,
  transports: {
    [base.id]: http(),
    [mainnet.id]: http(),
  },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <OnchainKitProvider
          apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
          chain={base}
        >
          {children}
        </OnchainKitProvider>
      </QueryClientProvider>
    </WagmiProvider>
  );
}
