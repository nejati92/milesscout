interface Step {
  label: string
  status: 'done' | 'active' | 'waiting'
}

interface Props {
  steps: Step[]
}

export function LoadingSteps({ steps }: Props) {
  return (
    <div className="space-y-3">
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-3">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-bold
            ${step.status === 'done' ? 'bg-emerald-500 text-white' : ''}
            ${step.status === 'active' ? 'bg-indigo-600 text-white' : ''}
            ${step.status === 'waiting' ? 'bg-gray-200 text-gray-400' : ''}
          `}>
            {step.status === 'done' ? '✓' : step.status === 'active' ? (
              <span className="animate-spin inline-block w-3 h-3 border-2 border-white border-t-transparent rounded-full" />
            ) : i + 1}
          </div>
          <span className={`text-sm ${step.status === 'done' ? 'text-gray-400 line-through' : step.status === 'active' ? 'text-gray-900 font-medium' : 'text-gray-400'}`}>
            {step.label}
          </span>
        </div>
      ))}
    </div>
  )
}
