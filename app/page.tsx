"use client"

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import Dashboard from "@/components/dashboard"
import WalletContextProvider from "@/components/wallet-provider"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"

// Custom wallet button component
function CustomWalletButton() {
  const { connected, publicKey, disconnect } = useWallet()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (connected && publicKey) {
    return (
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5">
          <div className="w-2 h-2 rounded-full bg-green-500"></div>
          <span className="text-sm text-gray-300">
            {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <WalletMultiButton className="!bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all !rounded-xl !shadow-lg !shadow-purple-500/20 !h-10 !px-4 !py-0 flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            Switch Wallet
          </WalletMultiButton>
          <button
            onClick={disconnect}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-all text-sm text-gray-300 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Disconnect
          </button>
        </div>
      </div>
    )
  }

  return (
    <WalletMultiButton className="!bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all !rounded-xl !shadow-lg !shadow-purple-500/20 !h-12 !px-6">
      Connect Wallet
    </WalletMultiButton>
  )
}

// In the Home component:
export default function Home() {
  // Track if we're in a browser environment
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <WalletContextProvider>
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-gray-900 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="relative container mx-auto px-4 py-8">
          <motion.header
            className="flex flex-col md:flex-row justify-between items-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div>
              <motion.h1
                className="text-4xl md:text-5xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                Solana Token Manager
              </motion.h1>
              <motion.p
                className="text-gray-300 text-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.5 }}
              >
                Create, mint, and send SPL tokens on Solana devnet
              </motion.p>
            </div>
            <motion.div
              className="mt-4 md:mt-0"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.6, duration: 0.5 }}
            >
              {mounted && <CustomWalletButton />}
            </motion.div>
          </motion.header>

          <main>
            <AppContent />
          </main>

          <footer className="mt-20 text-center text-gray-400 text-sm">
            <p>© {new Date().getFullYear()} Solana Token Manager. All rights reserved.</p>
          </footer>
        </div>
      </div>
    </WalletContextProvider>
  )
}

function AppContent() {
  const { connected, publicKey, disconnect } = useWallet()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (!connected) {
    return (
      <motion.div
        className="text-center py-20"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <motion.div
          className="max-w-2xl mx-auto p-8 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <motion.h2
            className="text-3xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            Welcome to Solana Token Manager
          </motion.h2>
          <motion.p
            className="text-gray-300 mb-8 text-lg"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.5 }}
          >
            Connect your Solana wallet to create, mint, and send SPL tokens on the Solana devnet.
          </motion.p>
          <motion.div
            className="flex justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <CustomWalletButton />
          </motion.div>
        </motion.div>
      </motion.div>
    )
  }

  return (
    <div>
      <motion.div
        className="mb-8 p-6 rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-semibold mb-2">Wallet Details</h2>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <p className="text-gray-300">
                Connected: <span className="font-mono">{publicKey?.toString().slice(0, 12)}...{publicKey?.toString().slice(-8)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <WalletMultiButton className="!bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all !rounded-xl !shadow-lg !shadow-purple-500/20 !h-10 !px-4 !py-0 flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
              Change Wallet
            </WalletMultiButton>
            <button
              onClick={disconnect}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all text-red-400 hover:text-red-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Disconnect
            </button>
          </div>
        </div>
      </motion.div>
      <Dashboard />
    </div>
  )
}

