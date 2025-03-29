"use client"

import type React from "react"
import { useState } from "react"
import { useWallet, useConnection } from "@solana/wallet-adapter-react"
import { createMint, getOrCreateAssociatedTokenAccount, mintTo } from "@solana/spl-token"
import { Keypair, PublicKey, SystemProgram, Transaction } from "@solana/web3.js"
import { Signer } from "@solana/web3.js"
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
  const { publicKey, sendTransaction } = useWallet()
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

    if (!publicKey) {
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

      // Create a new mint
      const mintKeypair = Keypair.generate()

      // Create transaction to create mint account
      const lamports = await connection.getMinimumBalanceForRentExemption(82)

      const createMintTransaction = new Transaction().add(
        SystemProgram.createAccount({
          fromPubkey: publicKey,
          newAccountPubkey: mintKeypair.publicKey,
          space: 82,
          lamports,
          programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"), // Token program ID
        }),
      )

      // Send transaction to create mint account
      try {
        const signature = await sendTransaction(createMintTransaction, connection, {
          signers: [mintKeypair],
        })

        setStatusMessage("Confirming mint account creation...")
        await connection.confirmTransaction(signature, "confirmed")
      } catch (error) {
        console.error("Error creating mint account:", error)
        toast({
          title: "Transaction failed",
          description: "Failed to create token. Please check your wallet and try again.",
          variant: "destructive",
        })
        setTransactionStatus("error")
        setStatusMessage("Failed to create token mint account")
        setIsLoading(false)
        return
      }

      // Initialize the mint
      try {
        setStatusMessage("Initializing token mint...")
        const signer = {
          publicKey,
          signTransaction: async (tx: Transaction) => {
            return await sendTransaction(tx, connection)
          },
          signAllTransactions: async (txs: Transaction[]) => {
            return txs
          }
        } as unknown as Signer

        await createMint(
          connection,
          signer,
          publicKey,
          publicKey,
          Number(decimals),
          mintKeypair,
        )
      } catch (error) {
        console.error("Error initializing mint:", error)
        console.error("Error details:", {
          publicKey: publicKey?.toString(),
          mintKeypair: mintKeypair.publicKey.toString(),
          decimals: Number(decimals)
        })
        toast({
          title: "Transaction failed",
          description: "Failed to initialize token. Please try again.",
          variant: "destructive",
        })
        setTransactionStatus("error")
        setStatusMessage("Failed to initialize token mint")
        setIsLoading(false)
        return
      }

      // Create associated token account for the user
      let tokenAccount
      try {
        setStatusMessage("Creating your token account...")
        const signer = {
          publicKey,
          signTransaction: async (tx: Transaction) => {
            return await sendTransaction(tx, connection)
          },
          signAllTransactions: async (txs: Transaction[]) => {
            return txs
          }
        } as unknown as Signer

        tokenAccount = await getOrCreateAssociatedTokenAccount(
          connection,
          signer,
          mintKeypair.publicKey,
          publicKey,
        )
      } catch (error) {
        console.error("Error creating token account:", error)
        toast({
          title: "Transaction partially completed",
          description: "Your token was created but we couldn't create your token account.",
          variant: "default",
        })
        setTransactionStatus("warning")
        setStatusMessage("Token created but token account creation failed")
        setCreatedTokenMint(mintKeypair.publicKey.toString())
        setIsLoading(false)
        return
      }

      // Mint initial supply to the user's token account
      if (Number(initialSupply) > 0) {
        try {
          setStatusMessage("Minting initial token supply...")
          const signer = {
            publicKey,
            signTransaction: async (tx: Transaction) => {
              return await sendTransaction(tx, connection)
            },
            signAllTransactions: async (txs: Transaction[]) => {
              return txs
            }
          } as unknown as Signer

          await mintTo(
            connection,
            signer,
            mintKeypair.publicKey,
            tokenAccount.address,
            publicKey,
            Number(initialSupply) * Math.pow(10, Number(decimals)),
          )
        } catch (error) {
          console.error("Error minting initial supply:", error)
          toast({
            title: "Transaction partially completed",
            description: "Token created but failed to mint initial supply. You can mint tokens later.",
            variant: "default",
          })
          setTransactionStatus("warning")
          setStatusMessage("Token created but initial supply minting failed")
          setCreatedTokenMint(mintKeypair.publicKey.toString())
          setIsLoading(false)
          return
        }
      }

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

