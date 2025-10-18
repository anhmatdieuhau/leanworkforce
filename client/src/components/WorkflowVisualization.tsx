interface WorkflowStep {
  title: string;
  description?: string;
}

interface WorkflowColumn {
  title: string;
  steps: WorkflowStep[];
}

interface WorkflowVisualizationProps {
  workflows: WorkflowColumn[];
}

export function WorkflowVisualization({ workflows }: WorkflowVisualizationProps) {
  return (
    <div className="w-full max-w-6xl mx-auto px-4 py-12">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {workflows.map((workflow, idx) => (
          <div key={idx} className="flex flex-col items-center">
            <div className="bg-black text-white font-semibold rounded-md px-4 py-2 mb-6 text-center w-full max-w-xs" data-testid={`workflow-header-${idx}`}>
              {workflow.title}
            </div>
            <div className="flex flex-col items-center w-full max-w-xs">
              {workflow.steps.map((step, stepIdx) => (
                <div key={stepIdx} className="flex flex-col items-center w-full">
                  <div 
                    className="border border-border rounded-md px-4 py-3 w-full text-center text-foreground bg-white hover-elevate transition-all duration-150"
                    data-testid={`workflow-step-${idx}-${stepIdx}`}
                  >
                    <div className="font-medium">{step.title}</div>
                    {step.description && (
                      <div className="text-xs text-muted-foreground mt-1">{step.description}</div>
                    )}
                  </div>
                  {stepIdx < workflow.steps.length - 1 && (
                    <div className="h-4 w-px bg-border my-2" />
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
