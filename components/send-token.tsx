"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  TOKEN_PROGRAM_ID,
  getMint,
  getAccount,
  ASSOCIATED_TOKEN_PROGRAM_ID,
} from "@solana/spl-token"
import { PublicKey, Transaction } from "@solana/web3.js"
import { CardContent, CardDescription, CardHeader, CardTitle, Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, SendHorizontal, Info, ArrowRight, Coins, RefreshCw } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AnimatedButton } from "@/components/ui/animated-button"
import { AnimatedCard } from "@/components/ui/animated-card"
import { TransactionStatus } from "@/components/ui/transaction-status"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

interface TokenInfo {
  mint: string
  balance: string
  decimals: number
  symbol?: string
  name?: string
}

const TOKEN_METADATA_PROGRAM_ID = new PublicKey("metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s")

const parseMetadataData = (data: Buffer) => {
  // Skip first byte (key)
  let offset = 1
  
  // Read name (32 bytes)
  const nameBytes = data.slice(offset, offset + 32)
  const name = new TextDecoder().decode(nameBytes).replace(/\0/g, '')
  offset += 32

  // Read symbol (10 bytes)
  const symbolBytes = data.slice(offset, offset + 10)
  const symbol = new TextDecoder().decode(symbolBytes).replace(/\0/g, '')

  return { name, symbol }
}

