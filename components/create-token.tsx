"use client"

import type React from "react"
import { useState } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import {
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  getMint,
} from "@solana/spl-token"
import { Keypair, SystemProgram, Transaction } from "@solana/web3.js"
import { CardContent, CardDescription, CardHeader, CardTitle, Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Coins, ArrowRight, Info, Copy, CheckCircle2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AnimatedButton } from "@/components/ui/animated-button"
import { AnimatedCard } from "@/components/ui/animated-card"
import { TransactionStatus } from "@/components/ui/transaction-status"
import { Confetti } from "@/components/ui/confetti"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export default function CreateToken() {
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()
  const { toast } = useToast()

  const [name, setName] = useState("")
  const [symbol, setSymbol] = useState("")
  const [decimals, setDecimals] = useState("9")
  const [initialSupply, setInitialSupply] = useState("1000000")
  const [isLoading, setIsLoading] = useState(false)
  const [createdTokenMint, setCreatedTokenMint] = useState<string | null>(null)
  const [transactionStatus, setTransactionStatus] = useState<"idle" | "processing" | "success" | "error" | "warning">(
    "idle",
  )
  const [statusMessage, setStatusMessage] = useState("")
  const [showConfetti, setShowConfetti] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tokenDetails, setTokenDetails] = useState<{ name: string; symbol: string }>({ name: "", symbol: "" })

  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!publicKey || !signTransaction) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to create a token",
        variant: "destructive",
      })
      return
    }

    // Validate inputs
    if (!name.trim()) {
      toast({
        title: "Invalid token name",
        description: "Please enter a valid token name",
        variant: "destructive",
      })
      return
    }

    if (!symbol.trim()) {
      toast({
        title: "Invalid token symbol",
        description: "Please enter a valid token symbol",
        variant: "destructive",
      })
      return
    }

    try {
      setIsLoading(true)
      setTransactionStatus("processing")
      setStatusMessage("Creating your token mint account...")

      // Create a new mint keypair
      const mintKeypair = Keypair.generate()
      console.log("Mint public key:", mintKeypair.publicKey.toString())

      // Calculate the space and rent for the mint account
      const mintSpace = 82 // Size of a mint account
      const rentExemptionAmount = await connection.getMinimumBalanceForRentExemption(mintSpace)

      // Step 1: Create the mint account
      const createMintAccountIx = SystemProgram.createAccount({
        fromPubkey: publicKey,
        newAccountPubkey: mintKeypair.publicKey,
        lamports: rentExemptionAmount,
        space: mintSpace,
        programId: TOKEN_PROGRAM_ID,
      })

      // Step 2: Initialize the mint
      const initializeMintIx = createInitializeMintInstruction(
        mintKeypair.publicKey,
        Number(decimals),
        publicKey,
        publicKey,
        TOKEN_PROGRAM_ID,
      )

      // Step 3: Get the associated token account address
      const associatedTokenAddress = await getAssociatedTokenAddress(
        mintKeypair.publicKey,
        publicKey,
        false,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      // Step 4: Create the associated token account
      const createAssociatedTokenAccountIx = createAssociatedTokenAccountInstruction(
        publicKey,
        associatedTokenAddress,
        publicKey,
        mintKeypair.publicKey,
        TOKEN_PROGRAM_ID,
        ASSOCIATED_TOKEN_PROGRAM_ID,
      )

      // Step 5: Mint tokens to the associated token account if initial supply > 0
      let mintToIx
      if (Number(initialSupply) > 0) {
        const mintAmount = Number(initialSupply) * Math.pow(10, Number(decimals))
        mintToIx = createMintToInstruction(
          mintKeypair.publicKey,
          associatedTokenAddress,
          publicKey,
          BigInt(mintAmount),
          [],
          TOKEN_PROGRAM_ID,
        )
      }

      // Create a transaction and add all instructions
      const transaction = new Transaction()
      transaction.add(createMintAccountIx)
      transaction.add(initializeMintIx)
      transaction.add(createAssociatedTokenAccountIx)

      if (mintToIx) {
        transaction.add(mintToIx)
      }

      // Set the fee payer and get a recent blockhash
      transaction.feePayer = publicKey
      const { blockhash } = await connection.getLatestBlockhash()
      transaction.recentBlockhash = blockhash

      // Sign the transaction with the mint keypair first
      transaction.partialSign(mintKeypair)

      // Then sign with the user's wallet
      const signedTx = await signTransaction(transaction)

      // Send the fully signed transaction
      setStatusMessage("Sending transaction...")
      const txid = await connection.sendRawTransaction(signedTx.serialize())
      console.log("Transaction sent:", txid)

      // Confirm the transaction
      setStatusMessage("Confirming transaction...")
      const confirmation = await connection.confirmTransaction(txid, "confirmed")

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err.toString()}`)
      }

      // Verify the mint was created successfully
      try {
        const mintInfo = await getMint(connection, mintKeypair.publicKey)
        console.log("Mint info:", mintInfo)
      } catch (error) {
        console.error("Error getting mint info:", error)
      }

      // Success!
      setCreatedTokenMint(mintKeypair.publicKey.toString())
      setTokenDetails({ name, symbol })
      setTransactionStatus("success")
      setStatusMessage(`Token ${symbol || "Token"} created successfully!`)
      setShowConfetti(true)

      toast({
        title: "Token created successfully",
        description: `Your token ${name} (${symbol}) has been created with mint address: ${mintKeypair.publicKey.toString()}`,
      })
    } catch (error) {
      console.error("Error creating token:", error)
      toast({
        title: "Error creating token",
        description: "There was an error creating your token. Please try again.",
        variant: "destructive",
      })
      setTransactionStatus("error")
      setStatusMessage("Token creation failed")
    } finally {
      setIsLoading(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <TooltipProvider>
      {showConfetti && <Confetti />}
      <div className="max-w-2xl mx-auto p-4">
        <AnimatedCard className="backdrop-blur-xl bg-black/40 border-purple-500/20">
          <CardHeader className="space-y-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                Create New Token
              </CardTitle>
              <div className="flex items-center space-x-2 text-sm text-gray-400">
                <span className="px-2 py-1 rounded-full bg-purple-900/30 border border-purple-700/30">
                  Solana Devnet
                </span>
              </div>
            </div>
            <CardDescription className="text-gray-400">
              Create your own SPL token with custom parameters
            </CardDescription>
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

            {createdTokenMint ? (
              <div className="space-y-6 animate-in fade-in-50">
                <div className="p-6 rounded-lg border border-green-500/20 bg-green-900/10">
                  <div className="flex items-center space-x-2 mb-4">
                    <CheckCircle2 className="h-6 w-6 text-green-500" />
                    <h3 className="text-xl font-semibold text-green-400">Token Created Successfully!</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div>
                        <span className="text-sm text-gray-400">Token Name</span>
                        <p className="text-white font-medium">{tokenDetails.name}</p>
                      </div>
                      <div>
                        <span className="text-sm text-gray-400">Token Symbol</span>
                        <p className="text-white font-medium">{tokenDetails.symbol}</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-gray-400">Token Mint Address</span>
                        <button
                          onClick={() => copyToClipboard(createdTokenMint)}
                          className="flex items-center space-x-1 text-xs text-purple-400 hover:text-purple-300 transition-colors"
                        >
                          {copied ? <CheckCircle2 className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          <span>{copied ? "Copied!" : "Copy"}</span>
                        </button>
                      </div>
                      <div className="font-mono text-sm bg-black/40 p-3 rounded-lg border border-purple-500/20 break-all">
                        {createdTokenMint}
                      </div>
                    </div>

                    <div className="bg-purple-900/20 border border-purple-500/20 rounded-lg p-4">
                      <h4 className="text-sm font-medium text-purple-400 mb-2">Next Steps</h4>
                      <ul className="text-sm text-gray-400 space-y-2">
                        <li className="flex items-center space-x-2">
                          <ArrowRight className="h-4 w-4 text-purple-400" />
                          <span>Mint additional tokens to your wallet</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <ArrowRight className="h-4 w-4 text-purple-400" />
                          <span>Send tokens to other wallets</span>
                        </li>
                        <li className="flex items-center space-x-2">
                          <ArrowRight className="h-4 w-4 text-purple-400" />
                          <span>Add token to your wallet</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <AnimatedButton
                  onClick={() => {
                    setCreatedTokenMint(null)
                    setTransactionStatus("idle")
                    setShowConfetti(false)
                  }}
                  className="w-full bg-purple-600 hover:bg-purple-700 transition-colors"
                  icon={<Coins className="h-4 w-4" />}
                >
                  Create Another Token
                </AnimatedButton>
              </div>
            ) : (
              <form onSubmit={handleCreateToken} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="name" className="text-gray-200">
                        Token Name
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>The display name of your token</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="name"
                      placeholder="e.g., My Amazing Token"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      className="bg-black/40 border-purple-500/20 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="symbol" className="text-gray-200">
                        Token Symbol
                      </Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400" />
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>A short identifier for your token (max 10 characters)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Input
                      id="symbol"
                      placeholder="e.g., MTK"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      required
                      maxLength={10}
                      className="bg-black/40 border-purple-500/20 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="decimals" className="text-gray-200">
                          Decimals
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Number of decimal places (0-9). Most tokens use 9 decimals.</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="decimals"
                        type="number"
                        placeholder="9"
                        value={decimals}
                        onChange={(e) => setDecimals(e.target.value)}
                        min="0"
                        max="9"
                        required
                        className="bg-black/40 border-purple-500/20 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="initialSupply" className="text-gray-200">
                          Initial Supply
                        </Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="h-4 w-4 text-gray-400" />
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>The initial amount of tokens to mint</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Input
                        id="initialSupply"
                        type="number"
                        placeholder="1000000"
                        value={initialSupply}
                        onChange={(e) => setInitialSupply(e.target.value)}
                        min="0"
                        required
                        className="bg-black/40 border-purple-500/20 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-4">
                  <AnimatedButton
                    type="submit"
                    className="w-full bg-purple-600 hover:bg-purple-700 transition-colors"
                    isLoading={isLoading}
                    loadingText="Creating Token..."
                    icon={<Coins className="h-4 w-4" />}
                    disabled={!publicKey}
                  >
                    {publicKey ? "Create Token" : "Connect Wallet to Create Token"}
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

