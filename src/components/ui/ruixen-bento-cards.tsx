import React from "react";
import { cn } from "../../../src/lib/utils";
import { Link } from "react-router-dom";
import { motion } from "motion/react";

const cardContents = [
  {
    title: "Local-First Hosting",
    description: "Host and manage your repositories with ultra-low latency. NexusVault is specifically optimized for local development environments and internal team servers, ensuring your codebase remains securely within your network.",
    image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=800&auto=format&fit=crop",
    connections: ["right", "bottom", "left-bus"]
  },
  {
    title: "Advanced Code Browsing",
    description: "Navigate complex codebases with unprecedented ease. Our intelligent code browser provides lightning-fast file search, robust syntax highlighting, and deep link support, empowering your team to understand projects faster.",
    image: "https://images.unsplash.com/photo-1555066931-4365d14bab8c?q=80&w=800&auto=format&fit=crop",
    connections: ["bottom", "right-bus"]
  },
  {
    title: "Seamless Collaboration",
    description: "Work together effortlessly. NexusVault includes built-in tools for streamlined code reviews, contextual inline comments, issue tracking, and focused team discussions, creating a unified workflow.",
    image: "https://images.unsplash.com/photo-1558655146-d09347e92766?q=80&w=800&auto=format&fit=crop",
    connections: ["bottom", "left-bus"]
  },  
  {
    title: "Supabase Powered",
    description: "Experience rock-solid reliability. Built on top of Supabase, NexusVault ensures your data is consistently synced, securely authenticated, and backed by enterprise-grade infrastructure.",
    image: "https://images.unsplash.com/photo-1614850523296-d8c1af93d400?q=80&w=800&auto=format&fit=crop",
    connections: ["bottom", "right-bus"]
  },
  {
    title: "Modern Tech Stack",
    description: "Built from the ground up with React 19, TypeScript, and Tailwind CSS. This modern architecture guarantees exceptional performance, maximum extensibility, and an intuitive developer experience.",
    image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=800&auto=format&fit=crop",
    connections: ["left-bus", "right-bus"]
  },
]


const PlusCard: React.FC<{
  className?: string
  title: string
  description: string
  image?: string
  index?: number
  connections?: string[]
}> = ({
  className = "",
  title,
  description,
  image,
  index = 0,
  connections = []
}) => {
  return (
    <div className={cn("relative h-full", className)}>
      {/* Connections */}
      {connections.includes("right") && (
        <div className="absolute top-1/2 -right-4 w-4 border-t border-dashed border-zinc-400 dark:border-zinc-700 hidden lg:block z-0" />
      )}
      {connections.includes("bottom") && (
        <div className="absolute -bottom-4 left-1/2 h-4 border-l border-dashed border-zinc-400 dark:border-zinc-700 hidden lg:block z-0" />
      )}
      {connections.includes("left-bus") && (
        <div className="absolute top-1/2 -left-8 w-8 border-t border-dashed border-zinc-400 dark:border-zinc-700 hidden lg:block z-0" />
      )}
      {connections.includes("right-bus") && (
        <div className="absolute top-1/2 -right-8 w-8 border-t border-dashed border-zinc-400 dark:border-zinc-700 hidden lg:block z-0" />
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-50px" }}
        transition={{ duration: 0.5, delay: index * 0.1, ease: "easeOut" }}
        whileHover={{ scale: 1.015 }}
        className={cn(
          "relative border border-dashed border-zinc-400 dark:border-zinc-700 rounded-lg p-6 bg-white dark:bg-zinc-950 min-h-[180px] h-full overflow-hidden group z-10",
          "flex flex-col justify-between transition-colors hover:bg-gray-50 dark:hover:bg-zinc-900"
        )}
      >
      <Link to="/" className="block h-full">
        <CornerPlusIcons />
        
        {/* Optional Image background/overlay */}
        {image && (
          <div className="absolute top-0 right-0 w-32 h-32 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
            <img src={image} alt="" className="w-full h-full object-cover rounded-bl-full" />
          </div>
        )}

        {/* Content */}
        <div className="relative z-10 space-y-3">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
              {title}
            </h3>
            <p className="text-gray-700 dark:text-gray-400 text-sm leading-relaxed">{description}</p>
          </div>
        </div>
      </Link>
      </motion.div>
    </div>
  )
}

const CornerPlusIcons = () => (
  <>
    <PlusIcon className="absolute -top-3 -left-3" />
    <PlusIcon className="absolute -top-3 -right-3" />
    <PlusIcon className="absolute -bottom-3 -left-3" />
    <PlusIcon className="absolute -bottom-3 -right-3" />
  </>
)

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    width={24}
    height={24}
    strokeWidth="1"
    stroke="currentColor"
    className={`dark:text-white text-black size-6 ${className}`}
  >
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m6-6H6" />
  </svg>
)

export default function RuixenBentoCards() {
  return (
    <section className="bg-white dark:bg-black py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12">
          <h2 className="text-3xl md:text-5xl font-bold text-black dark:text-white mb-4 tracking-tight">
            Built for developers. <br className="hidden md:block" />
            <span className="text-gray-400">Designed for collaboration.</span>
          </h2>
          <p className="text-gray-600 dark:text-gray-400 text-lg max-w-2xl">
            NexusVault is the modern platform for hosting repositories and browsing code locally. Experience a GitHub-like environment with enhanced performance and team-focused features.
          </p>
        </div>

        {/* Responsive Grid */}
        <div className="relative">
          {/* Left Vertical Bus */}
          <div className="absolute top-20 bottom-20 -left-8 border-l border-dashed border-zinc-400 dark:border-zinc-700 hidden lg:block z-0" />
          
          {/* Right Vertical Bus */}
          <div className="absolute top-20 bottom-20 -right-8 border-l border-dashed border-zinc-400 dark:border-zinc-700 hidden lg:block z-0" />

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 auto-rows-auto gap-4 relative z-10">
            <PlusCard {...cardContents[0]} index={0} className="lg:col-span-3 lg:row-span-1" />
            <PlusCard {...cardContents[1]} index={1} className="lg:col-span-3 lg:row-span-1" />
            <PlusCard {...cardContents[2]} index={2} className="lg:col-span-4 lg:row-span-1" />
            <PlusCard {...cardContents[3]} index={3} className="lg:col-span-2 lg:row-span-1" />
            <PlusCard {...cardContents[4]} index={4} className="lg:col-span-6 lg:row-span-1" />
          </div>
        </div>
      </div>
    </section>
  )
}
