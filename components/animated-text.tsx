"use client"

import { motion } from "framer-motion"

interface AnimatedTextProps {
  text: string
  delay?: number
}

export function AnimatedText({
  text,
  delay = 0,
}: AnimatedTextProps) {
  const words = text.split(" ")

  return (
    <span className="text-7xl leading-tight break-normal">
      {words.map((word, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            duration: 0.5,
            delay: delay + index * 0.08,
            ease: [0.21, 0.47, 0.32, 0.98],
          }}
          className="inline-block mr-3"
        >
          {word}
        </motion.span>
      ))}
    </span>
  )
}