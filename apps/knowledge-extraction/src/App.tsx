import React, { useEffect, useMemo, useState } from 'react';
import ControlPanel from '@shared/components/ControlPanel';
import StatusBar from '@shared/components/StatusBar';
import AgentCard from '@shared/components/AgentCard';
import ResultsPanel from '@shared/components/ResultsPanel';
import { ProcessStatus, ModelProvider, StylizedFact } from '@shared/types';
import { useModelSettings } from '@shared/hooks';
import { runWorkflow } from '@shared/services/workflowRunner';
import { KE_TEMPLATE } from './workflowTemplates';

export default function App() {
  const [question, setQuestion] = useState('');
  const { state: modelSettings, actions: modelActions } = useModelSettings();
  const modelProvider = modelSettings.modelProvider;
  const setModelProvider = modelActions.setModelProvider;
  const localLlmUrl = modelSettings.localLlmUrl || KE_TEMPLATE.localLlmUrl;
  const setLocalLlmUrl = modelActions.setLocalLlmUrl;
  const enableWebSearch = modelSettings.enableWebSearch;
  const setEnableWebSearch = modelActions.setEnableWebSearch;
  const enableLocalSearch = modelSettings.enableLocalSearch;
  const setEnableLocalSearch = modelActions.setEnableLocalSearch;
  const [iteration] = useState(1);

  const [status, setStatus] = useState<ProcessStatus>(ProcessStatus.IDLE);
  const [completed, setCompleted] = useState<ProcessStatus[]>([]);
  const [contents, setContents] = useState<Partial<Record<ProcessStatus, string>>>({
    [ProcessStatus.SEARCHING]: '',
    [ProcessStatus.LEARNING]: '',
    [ProcessStatus.OPPORTUNITY_ANALYZING]: '',
    [ProcessStatus.PROPOSING]: '',
    [ProcessStatus.AGGREGATING]: '',
  });
  const [facts, setFacts] = useState<StylizedFact[]>([]);
  const [finalMd, setFinalMd] = useState('');
  const [metrics, setMetrics] = useState<Partial<Record<ProcessStatus, { durationMs?: number; chars?: number }>>>({});
  const [ledger, setLedger] = useState<any>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('ke_last_session');
      if (raw) {
        const s = JSON.parse(raw);
        setQuestion(s.question || '');
        setStatus(s.status || ProcessStatus.IDLE);
        setCompleted(s.completed || []);
        setContents(s.contents || contents);
        setFinalMd(s.finalMd || '');
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveSession = (next?: Partial<{ status: ProcessStatus; completed: ProcessStatus[]; contents: Partial<Record<ProcessStatus, string>>; finalMd: string }>) => {
    const payload = {
      question,
      status: next?.status ?? status,
      completed: next?.completed ?? completed,
      contents: next?.contents ?? contents,
      finalMd: next?.finalMd ?? finalMd,
    };
    localStorage.setItem('ke_last_session', JSON.stringify(payload));
  };

  const agentCards = useMemo(() => (
    [
      { key: ProcessStatus.SEARCHING, title: 'FAST_SEARCH' },
      { key: ProcessStatus.LEARNING, title: 'BASELINE' },
      { key: ProcessStatus.OPPORTUNITY_ANALYZING, title: 'ANALYST' },
      { key: ProcessStatus.PROPOSING, title: 'EVALUATOR' },
      { key: ProcessStatus.AGGREGATING, title: 'SYNTHESIZER' },
    ]
  ), []);

  const onStart = async () => {
    if (!question.trim()) return;
    setStatus(ProcessStatus.SEARCHING);
    setCompleted([]);
    const resetContents: Partial<Record<ProcessStatus, string>> = {
      [ProcessStatus.SEARCHING]: '',
      [ProcessStatus.LEARNING]: '',
      [ProcessStatus.OPPORTUNITY_ANALYZING]: '',
      [ProcessStatus.PROPOSING]: '',
      [ProcessStatus.AGGREGATING]: '',
    };
    setContents(resetContents);
    setMetrics({});
    saveSession({ status: ProcessStatus.SEARCHING, completed: [], contents: resetContents });

    const state = await runWorkflow(
      { ...KE_TEMPLATE, modelProvider, localLlmUrl, enableWebSearch, enableLocalSearch },
      question,
      { enableStreaming: true },
      {
        onStepStart: (s) => { setStatus(s); saveSession({ status: s }); },
        onStreamChunk: (s, chunk) => {
          setContents(prev => {
            const next = { ...prev, [s]: (prev[s] || '') + chunk };
            saveSession({ contents: next });
            return next;
          });
        },
        onStepComplete: (s, output) => {
          setMetrics(prev => ({ ...prev, [s]: { ...(prev[s]||{}), chars: output.length } }));
        },
        onWorkflowComplete: (finalState, runLedger) => {
          setLedger(runLedger);
          try { localStorage.setItem('ke_last_ledger', JSON.stringify(runLedger)); } catch {}
        }
      }
    );

    setCompleted(state.completedSteps);
    setFinalMd(state.aggregations.at(-1) || '');
    saveSession({ completed: state.completedSteps, finalMd: state.aggregations.at(-1) || '' });
  };

  const isRunComplete = completed.includes(ProcessStatus.AGGREGATING);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
      <div className="max-w-7xl mx-auto p-4 space-y-4">
        <ControlPanel
          topic={question}
          setTopic={setQuestion}
          files={[]}
          setFiles={() => {}}
          onStart={onStart}
          onInterrupt={() => {}}
          onExport={() => {
            const blob = new Blob([finalMd || ''], { type: 'text/markdown;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ke_result.md';
            a.click();
            URL.revokeObjectURL(url);
          }}
          onExportJson={() => {
            const data = { question, metrics, ledger, contents };
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'ke_run_ledger.json';
            a.click();
            URL.revokeObjectURL(url);
          }}
          onCopyLink={() => {}}
          onOpenTemplateModal={() => {}}
          isLoading={status !== ProcessStatus.IDLE && !isRunComplete}
          iteration={1}
          modelProvider={modelProvider}
          setModelProvider={setModelProvider}
          localLlmUrl={localLlmUrl}
          setLocalLlmUrl={setLocalLlmUrl}
          enableWebSearch={enableWebSearch}
          setEnableWebSearch={setEnableWebSearch}
          enableLocalSearch={enableLocalSearch}
          setEnableLocalSearch={setEnableLocalSearch}
          isRunComplete={isRunComplete}
        />

        <StatusBar status={status} completedSteps={completed} metrics={metrics} />

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {agentCards.map(c => (
            <AgentCard
              key={c.key}
              title={c.title}
              content={contents[c.key] || ''}
              sentPrompt=""
              isLoading={!isRunComplete && status !== ProcessStatus.IDLE && !completed.includes(c.key)}
              agent={ProcessStatus.SEARCHING as any}
              onEditPrompt={() => {}}
            />
          ))}
        </div>

        <ResultsPanel
          facts={facts}
          questions={[]}
          isLoadingFacts={false}
          isLoadingQuestions={false}
        />
      </div>
    </div>
  );
}


