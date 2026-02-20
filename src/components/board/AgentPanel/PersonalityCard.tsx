"use client";

import type { AgentPersonality } from "@/lib/ai/personalities";

interface PersonalityCardProps {
  personality: AgentPersonality;
  isSelected: boolean;
  onToggle: () => void;
}

export function PersonalityCard({
  personality,
  isSelected,
  onToggle,
}: PersonalityCardProps) {
  return (
    <button
      onClick={onToggle}
      className={`relative flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all ${
        isSelected
          ? "border-current bg-opacity-10 shadow-sm"
          : "border-gray-200 hover:border-gray-300"
      }`}
      style={
        isSelected
          ? { borderColor: personality.color, backgroundColor: `${personality.color}10` }
          : undefined
      }
    >
      {/* Selection checkmark */}
      {isSelected && (
        <div
          className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: personality.color }}
        >
          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
      )}

      {/* Agent avatar */}
      <div
        className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-full ${
          isSelected ? "ring-2" : "ring-1 ring-gray-200"
        }`}
        style={{
          ...(isSelected ? { boxShadow: `0 0 0 2px ${personality.color}` } : {}),
          backgroundColor: `${personality.color}20`,
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={personality.icon}
          alt={personality.name}
          className="h-full w-full object-cover"
        />
      </div>

      <span className="text-xs font-semibold text-gray-800">
        {personality.name}
      </span>
      <span className="text-[10px] leading-tight text-gray-500">
        {personality.description}
      </span>
    </button>
  );
}