export default function SendToken() {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  const [tokens, setTokens] = useState<TokenInfo[]>([])
  const [selectedToken, setSelectedToken] = useState<string>("")
  const [recipientAddress, setRecipientAddress] = useState("")
  const [amount, setAmount] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingTokens, setIsLoadingTokens] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "processing" | "success" | "error" | "warning">(
    "idle",
  )
  const [statusMessage, setStatusMessage] = useState("")
  const [copied, setCopied] = useState(false)

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

          // Get token metadata
          const [metadataAddress] = PublicKey.findProgramAddressSync(
            [
              Buffer.from("metadata"),
              TOKEN_METADATA_PROGRAM_ID.toBuffer(),
              new PublicKey(mintAddress).toBuffer(),
            ],
            TOKEN_METADATA_PROGRAM_ID
          )

          let name = undefined
          let symbol = undefined

          try {
            const metadataAccount = await connection.getAccountInfo(metadataAddress)
            if (metadataAccount && metadataAccount.data.length > 0) {
              const { name: metadataName, symbol: metadataSymbol } = parseMetadataData(metadataAccount.data)
              name = metadataName
              symbol = metadataSymbol
            }
          } catch (error) {
            console.log("Could not fetch token metadata:", error)
          }

          return {
            mint: mintAddress,
            balance: balance.toString(),
            decimals: mintInfo.decimals,
            name: name || shortenAddress(mintAddress),
            symbol: symbol || mintAddress.slice(0, 4),
          } as TokenInfo
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

  const handleSendToken = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!publicKey || !signTransaction || !selectedToken || !recipientAddress || !amount) {
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

      // Create a transaction
      const transaction = new Transaction()

      // Get the sender's token account address
      setStatusMessage("Getting your token account...")
      const senderTokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      // Verify the sender's token account exists
      try {
        await getAccount(connection, senderTokenAddress)
      } catch (error) {
        toast({
          title: "Token account not found",
          description: "You don't have a token account for this token",
          variant: "destructive",
        })
        setTransactionStatus("error")
        setStatusMessage("Token account not found")
        setIsLoading(false)
        return
      }

      // Get the recipient's token account address
      setStatusMessage("Getting recipient's token account...")
      const recipientTokenAddress = await getAssociatedTokenAddress(
        mintPublicKey,
        recipientPublicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      // Check if the recipient's token account exists
      let recipientTokenAccountExists = false
      try {
        await getAccount(connection, recipientTokenAddress)
        recipientTokenAccountExists = true
      } catch (error) {
        // Account doesn't exist, we'll create it
        console.log("Recipient token account doesn't exist, creating it...")
      }

      // If the recipient token account doesn't exist, add instruction to create it
      if (!recipientTokenAccountExists) {
        transaction.add(
          createAssociatedTokenAccountInstruction(
            publicKey,
            recipientTokenAddress,
            recipientPublicKey,
            mintPublicKey,
            TOKEN_PROGRAM_ID,
            ASSOCIATED_TOKEN_PROGRAM_ID,
          ),
        )
      }

      // Calculate amount in smallest unit
      const amountInSmallestUnit = Math.floor(Number(amount) * Math.pow(10, selectedTokenInfo.decimals))

      // Create transfer instruction
      const transferInstruction = createTransferInstruction(
        senderTokenAddress,
        recipientTokenAddress,
        publicKey,
        BigInt(amountInSmallestUnit),
        [],
        TOKEN_PROGRAM_ID,
      )

      // Add the transfer instruction to the transaction
      transaction.add(transferInstruction)

      // Set the fee payer and get a recent blockhash
      transaction.feePayer = publicKey
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Sign with the user's wallet
      const signedTx = await signTransaction(transaction)

      // Send the signed transaction
      setStatusMessage(`Sending ${amount} tokens...`)
      const signature = await connection.sendRawTransaction(signedTx.serialize())

      // Confirm the transaction
      setStatusMessage("Confirming transaction...")
      const confirmation = await connection.confirmTransaction(signature, "confirmed")

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`)
      }

      setTransactionStatus("success")
      setStatusMessage(`Successfully sent ${amount} tokens!`)

      toast({
        title: "Tokens sent successfully",
        description: `${amount} tokens have been sent to ${recipientAddress.slice(0, 6)}...${recipientAddress.slice(-4)}`,
      })

      // Refresh token list to show updated balance
      await fetchTokens(true)
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

  const getTokenDisplayName = (token: TokenInfo) => {
    if (token.name) return token.name
    if (token.symbol) return token.symbol
    return shortenAddress(token.mint)
  }

  const shortenAddress = (address: string) => {
    return `${address.slice(0, 4)}...${address.slice(-4)}`
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const selectedTokenInfo = tokens.find((token) => token.mint === selectedToken)

  return (
    <TooltipProvider>
      <div className="max-w-2xl mx-auto p-4">
        <AnimatedCard className="backdrop-blur-xl bg-black/40 border-purple-500/20">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                Send Tokens
              </CardTitle>
              <div className="flex items-center space-x-2">
                <AnimatedButton
                  onClick={() => fetchTokens(true)}
                  disabled={isRefreshing || isLoading || isLoadingTokens}
                  className="bg-black/40 hover:bg-black/60 transition-colors text-sm px-3"
                  icon={<RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />}
                >
                  Refresh
                </AnimatedButton>
                <span className="px-2 py-1 rounded-full bg-purple-900/30 border border-purple-700/30 text-sm text-gray-400">
                  Solana Devnet
                </span>
              </div>
            </div>
            <CardDescription className="text-gray-400">Send your SPL tokens to any Solana wallet</CardDescription>
          </CardHeader>

          <CardContent>
            {transactionStatus !== "idle" && (
              <div className="mb-6">
                <Card
                  className={cn(
                    "p-4 border transition-colors duration-200",
                    transactionStatus === "processing" && "border-yellow-600/50 bg-yellow-900/10",
                    transactionStatus === "success" && "border-green-600/50 bg-green-900/10",
                    transactionStatus === "error" && "border-red-600/50 bg-red-900/10",
                    transactionStatus === "warning" && "border-orange-600/50 bg-orange-900/10",
                  )}
                >
                  <TransactionStatus status={transactionStatus} message={statusMessage} />
                </Card>
              </div>
            )}

            {!publicKey ? (
              <div className="text-center py-12 space-y-4 animate-in fade-in-50">
                <div className="flex justify-center">
                  <SendHorizontal className="h-12 w-12 text-purple-500/50" />
                </div>
                <div>
                  <p className="text-gray-400 mb-2">Connect your wallet to send tokens</p>
                  <p className="text-gray-500">You'll need to connect your wallet first</p>
                </div>
              </div>
            ) : isLoadingTokens ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4">
                <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
                <p className="text-gray-400">Loading your tokens...</p>
              </div>
            ) : tokens.length === 0 ? (
              <div className="text-center py-12 space-y-4 animate-in fade-in-50">
                <div className="flex justify-center">
                  <Coins className="h-12 w-12 text-purple-500/50" />
                </div>
                <div>
                  <p className="text-gray-400 mb-2">You don't have any tokens to send.</p>
                  <p className="text-gray-500">Create or receive tokens first to be able to send them.</p>
                </div>
                <AnimatedButton
                  onClick={() => (window.location.href = "/create")}
                  className="bg-purple-600 hover:bg-purple-700 transition-colors"
                  icon={<ArrowRight className="h-4 w-4" />}
                >
                  Create a Token
                </AnimatedButton>
              </div>
            ) : (
              <form onSubmit={handleSendToken} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="token" className="text-gray-200">
                        Select Token
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Choose a token from your wallet to send</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Select value={selectedToken} onValueChange={setSelectedToken}>
                      <SelectTrigger className="bg-black/40 border-purple-500/20 transition-all focus:border-purple-500 focus:ring-purple-500/20">
                        <SelectValue placeholder="Select a token" />
                      </SelectTrigger>
                      <SelectContent>
                        {tokens.map((token) => (
                          <SelectItem key={token.mint} value={token.mint}>
                            <div className="flex justify-between w-full items-center">
                              <div className="flex items-center space-x-2">
                                <span className="font-medium">{token.symbol || token.mint.slice(0, 4)}</span>
                                <span className="text-gray-400 text-sm">
                                  {token.name || shortenAddress(token.mint)}
                                </span>
                              </div>
                              <span className="text-purple-400">Balance: {token.balance}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="recipient" className="text-gray-200">
                        Recipient Address
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The Solana wallet address to send tokens to</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="recipient"
                      placeholder="Enter Solana address"
                      value={recipientAddress}
                      onChange={(e) => setRecipientAddress(e.target.value)}
                      required
                      className="font-mono text-sm bg-black/40 border-purple-500/20 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="amount" className="text-gray-200">
                        Amount
                      </Label>
                      <div className="flex items-center space-x-2">
                        {selectedTokenInfo && (
                          <button
                            type="button"
                            onClick={() => setAmount(selectedTokenInfo.balance)}
                            className="text-xs text-purple-400 hover:text-purple-300 transition-colors"
                          >
                            MAX
                          </button>
                        )}
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Amount of tokens to send</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                    </div>
                    <Input
                      id="amount"
                      type="number"
                      placeholder="Enter amount"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      min="0"
                      step="0.000001"
                      required
                      className="bg-black/40 border-purple-500/20 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                    />
                    {selectedTokenInfo && (
                      <p className="text-sm text-gray-400 mt-1">
                        Balance: {selectedTokenInfo.balance} {selectedTokenInfo.symbol || "tokens"}
                      </p>
                    )}
                  </div>
                </div>

                <div className="pt-4">
                  <AnimatedButton
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 transition-colors"
                    disabled={isLoading || !selectedToken || !recipientAddress || !amount || !publicKey}
                    isLoading={isLoading}
                    loadingText="Sending Tokens..."
                    icon={<SendHorizontal className="h-4 w-4" />}
                  >
                    {publicKey
                      ? selectedToken && recipientAddress && amount
                        ? "Send Tokens"
                        : "Fill in all fields"
                      : "Connect Wallet to Send Tokens"}
                  </AnimatedButton>
                </div>
              </form>
            )}
          </CardContent>
        </AnimatedCard>
      </div>
    </TooltipProvider>
  )
}

