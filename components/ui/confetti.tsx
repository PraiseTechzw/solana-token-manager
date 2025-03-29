"use client"

import { useEffect, useState } from "react"
import ReactConfetti from "react-confetti"

interface ConfettiProps {
  duration?: number
}

export const Confetti = ({ duration = 3000 }: ConfettiProps) => {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [isActive, setIsActive] = useState(true)

  useEffect(() => {
    // Set dimensions to window size
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      })
    }

    // Initial dimensions
    handleResize()

    // Add event listener
    window.addEventListener("resize", handleResize)

    // Set timeout to remove confetti
    const timeout = setTimeout(() => {
      setIsActive(false)
    }, duration)

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize)
      clearTimeout(timeout)
    }
  }, [duration])

  if (!isActive) return null

  return (
    <ReactConfetti
      width={dimensions.width}
      height={dimensions.height}
      recycle={false}
      numberOfPieces={200}
      gravity={0.15}
      colors={["#9333ea", "#a855f7", "#d8b4fe", "#f0abfc", "#2dd4bf", "#fcd34d"]}
    />
  )
}

