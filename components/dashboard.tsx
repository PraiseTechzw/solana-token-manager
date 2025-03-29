"use client"

import { useState } from "react"
import { useWallet } from "@solana/wallet-adapter-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import WalletInfo from "@/components/wallet-info"
import CreateToken from "@/components/create-token"
import MintToken from "@/components/mint-token"
import SendToken from "@/components/send-token"
import TransactionHistory from "@/components/transaction-history"
import { Coins, Plus, SendHorizontal, History } from "lucide-react"
import { cn } from "@/lib/utils"
import { Card } from "@/components/ui/card"

export default function Dashboard() {
  const { publicKey } = useWallet()
  const [activeTab, setActiveTab] = useState("create")

  const tabs = [
    {
      value: "create",
      label: "Create Token",
      icon: <Plus className="h-4 w-4" />,
      content: <CreateToken />,
    },
    {
      value: "mint",
      label: "Mint Token",
      icon: <Coins className="h-4 w-4" />,
      content: <MintToken />,
    },
    {
      value: "send",
      label: "Send Token",
      icon: <SendHorizontal className="h-4 w-4" />,
      content: <SendToken />,
    },
    {
      value: "history",
      label: "Transaction History",
      icon: <History className="h-4 w-4" />,
      content: <TransactionHistory />,
    },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-background/80">
      <div className="mx-auto max-w-7xl p-4 space-y-8">
        <WalletInfo />

        <Card className="backdrop-blur-xl bg-black/40 border-purple-500/20 p-4">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="grid grid-cols-4 mb-8 bg-black/40 p-1 rounded-lg">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className={cn(
                    "flex items-center gap-2 transition-all duration-200",
                    "data-[state=active]:bg-purple-600 data-[state=active]:text-white",
                    "data-[state=inactive]:text-gray-400 data-[state=inactive]:hover:text-gray-300",
                    "rounded-md px-3 py-2"
                  )}
                >
                  {tab.icon}
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            {tabs.map((tab) => (
              <TabsContent
                key={tab.value}
                value={tab.value}
                className={cn(
                  "mt-0 animate-in fade-in-50 duration-500",
                  activeTab !== tab.value && "hidden"
                )}
              >
                {tab.content}
              </TabsContent>
            ))}
          </Tabs>
        </Card>
      </div>
    </div>
  )
}

