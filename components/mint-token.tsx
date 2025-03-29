"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { getOrCreateAssociatedTokenAccount, mintTo, getAccount, getMint, TOKEN_PROGRAM_ID, createMintToInstruction } from "@solana/spl-token"
import { PublicKey, Transaction, Signer } from "@solana/web3.js"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Coins, RefreshCw, AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AnimatedButton } from "@/components/ui/animated-button"
import { TransactionStatus } from "@/components/ui/transaction-status"
import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface TokenInfo {
  mint: string
  balance: string
  decimals: number
}

interface WalletSigner extends Signer {
  publicKey: PublicKey
  signTransaction(tx: Transaction): Promise<Transaction>
  signAllTransactions(txs: Transaction[]): Promise<Transaction[]>
}

export default function MintToken() {
  const { publicKey, sendTransaction } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "processing" | "success" | "error" | "warning">(
    "idle",
  )
  const [statusMessage, setStatusMessage] = useState("")

  const fetchTokens = async (isRefresh = false) => {
    if (!publicKey) return

    try {
      isRefresh ? setIsRefreshing(true) : setIsLoadingTokens(true)

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
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    fetchTokens()
  }, [publicKey, connection])

  const handleMintToken = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!publicKey || !selectedToken || !amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      toast({
        title: "Invalid input",
        description: "Please select a token and enter a valid amount",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setTransactionStatus("processing")
      setStatusMessage("Preparing to mint tokens...")

      const mintPublicKey = new PublicKey(selectedToken)
      const selectedTokenInfo = tokens.find((token) => token.mint === selectedToken)

      if (!selectedTokenInfo) {
        throw new Error("Selected token not found")
      }

      // Get the token account
      setStatusMessage("Getting your token account...")
      
      // Create a transaction for minting
      const transaction = new Transaction()
      
      // Get the token account
      const signer: WalletSigner = {
        publicKey,
        secretKey: new Uint8Array(0),
        signTransaction: async (tx: Transaction) => {
          const signedTx = await sendTransaction(tx, connection)
          return tx
        },
        signAllTransactions: async (txs: Transaction[]) => {
          return txs
        },
      }

      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        signer,
        mintPublicKey,
        publicKey,
      )

      // Mint tokens
      const amountInSmallestUnit = Number(amount) * Math.pow(10, selectedTokenInfo.decimals)

      setStatusMessage(`Minting ${amount} tokens...`)
      
      // Add the mint instruction to the transaction
      transaction.add(
        createMintToInstruction(
          mintPublicKey,
          tokenAccount.address,
          publicKey,
          amountInSmallestUnit,
          [],
          TOKEN_PROGRAM_ID
        )
      )

      // Send and confirm the transaction
      const signature = await sendTransaction(transaction, connection)
      await connection.confirmTransaction(signature, "confirmed")

      setTransactionStatus("success")
      setStatusMessage(`Successfully minted ${amount} tokens!`)

      toast({
        title: "Tokens minted successfully",
        description: `${amount} tokens have been minted to your account`,
      })

      // Refresh token list to show updated balance
      const updatedTokenAccount = await getAccount(connection, tokenAccount.address)
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
    } catch (error) {
      console.error("Error minting tokens:", error)
      setTransactionStatus("error")
      setStatusMessage("Failed to mint tokens")
      toast({
        title: "Error minting tokens",
        description: "There was an error minting your tokens. Please try again.",
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
    <Card className="backdrop-blur-xl bg-black/40 border-purple-500/20">
      <CardHeader className="space-y-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
            <Coins className="h-5 w-5" />
            Mint Token
          </CardTitle>
          <AnimatedButton
            onClick={() => fetchTokens(true)}
            disabled={isRefreshing || isLoading || isLoadingTokens}
            className="bg-black/40 hover:bg-black/60 transition-colors text-sm px-3"
            icon={<RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />}
          >
            Refresh
          </AnimatedButton>
        </div>
        <CardDescription className="text-gray-400">
          Mint additional tokens to your wallet
        </CardDescription>
      </CardHeader>

      <CardContent>
        {!publicKey ? (
          <div className="text-center py-12 space-y-4">
            <Coins className="h-12 w-12 text-purple-500/50 mx-auto" />
            <div>
              <p className="text-gray-400 mb-2">Connect your wallet to mint tokens</p>
              <p className="text-gray-500">You'll need to connect your wallet first</p>
            </div>
          </div>
        ) : isLoadingTokens ? (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
            <p className="text-gray-400">Loading your tokens...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-12 space-y-4">
            <AlertCircle className="h-12 w-12 text-purple-500/50 mx-auto" />
            <div>
              <p className="text-gray-400 mb-2">No tokens found</p>
              <p className="text-gray-500">Create a token first to start minting</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleMintToken} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="token" className="text-sm text-gray-400">
                  Select Token
                </Label>
                <Select
                  value={selectedToken}
                  onValueChange={setSelectedToken}
                >
                  <SelectTrigger
                    id="token"
                    className="w-full bg-black/40 border-purple-500/20 focus:ring-purple-500/30"
                  >
                    <SelectValue placeholder="Select a token to mint" />
                  </SelectTrigger>
                  <SelectContent className="bg-black/60 border-purple-500/20">
                    {tokens.map((token) => (
                      <SelectItem
                        key={token.mint}
                        value={token.mint}
                        className="text-gray-300 focus:bg-purple-500/20 focus:text-white"
                      >
                        <div className="flex items-center justify-between w-full">
                          <span>{shortenAddress(token.mint)}</span>
                          <span className="text-gray-500">Balance: {token.balance}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount" className="text-sm text-gray-400">
                  Amount
                </Label>
                <div className="relative">
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount to mint"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-black/40 border-purple-500/20 focus-visible:ring-purple-500/30 pr-16"
                    min="0"
                    step="any"
                  />
                  {selectedToken && (
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                      <span className="text-sm text-gray-500">Tokens</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {transactionStatus !== "idle" && (
              <TransactionStatus status={transactionStatus} message={statusMessage} />
            )}

            <AnimatedButton
              type="submit"
              className="w-full bg-purple-600 hover:bg-purple-700 transition-colors"
              disabled={isLoading || !selectedToken || !amount}
              isLoading={isLoading}
              loadingText="Minting tokens..."
            >
              Mint Tokens
            </AnimatedButton>
          </form>
        )}
      </CardContent>
    </Card>
  )
}

