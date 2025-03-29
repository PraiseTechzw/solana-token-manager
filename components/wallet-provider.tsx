"use client"

import { WalletAdapterNetwork } from "@solana/wallet-adapter-base"
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react"
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui"
import {
  PhantomWalletAdapter,
  SolflareWalletAdapter,
  CoinbaseWalletAdapter,
  LedgerWalletAdapter,
  TorusWalletAdapter,
  CloverWalletAdapter,
  AvanaWalletAdapter,
} from "@solana/wallet-adapter-wallets"
import { clusterApiUrl } from "@solana/web3.js"
import { type ReactNode, useMemo, useState, useEffect } from "react"

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css"

export default function WalletContextProvider({ children }: { children: ReactNode }) {
  // Set to 'mainnet-beta', 'testnet', or 'devnet'
  const network = WalletAdapterNetwork.Devnet
  const endpoint = useMemo(() => clusterApiUrl(network), [network])

  // Track if we're in a browser environment
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  // Initialize wallet adapters
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
      new CoinbaseWalletAdapter(),
      new LedgerWalletAdapter(),
      new TorusWalletAdapter(),
      new CloverWalletAdapter(),
      new AvanaWalletAdapter(),
    ],
    [network],
  )

  // If we're not in a browser environment yet, render nothing
  if (!mounted) return null

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  )
}

