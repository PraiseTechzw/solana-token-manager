"use client"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import type { ConfirmedSignatureInfo, ParsedTransactionWithMeta } from "@solana/web3.js"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ExternalLink, Check, X, Clock } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AnimatedCard } from "@/components/ui/animated-card"

export default function TransactionHistory() {
  const { publicKey } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  const [transactions, setTransactions] = useState<ConfirmedSignatureInfo[]>([])
  const [parsedTransactions, setParsedTransactions] = useState<(ParsedTransactionWithMeta | null)[]>([])
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
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
      }
    }

    fetchTransactions()
  }, [publicKey, connection, toast])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleString()
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  const getTransactionType = (tx: ParsedTransactionWithMeta | null) => {
    if (!tx) return "Unknown"

    try {
      const instructions = tx.transaction.message.instructions

      // Check for token program instructions
      const tokenProgramInstructions = instructions.filter(
        (ix) => ix.programId?.toString() === "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA",
      )

      if (tokenProgramInstructions.length > 0) {
        // Try to determine the type of token instruction
        if (tx.meta?.logMessages?.some((log) => log.includes("Create"))) {
          return "Token Creation"
        } else if (tx.meta?.logMessages?.some((log) => log.includes("MintTo"))) {
          return "Token Mint"
        } else if (tx.meta?.logMessages?.some((log) => log.includes("Transfer"))) {
          return "Token Transfer"
        } else {
          return "Token Transaction"
        }
      }

      return "SOL Transaction"
    } catch (error) {
      console.error("Error determining transaction type:", error)
      return "Unknown"
    }
  }

  return (
    <AnimatedCard>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>Recent transactions from your wallet</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-8 animate-in fade-in-50">
            <p className="text-gray-400">No transactions found for this wallet.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {transactions.map((tx, index) => (
              <div
                key={tx.signature}
                className="p-4 bg-gray-900 rounded-lg border border-gray-700 transition-all duration-300 hover:border-purple-500/30 hover:shadow-md hover:shadow-purple-500/10 animate-in fade-in-50 slide-in-from-bottom-5"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <span className="text-sm font-medium text-gray-300">
                      {getTransactionType(parsedTransactions[index])}
                    </span>
                    <p className="text-xs text-gray-500">{tx.blockTime ? formatDate(tx.blockTime) : "Unknown time"}</p>
                  </div>
                  <div className="flex items-center">
                    {tx.err ? (
                      <span className="flex items-center text-red-500 text-xs">
                        <X className="h-3 w-3 mr-1" />
                        Failed
                      </span>
                    ) : tx.confirmationStatus === "confirmed" || tx.confirmationStatus === "finalized" ? (
                      <span className="flex items-center text-green-500 text-xs">
                        <Check className="h-3 w-3 mr-1" />
                        Success
                      </span>
                    ) : (
                      <span className="flex items-center text-yellow-500 text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending
                      </span>
                    )}
                  </div>
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
            ))}
          </div>
        )}
      </CardContent>
    </AnimatedCard>
  )
}

