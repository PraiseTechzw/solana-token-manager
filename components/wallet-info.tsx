"use client"

import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { useState, useEffect } from "react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Copy, CheckCircle2, ExternalLink, Wallet, RefreshCw } from "lucide-react"
import { AnimatedButton } from "@/components/ui/animated-button"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export default function WalletInfo() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  const [balance, setBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  useEffect(() => {
    if (publicKey) {
      fetchBalance()
    } else {
      setBalance(null)
    }
  }, [publicKey, connection])

  const fetchBalance = async () => {
    if (!publicKey) return
    setIsLoading(true)
    try {
      const balance = await connection.getBalance(publicKey)
      setBalance(balance / LAMPORTS_PER_SOL)
    } catch (error) {
      console.error("Error fetching balance:", error)
      toast({
        title: "Error fetching balance",
        description: "Could not retrieve your wallet balance",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const refreshBalance = async () => {
    setIsRefreshing(true)
    await fetchBalance()
    setIsRefreshing(false)
  }

  const copyAddress = async () => {
    if (!publicKey) return
    await navigator.clipboard.writeText(publicKey.toString())
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const openExplorer = () => {
    if (!publicKey) return
    window.open(`https://explorer.solana.com/address/${publicKey.toString()}?cluster=devnet`, '_blank')
  }

  return (
    <Card className="backdrop-blur-xl bg-black/40 border-purple-500/20">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Wallet Info
          </CardTitle>
          <div className="flex items-center space-x-2 text-sm text-gray-400">
            <span className="px-2 py-1 rounded-full bg-purple-900/30 border border-purple-700/30">
              Solana Devnet
            </span>
          </div>
        </div>
        <CardDescription className="text-gray-400">
          View your wallet details and balance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!publicKey ? (
          <div className="text-center py-6">
            <p className="text-gray-400">Connect your wallet to view details</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">Wallet Address</span>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={copyAddress}
                      className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      {copied ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                      <span>{copied ? "Copied!" : "Copy"}</span>
                    </button>
                    <button
                      onClick={openExplorer}
                      className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Explorer</span>
                    </button>
                  </div>
                </div>
                <div className="font-mono text-sm bg-black/40 p-3 rounded-lg border border-purple-500/20 break-all">
                  {publicKey.toString()}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-gray-400">SOL Balance</span>
                  <button
                    onClick={refreshBalance}
                    disabled={isRefreshing}
                    className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors disabled:opacity-50"
                  >
                    <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
                    <span>Refresh</span>
                  </button>
                </div>
                <div className="bg-black/40 p-3 rounded-lg border border-purple-500/20">
                  {isLoading ? (
                    <div className="flex items-center justify-center py-1">
                      <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                    </div>
                  ) : (
                    <div className="flex items-baseline space-x-2">
                      <span className="text-xl font-semibold text-white">
                        {balance === null ? "—" : balance.toFixed(4)}
                      </span>
                      <span className="text-sm text-gray-400">SOL</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <AnimatedButton
                onClick={() => window.open("https://solfaucet.com", '_blank')}
                className="bg-purple-600 hover:bg-purple-700 transition-colors text-sm"
              >
                Get Devnet SOL
              </AnimatedButton>
              <AnimatedButton
                onClick={openExplorer}
                className="bg-gray-800 hover:bg-gray-700 transition-colors text-sm"
              >
                View Transactions
              </AnimatedButton>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

