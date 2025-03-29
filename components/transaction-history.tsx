"use client"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import type { ConfirmedSignatureInfo, ParsedTransactionWithMeta } from "@solana/web3.js"
import { CardContent, CardDescription, CardHeader, CardTitle, Card } from "@/components/ui/card"
import {
  Loader2,
  ExternalLink,
  Check,
  X,
  Clock,
  RefreshCw,
  Coins,
  Send,
  Plus,
  History,
} from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AnimatedButton } from "@/components/ui/animated-button"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

export default function TransactionHistory() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  const [transactions, setTransactions] = useState<ConfirmedSignatureInfo[]>([])
  const [parsedTransactions, setParsedTransactions] = useState<(ParsedTransactionWithMeta | null)[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)

  const fetchTransactions = async () => {
    if (!publicKey) return

    try {
      setIsLoading(true)

      // Get recent transactions
      const signatures = await connection.getSignaturesForAddress(publicKey, {
        limit: 10,
      })

      setTransactions(signatures)

      // Parse transactions
      const parsedTxPromises = signatures.map(async (sig) => {
        try {
          return await connection.getParsedTransaction(sig.signature, "confirmed")
        } catch (error) {
          console.error(`Error fetching transaction ${sig.signature}:`, error)
          return null
        }
      })

      const parsedTxs = await Promise.all(parsedTxPromises)
      setParsedTransactions(parsedTxs)
    } catch (error) {
      console.error("Error fetching transactions:", error)
      toast({
        title: "Error fetching transactions",
        description: "Could not retrieve your transaction history",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTransactions()
  }, [publicKey, connection])

  const refreshTransactions = async () => {
    setIsRefreshing(true)
    await fetchTransactions()
  }

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getTransactionType = (tx: ParsedTransactionWithMeta | null) => {
    if (!tx) return { type: "Unknown", icon: History }

    try {
      const instructions = tx.transaction.message.instructions

      // Check for token program instructions
      const tokenProgramInstructions = instructions.filter(
        (ix) => ix.programId?.toString() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      )

      if (tokenProgramInstructions.length > 0) {
        // Try to determine the type of token instruction
        if (tx.meta?.logMessages?.some((log) => log.includes("Create"))) {
          return { type: "Token Creation", icon: Plus }
        } else if (tx.meta?.logMessages?.some((log) => log.includes("MintTo"))) {
          return { type: "Token Mint", icon: Coins }
        } else if (tx.meta?.logMessages?.some((log) => log.includes("Transfer"))) {
          return { type: "Token Transfer", icon: Send }
        } else {
          return { type: "Token Transaction", icon: Coins }
        }
      }

      return { type: "SOL Transaction", icon: Coins }
    } catch (error) {
      console.error("Error determining transaction type:", error)
      return { type: "Unknown", icon: History }
    }
  }

  return (
    <Card className="backdrop-blur-xl bg-black/40 border-purple-500/20">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <History className="h-5 w-5" />
            Transaction History
          </CardTitle>
          <AnimatedButton
            onClick={refreshTransactions}
            disabled={isRefreshing || isLoading}
            className="bg-black/40 hover:bg-black/60 transition-colors text-sm px-3"
            icon={<RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />}
          >
            Refresh
          </AnimatedButton>
        </div>
        <CardDescription className="text-gray-400">
          Recent transactions from your wallet
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-gray-400">Loading your transactions...</p>
          </div>
        ) : !publicKey ? (
          <div className="text-center py-12 space-y-4">
            <History className="h-12 w-12 text-purple-500/50 mx-auto" />
            <div>
              <p className="text-gray-400 mb-2">Connect your wallet to view transactions</p>
              <p className="text-gray-500">Your transaction history will appear here</p>
            </div>
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 space-y-4 animate-in fade-in-50">
            <History className="h-12 w-12 text-purple-500/50 mx-auto" />
            <div>
              <p className="text-gray-400 mb-2">No transactions found</p>
              <p className="text-gray-500">Start creating or sending tokens to see your history</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx, index) => {
              const txType = getTransactionType(parsedTransactions[index])
              const TxIcon = txType.icon

              return (
                <div
                  key={tx.signature}
                  className="p-4 bg-black/40 rounded-lg border border-purple-500/20 transition-all duration-300 hover:border-purple-500/30 hover:shadow-md hover:shadow-purple-500/10 animate-in fade-in-50 slide-in-from-bottom-5"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-full bg-purple-500/10">
                        <TxIcon className="h-4 w-4 text-purple-400" />
                      </div>
                      <div>
                        <span className="text-sm font-medium text-gray-300">
                          {txType.type}
                        </span>
                        <p className="text-xs text-gray-500">
                          {tx.blockTime ? formatDate(tx.blockTime) : "Unknown time"}
                        </p>
                      </div>
                    </div>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <div className="flex items-center">
                            {tx.err ? (
                              <span className="flex items-center text-red-500 text-xs bg-red-500/10 px-2 py-1 rounded-full">
                                <X className="h-3 w-3 mr-1" />
                                Failed
                              </span>
                            ) : tx.confirmationStatus === "confirmed" || tx.confirmationStatus === "finalized" ? (
                              <span className="flex items-center text-green-500 text-xs bg-green-500/10 px-2 py-1 rounded-full">
                                <Check className="h-3 w-3 mr-1" />
                                Success
                              </span>
                            ) : (
                              <span className="flex items-center text-yellow-500 text-xs bg-yellow-500/10 px-2 py-1 rounded-full">
                                <Clock className="h-3 w-3 mr-1" />
                                Pending
                              </span>
                            )}
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>Transaction Status</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-gray-400 mb-1">Signature:</p>
                    <p className="font-mono text-xs break-all text-gray-300">{tx.signature}</p>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <a
                      href={`https://explorer.solana.com/tx/${tx.signature}?cluster=devnet`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs flex items-center text-purple-400 hover:text-purple-300 transition-colors"
                    >
                      View in Explorer
                      <ExternalLink className="h-3 w-3 ml-1" />
                    </a>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

