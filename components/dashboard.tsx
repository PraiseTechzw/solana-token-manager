"use client"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { LAMPORTS_PER_SOL } from "@solana/web3.js"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WalletInfo from "@/components/wallet-info"
import CreateToken from "@/components/create-token"
import MintToken from "@/components/mint-token"
import SendToken from "@/components/send-token"
import TransactionHistory from "@/components/transaction-history"
import { useToast } from "@/components/ui/use-toast"

export default function Dashboard() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const [balance, setBalance] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchBalance = async () => {
      if (!publicKey) return

      try {
        setIsLoading(true)
        const balance = await connection.getBalance(publicKey)
        setBalance(balance / LAMPORTS_PER_SOL)
      } catch (error) {
        console.error("Error fetching balance:", error)
        toast({
          title: "Error fetching balance",
          description: "Could not retrieve your SOL balance. Please refresh the page.",
          variant: "destructive",
        })
        // Set balance to null to indicate error
        setBalance(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchBalance()

    // Set up interval to refresh balance
    const intervalId = setInterval(fetchBalance, 30000)

    return () => clearInterval(intervalId)
  }, [publicKey, connection, toast])

  return (
    <div className="space-y-8">
      <WalletInfo balance={balance} isLoading={isLoading} />

      <Tabs defaultValue="create" className="w-full">
        <TabsList className="grid grid-cols-4 mb-8">
          <TabsTrigger value="create">Create Token</TabsTrigger>
          <TabsTrigger value="mint">Mint Token</TabsTrigger>
          <TabsTrigger value="send">Send Token</TabsTrigger>
          <TabsTrigger value="history">Transaction History</TabsTrigger>
        </TabsList>

        <TabsContent value="create" className="mt-0">
          <CreateToken />
        </TabsContent>

        <TabsContent value="mint" className="mt-0">
          <MintToken />
        </TabsContent>

        <TabsContent value="send" className="mt-0">
          <SendToken />
        </TabsContent>

        <TabsContent value="history" className="mt-0">
          <TransactionHistory />
        </TabsContent>
      </Tabs>
    </div>
  )
}

