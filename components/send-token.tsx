"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import {
  getOrCreateAssociatedTokenAccount,
  getAccount,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getMint,
} from "@solana/spl-token"
import { PublicKey, Transaction } from "@solana/web3.js"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, SendHorizontal } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AnimatedButton } from "@/components/ui/animated-button"
import { AnimatedCard } from "@/components/ui/animated-card"
import { TransactionStatus } from "@/components/ui/transaction-status"
import { Signer } from "@solana/web3.js"

interface TokenInfo {
  mint: string
  balance: string
  decimals: number
}

export default function SendToken() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "processing" | "success" | "error" | "warning">(
    "idle",
  )
  const [statusMessage, setStatusMessage] = useState("")

  useEffect(() => {
    const fetchTokens = async () => {
      if (!publicKey) return

      try {
        setIsLoadingTokens(true)

        // Get all token accounts owned by the user
        const tokenAccounts = await connection.getParsedTokenAccountsByOwner(publicKey, { programId: TOKEN_PROGRAM_ID })

        const tokenInfoPromises = tokenAccounts.value.map(async (tokenAccount) => {
          const accountInfo = tokenAccount.account.data.parsed.info
          const mintAddress = accountInfo.mint
          const balance = accountInfo.tokenAmount.uiAmount

          try {
            // Get mint info to get decimals
            const mintInfo = await getMint(connection, new PublicKey(mintAddress))

            return {
              mint: mintAddress,
              balance: balance.toString(),
              decimals: mintInfo.decimals,
            }
          } catch (error) {
            console.error(`Error fetching mint info for ${mintAddress}:`, error)
            return null
          }
        })

        const tokenInfos = (await Promise.all(tokenInfoPromises)).filter((info): info is TokenInfo => info !== null)

        setTokens(tokenInfos)
      } catch (error) {
        console.error("Error fetching tokens:", error)
        toast({
          title: "Error fetching tokens",
          description: "Could not retrieve your token accounts",
          variant: "destructive",
        })
      } finally {
        setIsLoadingTokens(false)
      }
    }

    fetchTokens()
  }, [publicKey, connection, toast])

  const handleSendToken = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!publicKey || !selectedToken || !recipientAddress) {
      toast({
        title: "Invalid input",
        description: "Please select a token, enter a recipient address, and an amount",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setTransactionStatus("processing")
      setStatusMessage("Preparing to send tokens...")

      // Validate recipient address
      let recipientPublicKey: PublicKey
      try {
        recipientPublicKey = new PublicKey(recipientAddress)
      } catch (error) {
        toast({
          title: "Invalid recipient address",
          description: "Please enter a valid Solana address",
          variant: "destructive",
        })
        setTransactionStatus("error")
        setStatusMessage("Invalid recipient address")
        setIsLoading(false)
        return
      }

      const mintPublicKey = new PublicKey(selectedToken)
      const selectedTokenInfo = tokens.find((token) => token.mint === selectedToken)

      if (!selectedTokenInfo) {
        throw new Error("Selected token not found")
      }

      // Get the sender's token account
      setStatusMessage("Getting your token account...")
      const senderTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        {
          publicKey,
          signTransaction: async (tx: Transaction) => {
            return await sendTransaction(tx, connection)
          },
          signAllTransactions: async (txs: Transaction[]) => {
            return txs
          }
        } as unknown as Signer,
        mintPublicKey,
        publicKey,
      )

      // Get or create the recipient's token account
      setStatusMessage("Creating recipient token account...")
      const recipientTokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        {
          publicKey,
          signTransaction: async (tx: Transaction) => {
            return await sendTransaction(tx, connection)
          },
          signAllTransactions: async (txs: Transaction[]) => {
            return txs
          }
        } as unknown as Signer,
        mintPublicKey,
        recipientPublicKey,
      )

      // Calculate amount in smallest unit
      const amountInSmallestUnit = Number(amount) * Math.pow(10, selectedTokenInfo.decimals)

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        senderTokenAccount.address,
        recipientTokenAccount.address,
        publicKey,
        BigInt(amountInSmallestUnit),
      )

      // Create and send transaction
      setStatusMessage(`Sending ${amount} tokens...`)
      const transaction = new Transaction().add(transferInstruction)
      const signature = await sendTransaction(transaction, connection)

      await connection.confirmTransaction(signature, "confirmed")

      setTransactionStatus("success")
      setStatusMessage(`Successfully sent ${amount} tokens!`)

      toast({
        title: "Tokens sent successfully",
        description: `${amount} tokens have been sent to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
      })

      // Refresh token list to show updated balance
      const updatedTokenAccount = await getAccount(connection, senderTokenAccount.address)
      const updatedTokens = tokens.map((token) => {
        if (token.mint === selectedToken) {
          return {
            ...token,
            balance: (Number(updatedTokenAccount.amount) / Math.pow(10, token.decimals)).toString(),
          }
        }
        return token
      })

      setTokens(updatedTokens)
      setAmount("")
      setRecipientAddress("")
    } catch (error) {
      console.error("Error sending tokens:", error)
      setTransactionStatus("error")
      setStatusMessage("Failed to send tokens")
      toast({
        title: "Error sending tokens",
        description: "There was an error sending your tokens. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)

      // Reset transaction status after a delay
      setTimeout(() => {
        if (transactionStatus !== "processing") {
          setTransactionStatus("idle")
        }
      }, 5000)
    }
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`
  }

  return (
    <AnimatedCard>
      <CardHeader>
        <CardTitle>Send Tokens</CardTitle>
        <CardDescription>Send tokens to another wallet</CardDescription>
      </CardHeader>
      <CardContent>
        {transactionStatus !== "idle" && (
          <div className="mb-6">
            <TransactionStatus status={transactionStatus} message={statusMessage} />
          </div>
        )}

        {isLoadingTokens ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-8 animate-in fade-in-50">
            <p className="text-gray-400 mb-4">You don't have any tokens to send.</p>
            <p className="text-gray-400">Create a token first to be able to send tokens.</p>
          </div>
        ) : (
          <form onSubmit={handleSendToken} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Select Token</Label>
              <Select value={selectedToken} onValueChange={setSelectedToken}>
                <SelectTrigger className="bg-gray-900 border-gray-700 transition-all focus:border-purple-500 focus:ring-purple-500/20">
                  <SelectValue placeholder="Select a token" />
                </SelectTrigger>
                <SelectContent>
                  {tokens.map((token) => (
                    <SelectItem key={token.mint} value={token.mint}>
                      <div className="flex justify-between w-full">
                        <span>{shortenAddress(token.mint)}</span>
                        <span className="text-gray-400">Balance: {token.balance}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recipient">Recipient Address</Label>
              <Input
                id="recipient"
                placeholder="Solana address"
                value={recipientAddress}
                onChange={(e) => setRecipientAddress(e.target.value)}
                required
                className="bg-gray-900 border-gray-700 font-mono text-sm transition-all focus:border-purple-500 focus:ring-purple-500/20"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                min="0"
                step="0.000001"
                required
                className="bg-gray-900 border-gray-700 transition-all focus:border-purple-500 focus:ring-purple-500/20"
              />
            </div>

            <AnimatedButton
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700"
              disabled={isLoading || !selectedToken || !recipientAddress}
              isLoading={isLoading}
              loadingText="Sending Tokens..."
              icon={<SendHorizontal className="h-4 w-4" />}
            >
              Send Tokens
            </AnimatedButton>
          </form>
        )}
      </CardContent>
    </AnimatedCard>
  )
}

