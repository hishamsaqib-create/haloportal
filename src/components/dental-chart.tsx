'use client'

import { useCallback } from 'react'

interface DentalChartProps {
  selectedTeeth: number[]
  onChange: (teeth: number[]) => void
  disabled?: boolean
}

// FDI notation quadrants
// Upper right: 18-11 (displayed right to left: 18,17,16,15,14,13,12,11)
// Upper left: 21-28 (displayed left to right: 21,22,23,24,25,26,27,28)
// Lower right: 48-41 (displayed right to left: 48,47,46,45,44,43,42,41)
// Lower left: 31-38 (displayed left to right: 31,32,33,34,35,36,37,38)

const UPPER_RIGHT = [18, 17, 16, 15, 14, 13, 12, 11]
const UPPER_LEFT = [21, 22, 23, 24, 25, 26, 27, 28]
const LOWER_RIGHT = [48, 47, 46, 45, 44, 43, 42, 41]
const LOWER_LEFT = [31, 32, 33, 34, 35, 36, 37, 38]

// Tooth type labels for accessibility
const TOOTH_NAMES: Record<number, string> = {
  // Third molars (wisdom teeth)
  18: '8', 28: '8', 38: '8', 48: '8',
  // Second molars
  17: '7', 27: '7', 37: '7', 47: '7',
  // First molars
  16: '6', 26: '6', 36: '6', 46: '6',
  // Second premolars
  15: '5', 25: '5', 35: '5', 45: '5',
  // First premolars
  14: '4', 24: '4', 34: '4', 44: '4',
  // Canines
  13: '3', 23: '3', 33: '3', 43: '3',
  // Lateral incisors
  12: '2', 22: '2', 32: '2', 42: '2',
  // Central incisors
  11: '1', 21: '1', 31: '1', 41: '1',
}

// Tooth shape SVG paths - simplified anatomical shapes
// Molars are wider, incisors narrower, canines pointed
function getToothShape(tooth: number): 'molar' | 'premolar' | 'canine' | 'incisor' {
  const position = tooth % 10
  if (position >= 6) return 'molar'
  if (position >= 4) return 'premolar'
  if (position === 3) return 'canine'
  return 'incisor'
}

