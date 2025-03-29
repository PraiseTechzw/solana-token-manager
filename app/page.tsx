"use client"

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import Dashboard from "@/components/dashboard"
import WalletContextProvider from "@/components/wallet-provider"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"

// Custom wallet button component
function CustomWalletButton() {
  const { connected } = useWallet()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  return (
    <WalletMultiButton className="!bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all !rounded-xl !shadow-lg !shadow-purple-500/20 !h-12 !px-6">
      {connected ? "Change Wallet" : "Connect Wallet"}
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
  const { connected } = useWallet()
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

  return <Dashboard />
}

