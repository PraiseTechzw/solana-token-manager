"use client"

import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { Loader2, RefreshCw, Copy, LogOut } from "lucide-react"
import { CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { useState } from "react"
import { AnimatedCard } from "@/components/ui/animated-card"
import { AnimatedButton } from "@/components/ui/animated-button"

interface WalletInfoProps {
  balance: number | null
  isLoading: boolean
}

export default function WalletInfo({ balance, isLoading }: WalletInfoProps) {
  const { publicKey, disconnect } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()
  const [requestingAirdrop, setRequestingAirdrop] = useState(false)
  const [copyAnimation, setCopyAnimation] = useState(false)

  const copyAddress = () => {
    if (!publicKey) return

    navigator.clipboard.writeText(publicKey.toString())
    setCopyAnimation(true)
    setTimeout(() => setCopyAnimation(false), 1000)

    toast({
      title: "Address copied",
      description: "Wallet address copied to clipboard",
    })
  }

  const handleDisconnect = () => {
    disconnect().catch((error) => {
      console.error("Error disconnecting wallet:", error)
      toast({
        title: "Error disconnecting",
        description: "Could not disconnect wallet",
        variant: "destructive",
      })
    })
  }

  const requestAirdrop = async () => {
    if (!publicKey) return

    try {
      setRequestingAirdrop(true)
      const signature = await connection.requestAirdrop(publicKey, 2 * LAMPORTS_PER_SOL)
      await connection.confirmTransaction(signature, "confirmed")

      toast({
        title: "Airdrop successful",
        description: "2 SOL has been added to your wallet",
      })

      // Force refresh the page to update balance
      window.location.reload()
    } catch (error) {
      console.error("Error requesting airdrop:", error)
      toast({
        title: "Airdrop failed",
        description: "Could not request SOL from faucet. Try again later.",
        variant: "destructive",
      })
    } finally {
      setRequestingAirdrop(false)
    }
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <AnimatedCard>
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-lg font-medium text-gray-200 mb-1">Connected Wallet</h2>
            <div className="flex items-center gap-2">
              <p className="text-sm text-gray-400">
                {publicKey ? shortenAddress(publicKey.toString()) : "No wallet connected"}
              </p>
              {publicKey && (
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 text-xs text-gray-400 hover:text-white transition-all ${copyAnimation ? "scale-110 text-green-400" : ""}`}
                  onClick={copyAddress}
                >
                  <Copy className={`h-3 w-3 mr-1 ${copyAnimation ? "text-green-400" : ""}`} />
                  {copyAnimation ? "Copied!" : "Copy"}
                </Button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-gray-700 rounded-lg px-4 py-2 transition-all duration-300 hover:shadow-md hover:shadow-purple-500/10">
              <p className="text-sm text-gray-400">SOL Balance</p>
              <p className="text-xl font-bold">
                {isLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : balance !== null ? (
                  `${balance.toFixed(4)} SOL`
                ) : (
                  "N/A"
                )}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <AnimatedButton
                variant="outline"
                size="sm"
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={handleDisconnect}
                icon={<LogOut className="h-3 w-3" />}
              >
                Disconnect
              </AnimatedButton>

              <AnimatedButton
                variant="outline"
                size="sm"
                className="border-purple-600 text-purple-400 hover:bg-purple-900/30"
                onClick={requestAirdrop}
                disabled={requestingAirdrop || !publicKey}
                isLoading={requestingAirdrop}
                loadingText="Requesting..."
                icon={<RefreshCw className="h-3 w-3" />}
              >
                Get Devnet SOL
              </AnimatedButton>
            </div>
          </div>
        </div>
      </CardContent>
    </AnimatedCard>
  )
}