function ToothButton({
  tooth,
  isSelected,
  isUpper,
  disabled,
  onClick,
}: {
  tooth: number
  isSelected: boolean
  isUpper: boolean
  disabled?: boolean
  onClick: () => void
}) {
  const shape = getToothShape(tooth)

  const widths: Record<string, number> = {
    molar: 38,
    premolar: 32,
    canine: 28,
    incisor: 26,
  }

  const width = widths[shape]
  const height = 44

  // Generate tooth-like SVG path
  function toothPath() {
    const w = width - 4
    const h = height - 16
    const cx = width / 2
    const topY = 2
    const botY = topY + h

    if (isUpper) {
      // Upper teeth: root at top, crown at bottom
      switch (shape) {
        case 'molar':
          return `M${cx - w / 2} ${botY} Q${cx - w / 2} ${topY + h * 0.3} ${cx - 2} ${topY + 4} L${cx} ${topY} L${cx + 2} ${topY + 4} Q${cx + w / 2} ${topY + h * 0.3} ${cx + w / 2} ${botY} Q${cx + w / 4} ${botY + 4} ${cx} ${botY + 2} Q${cx - w / 4} ${botY + 4} ${cx - w / 2} ${botY} Z`
        case 'premolar':
          return `M${cx - w / 2} ${botY} Q${cx - w / 3} ${topY + h * 0.2} ${cx} ${topY} Q${cx + w / 3} ${topY + h * 0.2} ${cx + w / 2} ${botY} Q${cx} ${botY + 3} ${cx - w / 2} ${botY} Z`
        case 'canine':
          return `M${cx - w / 2} ${botY} Q${cx - w / 3} ${topY + h * 0.3} ${cx} ${topY} Q${cx + w / 3} ${topY + h * 0.3} ${cx + w / 2} ${botY} Q${cx} ${botY + 2} ${cx - w / 2} ${botY} Z`
        default: // incisor
          return `M${cx - w / 2} ${botY} Q${cx - w / 2.5} ${topY + h * 0.2} ${cx} ${topY} Q${cx + w / 2.5} ${topY + h * 0.2} ${cx + w / 2} ${botY} L${cx - w / 2} ${botY} Z`
      }
    } else {
      // Lower teeth: crown at top, root at bottom
      switch (shape) {
        case 'molar':
          return `M${cx - w / 2} ${topY} Q${cx - w / 4} ${topY - 2} ${cx} ${topY} Q${cx + w / 4} ${topY - 2} ${cx + w / 2} ${topY} Q${cx + w / 2} ${botY - h * 0.3} ${cx + 2} ${botY - 4} L${cx} ${botY} L${cx - 2} ${botY - 4} Q${cx - w / 2} ${botY - h * 0.3} ${cx - w / 2} ${topY} Z`
        case 'premolar':
          return `M${cx - w / 2} ${topY} Q${cx} ${topY - 3} ${cx + w / 2} ${topY} Q${cx + w / 3} ${botY - h * 0.2} ${cx} ${botY} Q${cx - w / 3} ${botY - h * 0.2} ${cx - w / 2} ${topY} Z`
        case 'canine':
          return `M${cx - w / 2} ${topY} Q${cx} ${topY - 2} ${cx + w / 2} ${topY} Q${cx + w / 3} ${botY - h * 0.3} ${cx} ${botY} Q${cx - w / 3} ${botY - h * 0.3} ${cx - w / 2} ${topY} Z`
        default: // incisor
          return `M${cx - w / 2} ${topY} L${cx + w / 2} ${topY} Q${cx + w / 2.5} ${botY - h * 0.2} ${cx} ${botY} Q${cx - w / 2.5} ${botY - h * 0.2} ${cx - w / 2} ${topY} Z`
      }
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={`Tooth ${tooth}`}
      className={`relative flex flex-col items-center transition-all duration-150 ${
        disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
      }`}
      style={{ width: `${width}px` }}
    >
      {/* Tooth number label */}
      {isUpper && (
        <span
          className={`mb-0.5 text-[10px] font-bold leading-none ${
            isSelected ? 'text-blue-700' : 'text-gray-500'
          }`}
        >
          {tooth}
        </span>
      )}

      {/* Tooth shape */}
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="block"
      >
        <path
          d={toothPath()}
          fill={isSelected ? '#2563eb' : '#f9fafb'}
          stroke={isSelected ? '#1d4ed8' : '#d1d5db'}
          strokeWidth={1.5}
          className={`transition-colors duration-150 ${
            !disabled && !isSelected ? 'hover:fill-blue-50 hover:stroke-blue-300' : ''
          }`}
        />
        {/* Cross-line for crown detail */}
        {isUpper && (
          <line
            x1={width / 2 - (widths[shape] - 4) / 3}
            y1={height - 14}
            x2={width / 2 + (widths[shape] - 4) / 3}
            y2={height - 14}
            stroke={isSelected ? '#93bbfc' : '#e5e7eb'}
            strokeWidth={0.75}
          />
        )}
        {!isUpper && (
          <line
            x1={width / 2 - (widths[shape] - 4) / 3}
            y1={14}
            x2={width / 2 + (widths[shape] - 4) / 3}
            y2={14}
            stroke={isSelected ? '#93bbfc' : '#e5e7eb'}
            strokeWidth={0.75}
          />
        )}
      </svg>

      {/* Tooth number label */}
      {!isUpper && (
        <span
          className={`mt-0.5 text-[10px] font-bold leading-none ${
            isSelected ? 'text-blue-700' : 'text-gray-500'
          }`}
        >
          {tooth}
        </span>
      )}
    </button>
  )
}

export function DentalChart({ selectedTeeth, onChange, disabled }: DentalChartProps) {
  const toggleTooth = useCallback(
    (tooth: number) => {
      if (disabled) return
      const newTeeth = selectedTeeth.includes(tooth)
        ? selectedTeeth.filter((t) => t !== tooth)
        : [...selectedTeeth, tooth].sort((a, b) => a - b)
      onChange(newTeeth)
    },
    [selectedTeeth, onChange, disabled]
  )

  const selectAll = useCallback(() => {
    if (disabled) return
    const allTeeth = [...UPPER_RIGHT, ...UPPER_LEFT, ...LOWER_RIGHT, ...LOWER_LEFT].sort(
      (a, b) => a - b
    )
    onChange(allTeeth)
  }, [onChange, disabled])

  const clearAll = useCallback(() => {
    if (disabled) return
    onChange([])
  }, [onChange, disabled])

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      {/* Header with actions */}
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase text-gray-400">Dental Chart (FDI)</span>
        {!disabled && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={selectAll}
              className="rounded border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="rounded border border-gray-200 px-2 py-0.5 text-[10px] font-medium text-gray-500 hover:bg-gray-50 transition-colors"
            >
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Upper jaw */}
      <div className="flex items-end justify-center gap-0">
        {/* Upper Right (18-11) */}
        <div className="flex items-end">
          {UPPER_RIGHT.map((tooth) => (
            <ToothButton
              key={tooth}
              tooth={tooth}
              isSelected={selectedTeeth.includes(tooth)}
              isUpper={true}
              disabled={disabled}
              onClick={() => toggleTooth(tooth)}
            />
          ))}
        </div>
        {/* Midline */}
        <div className="mx-1 h-14 w-px bg-gray-300" />
        {/* Upper Left (21-28) */}
        <div className="flex items-end">
          {UPPER_LEFT.map((tooth) => (
            <ToothButton
              key={tooth}
              tooth={tooth}
              isSelected={selectedTeeth.includes(tooth)}
              isUpper={true}
              disabled={disabled}
              onClick={() => toggleTooth(tooth)}
            />
          ))}
        </div>
      </div>

      {/* Jaw divider */}
      <div className="my-1 flex items-center justify-center">
        <div className="h-px flex-1 bg-gray-300" />
        <span className="px-3 text-[9px] font-medium uppercase text-gray-300">occlusal</span>
        <div className="h-px flex-1 bg-gray-300" />
      </div>

      {/* Lower jaw */}
      <div className="flex items-start justify-center gap-0">
        {/* Lower Right (48-41) */}
        <div className="flex items-start">
          {LOWER_RIGHT.map((tooth) => (
            <ToothButton
              key={tooth}
              tooth={tooth}
              isSelected={selectedTeeth.includes(tooth)}
              isUpper={false}
              disabled={disabled}
              onClick={() => toggleTooth(tooth)}
            />
          ))}
        </div>
        {/* Midline */}
        <div className="mx-1 h-14 w-px bg-gray-300" />
        {/* Lower Left (31-38) */}
        <div className="flex items-start">
          {LOWER_LEFT.map((tooth) => (
            <ToothButton
              key={tooth}
              tooth={tooth}
              isSelected={selectedTeeth.includes(tooth)}
              isUpper={false}
              disabled={disabled}
              onClick={() => toggleTooth(tooth)}
            />
          ))}
        </div>
      </div>

      {/* Quadrant labels */}
      <div className="mt-2 flex justify-between px-4">
        <span className="text-[10px] font-medium text-gray-400">Right</span>
        <span className="text-[10px] font-medium text-gray-400">Left</span>
      </div>

      {/* Selected summary */}
      {selectedTeeth.length > 0 && (
        <div className="mt-3 border-t border-gray-100 pt-2">
          <p className="text-xs text-gray-500">
            <span className="font-medium text-gray-700">{selectedTeeth.length}</span> tooth
            {selectedTeeth.length !== 1 ? ' numbers' : ''} selected:{' '}
            <span className="font-medium text-blue-700">{selectedTeeth.join(', ')}</span>
          </p>
        </div>
      )}
    </div>
  )
}
