import React, { useMemo } from 'react';
import { MemoryNote, MemoryLink } from '../types/workflow_LG';

interface MemoryVisualizationProps {
  memoryNotes: MemoryNote[];
  memoryLinks: MemoryLink[];
  memoryQuality: number;
  className?: string;
}

const MemoryVisualization: React.FC<MemoryVisualizationProps> = ({
  memoryNotes,
  memoryLinks,
  memoryQuality,
  className = ''
}) => {
  // Calculate node positions using a simple force-directed layout
  const nodePositions = useMemo(() => {
    const positions: Record<string, { x: number; y: number }> = {};
    const centerX = 200;
    const centerY = 150;
    const radius = 120;

    // Group notes by agent for better organization
    const agentGroups = memoryNotes.reduce((groups, note) => {
      if (!groups[note.agentName]) {
        groups[note.agentName] = [];
      }
      groups[note.agentName].push(note);
      return groups;
    }, {} as Record<string, MemoryNote[]>);

    // Position notes in concentric circles by agent
    let angleOffset = 0;
    Object.entries(agentGroups).forEach(([agentName, notes]) => {
      const angleStep = (2 * Math.PI) / notes.length;

      notes.forEach((note, index) => {
        const angle = angleOffset + (index * angleStep);
        positions[note.id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle)
        };
      });

      angleOffset += Math.PI / 4; // Offset each agent group
    });

    return positions;
  }, [memoryNotes]);

  // Calculate link paths
  const linkPaths = useMemo(() => {
    return memoryLinks.map(link => {
      const sourcePos = nodePositions[link.sourceNoteId];
      const targetPos = nodePositions[link.targetNoteId];

      if (!sourcePos || !targetPos) return null;

      const midX = (sourcePos.x + targetPos.x) / 2;
      const midY = (sourcePos.y + targetPos.y) / 2;

      return {
        ...link,
        path: `M ${sourcePos.x} ${sourcePos.y} Q ${midX} ${midY} ${targetPos.x} ${targetPos.y}`,
        strength: link.strength
      };
    }).filter(Boolean);
  }, [memoryLinks, nodePositions]);

  // Get color for agent type
  const getAgentColor = (agentName: string): string => {
    const colors: Record<string, string> = {
      SEARCH: '#3B82F6',        // Blue
      LEARNINGS: '#10B981',     // Green
      OPPORTUNITY_ANALYSIS: '#F59E0B', // Yellow
      PROPOSER: '#EF4444',      // Red
      NOVELTY_CHECKER: '#8B5CF6', // Purple
      AGGREGATOR: '#06B6D4'     // Cyan
    };
    return colors[agentName] || '#6B7280'; // Default gray
  };

  // Get relationship color
  const getRelationshipColor = (relationship: string): string => {
    const colors: Record<string, string> = {
      similar: '#10B981',
      related: '#3B82F6',
      follows: '#F59E0B',
      contradicts: '#EF4444',
      supports: '#8B5CF6'
    };
    return colors[relationship] || '#6B7280';
  };

  if (memoryNotes.length === 0) {
    return (
      <div className={`flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg ${className}`}>
        <div className="text-center text-gray-500 dark:text-gray-400">
          <div className="text-4xl mb-2">🧠</div>
          <p>No memory notes yet</p>
          <p className="text-sm">Agent outputs will appear here as structured memories</p>
        </div>
      </div>
    );
  }



  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Agentic Memory Network
        </h3>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Quality Score:
          </span>
          <div className="flex items-center gap-1">
            <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 transition-all duration-300"
                style={{ width: `${memoryQuality * 100}%` }}
              />
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {(memoryQuality * 100).toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex gap-4">
        {/* Network Visualization */}
        <div className="flex-1">
          <svg
            width="400"
            height="300"
            className="border border-gray-200 dark:border-gray-700 rounded bg-gray-50 dark:bg-gray-900"
            style={{ maxWidth: '100%', height: 'auto' }}
          >
            {/* Links */}
            <g className="links">
              {linkPaths.map(link => (
                <g key={link!.id}>
                  <path
                    d={link!.path}
                    fill="none"
                    stroke={getRelationshipColor(link!.relationship)}
                    strokeWidth={Math.max(1, link!.strength * 3)}
                    strokeOpacity={0.6}
                    markerEnd="url(#arrowhead)"
                  />
                  <text
                    x={(nodePositions[link!.sourceNoteId].x + nodePositions[link!.targetNoteId].x) / 2}
                    y={(nodePositions[link!.sourceNoteId].y + nodePositions[link!.targetNoteId].y) / 2 - 5}
                    textAnchor="middle"
                    className="text-xs fill-gray-600 dark:fill-gray-400"
                    style={{ fontSize: '10px' }}
                  >
                    {link!.relationship}
                  </text>
                </g>
              ))}
            </g>

            {/* Arrow marker definition */}
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6B7280"
                  opacity="0.6"
                />
              </marker>
            </defs>

            {/* Nodes */}
            <g className="nodes">
              {memoryNotes.map(note => {
                const pos = nodePositions[note.id];
                return (
                  <g key={note.id} transform={`translate(${pos.x}, ${pos.y})`}>
                    <circle
                      r="20"
                      fill={getAgentColor(note.agentName)}
                      stroke="#ffffff"
                      strokeWidth="2"
                      className="cursor-pointer hover:r-24 transition-all duration-200"
                    />
                    <text
                      textAnchor="middle"
                      dy="5"
                      className="text-xs font-medium fill-white pointer-events-none"
                      style={{ fontSize: '10px' }}
                    >
                      {note.agentName.slice(0, 3)}
                    </text>

                    {/* Tooltip on hover */}
                    <title>
                      {note.agentName}: {note.context}
                      {'\n'}Keywords: {note.keywords.join(', ')}
                      {'\n'}Tags: {note.tags.join(', ')}
                    </title>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>

        {/* Memory Stats */}
        <div className="w-48 space-y-3">
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Network Stats
            </h4>
            <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex justify-between">
                <span>Notes:</span>
                <span className="font-medium">{memoryNotes.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Links:</span>
                <span className="font-medium">{memoryLinks.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Avg. Strength:</span>
                <span className="font-medium">
                  {memoryLinks.length > 0
                    ? (memoryLinks.reduce((sum, link) => sum + link.strength, 0) / memoryLinks.length).toFixed(2)
                    : '0.00'
                  }
                </span>
              </div>
            </div>
          </div>

          {/* Agent Distribution */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              By Agent
            </h4>
            <div className="space-y-1 text-sm">
              {Object.entries(
                memoryNotes.reduce((acc, note) => {
                  acc[note.agentName] = (acc[note.agentName] || 0) + 1;
                  return acc;
                }, {} as Record<string, number>)
              ).map(([agent, count]) => (
                <div key={agent} className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: getAgentColor(agent) }}
                    />
                    <span className="text-gray-600 dark:text-gray-400">{agent}</span>
                  </div>
                  <span className="font-medium text-gray-900 dark:text-white">{count}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Notes */}
          <div className="bg-gray-50 dark:bg-gray-700 rounded p-3">
            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
              Recent Notes
            </h4>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {[...memoryNotes]
                .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                .slice(0, 3)
                .map(note => (
                  <div key={note.id} className="text-xs">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: getAgentColor(note.agentName) }}
                      />
                      <span className="font-medium text-gray-700 dark:text-gray-300">
                        {note.agentName}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 line-clamp-2">
                      {note.context}
                    </p>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemoryVisualization;
