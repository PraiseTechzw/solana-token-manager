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
import { CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Coins, ArrowRight } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { AnimatedButton } from "@/components/ui/animated-button"
import { AnimatedCard } from "@/components/ui/animated-card"
import { TransactionStatus } from "@/components/ui/transaction-status"
import { Confetti } from "@/components/ui/confetti"

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
      setTransactionStatus("success")
      setStatusMessage(`Token ${symbol || "Token"} created successfully!`)
      setShowConfetti(true)

      toast({
        title: "Token created successfully",
        description: `Your token ${symbol || "Token"} has been created with mint address: ${mintKeypair.publicKey.toString()}`,
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

  return (
    <>
      {showConfetti && <Confetti />}
      <AnimatedCard>
        <CardHeader>
          <CardTitle>Create New Token</CardTitle>
          <CardDescription>Create your own SPL token on Solana devnet</CardDescription>
        </CardHeader>
        <CardContent>
          {transactionStatus !== "idle" && (
            <div className="mb-6">
              <TransactionStatus status={transactionStatus} message={statusMessage} />
            </div>
          )}

          {createdTokenMint ? (
            <div className="space-y-4">
              <div className="p-4 bg-green-900/30 border border-green-700 rounded-lg animate-in fade-in-50 slide-in-from-bottom-5">
                <h3 className="text-lg font-medium text-green-400 mb-2">Token Created Successfully!</h3>
                <p className="text-sm text-gray-300 mb-1">Token Mint Address:</p>
                <p className="font-mono text-sm bg-gray-900 p-2 rounded break-all">{createdTokenMint}</p>
                <p className="mt-4 text-sm text-gray-400">
                  You can now mint additional tokens or send tokens to other wallets.
                </p>
              </div>
              <AnimatedButton
                onClick={() => {
                  setCreatedTokenMint(null)
                  setTransactionStatus("idle")
                  setShowConfetti(false)
                }}
                className="w-full"
                icon={<ArrowRight className="h-4 w-4" />}
              >
                Create Another Token
              </AnimatedButton>
            </div>
          ) : (
            <form onSubmit={handleCreateToken} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Token Name</Label>
                <Input
                  id="name"
                  placeholder="My Token"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="bg-gray-900 border-gray-700 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="symbol">Token Symbol</Label>
                <Input
                  id="symbol"
                  placeholder="MTK"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  required
                  maxLength={10}
                  className="bg-gray-900 border-gray-700 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="decimals">Decimals</Label>
                  <Input
                    id="decimals"
                    type="number"
                    placeholder="9"
                    value={decimals}
                    onChange={(e) => setDecimals(e.target.value)}
                    min="0"
                    max="9"
                    required
                    className="bg-gray-900 border-gray-700 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="initialSupply">Initial Supply</Label>
                  <Input
                    id="initialSupply"
                    type="number"
                    placeholder="1000000"
                    value={initialSupply}
                    onChange={(e) => setInitialSupply(e.target.value)}
                    min="0"
                    required
                    className="bg-gray-900 border-gray-700 transition-all focus:border-purple-500 focus:ring-purple-500/20"
                  />
                </div>
              </div>

              <AnimatedButton
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-700"
                isLoading={isLoading}
                loadingText="Creating Token..."
                icon={<Coins className="h-4 w-4" />}
              >
                Create Token
              </AnimatedButton>
            </form>
          )}
        </CardContent>
      </AnimatedCard>
    </>
  )
}

