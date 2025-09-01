import React from 'react';

interface DspSignaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const Signature: React.FC<{ title: string; signature: string; description: string }> = ({ title, signature, description }) => (
    <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
        <h4 className="text-lg font-bold text-green-300">{title}</h4>
        <p className="text-sm text-gray-400 mt-1 mb-3">{description}</p>
        <pre className="bg-gray-900 text-sm text-cyan-300 p-3 rounded-md overflow-x-auto">
            <code>{signature.trim()}</code>
        </pre>
    </div>
);

const DspSignaturesModal: React.FC<DspSignaturesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div 
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4"
        onClick={onClose}
    >
      <div 
        className="bg-gray-800/80 backdrop-blur-md border border-gray-600 rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-2xl font-bold text-gray-100">Conceptual DSPy Signatures</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
          </button>
        </header>
        <main className="p-6 overflow-y-auto space-y-6">
            <p className="text-gray-300">
                In DSPy, a `Signature` defines the input/output behavior of a module. It's a declarative way to specify what a Language Model should do. Below are the conceptual signatures for each agent in this GEPA workflow.
            </p>
            
            <Signature 
                title="Researcher"
                description="Gathers initial information on a topic, simulating tool use (e.g., web search) to provide a foundation."
                signature={`
class Research(dspy.Signature):
    """Conducts a brief literature review on a given topic."""
    topic = dspy.InputField()
    research_summary = dspy.OutputField(desc="A summary of key themes, debates, and concepts.")
                `}
            />

            <Signature 
                title="Generator"
                description="Creates the initial, detailed analysis based on the research summary and any user-provided context."
                signature={`
class GenerateAnalysis(dspy.Signature):
    """Generates a comprehensive analysis based on initial research and user context."""
    research_summary = dspy.InputField(desc="The initial literature review.")
    user_context = dspy.InputField(desc="File names and user feedback.")
    topic = dspy.InputField()
    analysis = dspy.OutputField(desc="A detailed analytical report.")
                `}
            />

            <Signature 
                title="Evaluator"
                description="Critiques the generated analysis, identifying weaknesses, biases, and gaps without proposing solutions."
                signature={`
class EvaluateAnalysis(dspy.Signature):
    """Critiques an analysis, identifying fallacies, biases, and gaps."""
    topic = dspy.InputField()
    analysis = dspy.InputField(desc="The analysis to be evaluated.")
    critique = dspy.OutputField(desc="Constructive critique of the analysis.")
                `}
            />

            <Signature 
                title="Proposer"
                description="Suggests concrete, actionable improvements based on the critique of the original analysis."
                signature={`
class ProposeRefinements(dspy.Signature):
    """Proposes actionable improvements based on a critique."""
    analysis = dspy.InputField()
    critique = dspy.InputField()
    proposal = dspy.OutputField(desc="A list of specific, actionable improvements.")
                `}
            />
            
            <Signature 
                title="Aggregator"
                description="Synthesizes all prior inputs—research, analysis, critique, proposals, and feedback—into a final, polished report."
                signature={`
class AggregateReport(dspy.Signature):
    """Synthesizes all inputs into a final, polished report."""
    research_summary = dspy.InputField()
    original_analysis = dspy.InputField()
    critique = dspy.InputField()
    proposal = dspy.InputField()
    user_feedback = dspy.InputField(desc="Optional feedback for revision.")
    final_report = dspy.OutputField(desc="The final, cohesive report.")
                `}
            />

        </main>
      </div>
    </div>
  );
};

export default DspSignaturesModal;
