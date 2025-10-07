import { TaskSelection } from './TaskBuilder';
import { AgentName } from '../types';

export interface AgentTaskProfile {
  agentName: AgentName;
  displayName: string;
  description: string;
  taskProfile: TaskSelection;
}

// Agent task profiles - what each agent is designed to do
export const agentTaskProfiles: AgentTaskProfile[] = [
  {
    agentName: AgentName.SEARCH,
    displayName: 'Search Agent',
    description: 'Discovers and gathers relevant research materials and information',
    taskProfile: {
      task: 'Search Papers',
      dataSources: ['Deep Review', 'ArXiV', 'Google Scholar', 'Semantic Scholar'],
      outputFormat: 'Markdown'
    }
  },
  {
    agentName: AgentName.LEARNINGS,
    displayName: 'Learnings Agent',
    description: 'Creates comprehensive learnings and insights based on search findings',
    taskProfile: {
      task: 'Generate Learnings',
      dataSources: ['Deep Review', 'ArXiV', 'Google Scholar'],
      outputFormat: 'LaTeX Manuscript'
    }
  },
  {
    agentName: AgentName.OPPORTUNITY_ANALYSIS,
    displayName: 'Opportunity Analysis Agent',
    description: 'Analyzes learnings for opportunities and decides whether to continue or restart search',
    taskProfile: {
      task: 'Analyze Opportunities',
      dataSources: ['Deep Review'],
      outputFormat: 'Markdown'
    }
  },
  {
    agentName: AgentName.PROPOSER,
    displayName: 'Proposer Agent',
    description: 'Develops research proposals and identifies novel research directions',
    taskProfile: {
      task: 'Write a Report',
      dataSources: ['ArXiV', 'Google Scholar', 'Semantic Scholar'],
      outputFormat: 'LaTeX Manuscript'
    }
  },
  {
    agentName: AgentName.NOVELTY_CHECKER,
    displayName: 'Novelty Checker Agent',
    description: 'Assesses the novelty and originality of research proposals',
    taskProfile: {
      task: 'Search Papers',
      dataSources: ['Google Scholar', 'ArXiV', 'Semantic Scholar', 'CrossRef'],
      outputFormat: 'JSON Data'
    }
  },
  {
    agentName: AgentName.AGGREGATOR,
    displayName: 'Aggregator Agent',
    description: 'Combines all findings into a comprehensive final report',
    taskProfile: {
      task: 'Write a Report',
      dataSources: ['Deep Review'],
      outputFormat: 'PDF Report'
    }
  }
];

// Helper function to get task profile for an agent
export const getAgentTaskProfile = (agentName: AgentName): AgentTaskProfile | undefined => {
  return agentTaskProfiles.find(profile => profile.agentName === agentName);
};

// Helper function to get all agent task profiles
export const getAllAgentTaskProfiles = (): AgentTaskProfile[] => {
  return agentTaskProfiles;
};
