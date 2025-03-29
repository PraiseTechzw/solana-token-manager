"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { getOrCreateAssociatedTokenAccount, mintTo, getAccount, getMint, TOKEN_PROGRAM_ID } from "@solana/spl-token"
import { PublicKey } from "@solana/web3.js"
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, CoinsIcon as CoinIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AnimatedButton } from "@/components/ui/animated-button"
import { AnimatedCard } from "@/components/ui/animated-card"
import { TransactionStatus } from "@/components/ui/transaction-status"

interface TokenInfo {
  mint: string
  balance: string
  decimals: number
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

  const handleMintToken = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!publicKey || !selectedToken) {
      toast({
        title: "Invalid input",
        description: "Please select a token and enter an amount",
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
      const tokenAccount = await getOrCreateAssociatedTokenAccount(
        connection,
        {
          publicKey: publicKey,
          secretKey: new Uint8Array(0),
          signTransaction: async (tx) => {
            return await sendTransaction(tx, connection)
          },
          signAllTransactions: async (txs) => {
            return txs
          },
        },
        mintPublicKey,
        publicKey,
      )

      // Mint tokens
      const amountInSmallestUnit = Number(amount) * Math.pow(10, selectedTokenInfo.decimals)

      setStatusMessage(`Minting ${amount} tokens...`)
      await mintTo(
        connection,
        {
          publicKey: publicKey,
          secretKey: new Uint8Array(0),
          signTransaction: async (tx) => {
            return await sendTransaction(tx, connection)
          },
          signAllTransactions: async (txs) => {
            return txs
          },
        },
        mintPublicKey,
        tokenAccount.address,
        publicKey,
        amountInSmallestUnit,
      )

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
    <AnimatedCard>
      <CardHeader>
        <CardTitle>Mint Tokens</CardTitle>
        <CardDescription>Mint additional tokens to your wallet</CardDescription>
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
            <p className="text-gray-400 mb-4">You don't have any tokens yet.</p>
            <p className="text-gray-400">Create a token first to mint additional supply.</p>
          </div>
        ) : (
          <form onSubmit={handleMintToken} className="space-y-4">
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
              <Label htmlFor="amount">Amount to Mint</Label>
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
              disabled={!selectedToken}
              isLoading={isLoading}
              loadingText="Minting Tokens..."
              icon={<CoinIcon className="h-4 w-4" />}
            >
              Mint Tokens
            </AnimatedButton>
          </form>
        )}
      </CardContent>
    </AnimatedCard>
  )
}

