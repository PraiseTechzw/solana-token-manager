"use client"

import { WalletMultiButton } from "@solana/wallet-adapter-react-ui"
import { useWallet } from "@solana/wallet-adapter-react"
import Dashboard from "@/components/dashboard"
import WalletContextProvider from "@/components/wallet-provider"
import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { Wallet, ChevronDown, LogOut } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

function CustomWalletButton() {
  const { connected, publicKey, disconnect } = useWallet()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (connected && publicKey) {
    return (
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <span className="text-sm text-gray-300 font-mono">
                  {publicKey.toString().slice(0, 4)}...{publicKey.toString().slice(-4)}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <p>Your wallet address</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        <div className="flex items-center gap-2">
          <Button
            onClick={disconnect}
            variant="ghost"
            size="sm"
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all text-red-400 hover:text-red-300"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Disconnect</span>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <WalletMultiButton className="!bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all !rounded-xl !shadow-lg !shadow-purple-500/20 !h-10 sm:!h-12 !px-4 sm:!px-6 flex items-center gap-1 sm:gap-2 !text-sm sm:!text-base">
      <Wallet className="h-4 w-4 sm:h-5 sm:w-5" />
      <span className="hidden xs:inline">Connect Wallet</span>
      <span className="xs:hidden">Connect</span>
    </WalletMultiButton>
  )
}

export default function Home() {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  return (
    <WalletContextProvider>
      <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        <div className="relative container mx-auto px-4 py-8">
          <motion.header
            className="flex flex-col md:flex-row justify-between items-center mb-8 md:mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="text-center md:text-left mb-6 md:mb-0">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="flex items-center gap-2 justify-center md:justify-start mb-2"
              >
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                  Solana Token Manager
                </h1>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                  Devnet
                </Badge>
              </motion.div>
              <motion.p
                className="text-gray-300 text-base sm:text-lg max-w-2xl"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Create, mint, and send SPL tokens on Solana devnet with a modern and intuitive interface
              </motion.p>
            </div>
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {mounted && <CustomWalletButton />}
            </motion.div>
          </motion.header>

          <main className="max-w-[1400px] mx-auto">
            <AppContent />
          </main>

          <motion.footer
            className="mt-12 md:mt-20 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.5 }}
          >
            <div className="flex flex-col items-center gap-4 py-8 border-t border-white/10">
              <p className="text-gray-400 text-sm">
                © {new Date().getFullYear()} Solana Token Manager. All rights reserved.
              </p>
              <div className="flex items-center gap-2 text-gray-500 text-sm">
                <span>Built with</span>
                <span className="text-purple-400">♥</span>
                <span>for the Solana community</span>
              </div>
            </div>
          </motion.footer>
        </div>
      </div>
    </WalletContextProvider>
  )
}

function AppContent() {
  const { connected, publicKey } = useWallet()
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  if (!mounted) return null

  if (!connected) {
    return (
      <motion.div
        className="w-full max-w-2xl mx-auto px-4"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="backdrop-blur-xl bg-black/40 border-purple-500/20">
          <CardContent className="p-8">
            <motion.div
              className="text-center space-y-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="mx-auto w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-6">
                <Wallet className="w-8 h-8 text-purple-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Welcome to Solana Token Manager
              </h2>
              <p className="text-gray-300 text-base sm:text-lg max-w-lg mx-auto">
                Connect your Solana wallet to start managing your tokens on the Solana devnet.
              </p>
              <div className="flex items-center justify-center gap-4 pt-4">
                <CustomWalletButton />
              </div>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="space-y-6"
    >
      <Card className="backdrop-blur-xl bg-black/40 border-purple-500/20">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-center sm:text-left">
              <h2 className="text-xl font-semibold mb-2 bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
                Wallet Details
              </h2>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                <p className="text-gray-300">
                  Connected: <span className="font-mono">{publicKey?.toString().slice(0, 8)}...{publicKey?.toString().slice(-8)}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <WalletMultiButton className="!bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 transition-all !rounded-xl !shadow-lg !shadow-purple-500/20 !h-10 !px-4 !py-0 flex items-center gap-2 w-full sm:w-auto">
                <ChevronDown className="h-4 w-4" />
                Change Wallet
              </WalletMultiButton>
              <Button
                onClick={() => window.location.reload()}
                variant="ghost"
                size="sm"
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 transition-all text-red-400 hover:text-red-300 w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4" />
                Disconnect
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <Dashboard />
    </motion.div>
  )
}

