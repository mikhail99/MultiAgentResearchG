import React, { useState, useCallback } from 'react';
import { MemoryNote, MemoryLink } from '../types/workflow_LG';

// Mock A-Mem service functions for testing
const mockMemoryService = {
  constructNote: async (content: string, agentName: string, topic: string): Promise<MemoryNote> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simple keyword extraction (in real implementation, this would use LLM)
    const words = content.toLowerCase().split(/\s+/);
    const keywords = [...new Set(words.filter(word => word.length > 4))].slice(0, 5);

    // Generate context summary
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const context = sentences[0]?.trim().substring(0, 150) + '...' || 'Document content summary';

    // Generate tags
    const tags = ['research', 'analysis', agentName.toLowerCase()];
    if (keywords.includes('machine') || keywords.includes('learning')) tags.push('AI', 'ML');
    if (keywords.includes('algorithm')) tags.push('algorithms');
    if (keywords.includes('data')) tags.push('data-science');

    return {
      id: `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      content,
      context,
      keywords,
      tags: [...new Set(tags)],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      agentName,
      iteration: 1,
      links: [],
      metadata: { topic, source: 'file-upload' }
    };
  },

  generateLinks: async (newNote: MemoryNote, existingNotes: MemoryNote[]): Promise<MemoryLink[]> => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const links: MemoryLink[] = [];

    existingNotes.forEach(existingNote => {
      // Calculate keyword overlap
      const overlappingKeywords = newNote.keywords.filter(k =>
        existingNote.keywords.includes(k)
      );

      if (overlappingKeywords.length > 0) {
        const strength = Math.min(overlappingKeywords.length * 0.2, 0.9);
        const relationship = overlappingKeywords.length > 2 ? "related" : "follows";

        links.push({
          id: `link_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          sourceNoteId: newNote.id,
          targetNoteId: existingNote.id,
          strength,
          relationship,
          createdAt: new Date().toISOString()
        });
      }
    });

    return links;
  },

  calculateQuality: (notes: MemoryNote[], links: MemoryLink[]): number => {
    if (notes.length === 0) return 0;

    // Calculate connectivity score
    const connectedNotes = new Set<string>();
    links.forEach(link => {
      connectedNotes.add(link.sourceNoteId);
      connectedNotes.add(link.targetNoteId);
    });
    const connectivityScore = connectedNotes.size / notes.length;

    // Calculate average link strength
    const avgStrength = links.length > 0
      ? links.reduce((sum, link) => sum + link.strength, 0) / links.length
      : 0;

    // Calculate diversity score
    const allKeywords = notes.flatMap(note => note.keywords);
    const uniqueKeywords = new Set(allKeywords);
    const diversityScore = uniqueKeywords.size / allKeywords.length;

    return Math.min((connectivityScore * 0.4) + (avgStrength * 0.4) + (diversityScore * 0.2), 1);
  }
};

interface FileWithContent {
  file: File;
  content: string;
  memoryNote?: MemoryNote;
}

const MemoryTestApp: React.FC = () => {
  const [files, setFiles] = useState<FileWithContent[]>([]);
  const [memoryNotes, setMemoryNotes] = useState<MemoryNote[]>([]);
  const [memoryLinks, setMemoryLinks] = useState<MemoryLink[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedNote, setSelectedNote] = useState<MemoryNote | null>(null);
  const [topic, setTopic] = useState('Research Analysis');

  // Handle file drops
  const handleDrop = useCallback(async (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const droppedFiles = Array.from(event.dataTransfer.files as FileList);

    const textFiles = droppedFiles.filter((file: File) =>
      file.type === 'text/plain' || file.name.endsWith('.txt') || file.name.endsWith('.md')
    );

    if (textFiles.length === 0) {
      alert('Please drop text files (.txt, .md) or plain text files');
      return;
    }

    setIsProcessing(true);

    try {
      const filePromises = textFiles.map(async (file: File) => {
        const content = await file.text();
        return { file, content };
      });

      const newFiles = await Promise.all(filePromises);
      setFiles(prev => [...prev, ...newFiles]);
    } catch (error) {
      console.error('Error reading files:', error);
      alert('Error reading files');
    } finally {
      setIsProcessing(false);
    }
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  // Process files into memory
  const processFiles = async () => {
    if (files.length === 0) return;

    setIsProcessing(true);
    const newNotes: MemoryNote[] = [];
    const allLinks: MemoryLink[] = [];

    try {
      for (let i = 0; i < files.length; i++) {
        const fileData = files[i];
        console.log(`🧠 Processing file ${i + 1}/${files.length}: ${fileData.file.name}`);

        // Create memory note
        const memoryNote = await mockMemoryService.constructNote(
          fileData.content,
          `AGENT_${i + 1}`,
          topic
        );

        // Generate links to existing memories
        const links = await mockMemoryService.generateLinks(memoryNote, newNotes);
        allLinks.push(...links);

        newNotes.push(memoryNote);

        // Update file with memory note
        setFiles(prev => prev.map(f =>
          f.file.name === fileData.file.name ? { ...f, memoryNote } : f
        ));
      }

      setMemoryNotes(newNotes);
      setMemoryLinks(allLinks);

      console.log(`✅ Processed ${newNotes.length} files into memory network`);
      console.log(`🔗 Generated ${allLinks.length} connections`);

    } catch (error) {
      console.error('Error processing files:', error);
      alert('Error processing files into memory');
    } finally {
      setIsProcessing(false);
    }
  };

  // Clear all data
  const clearAll = () => {
    setFiles([]);
    setMemoryNotes([]);
    setMemoryLinks([]);
    setSelectedNote(null);
  };

  // Calculate memory quality
  const memoryQuality = mockMemoryService.calculateQuality(memoryNotes, memoryLinks);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            🧠 A-Mem Memory Test Lab
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Test the Agentic Memory system with your own documents
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* File Upload Area */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold mb-4 text-gray-900 dark:text-white">
                📁 Document Upload
              </h2>

              {/* Topic Input */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Research Topic
                </label>
                <input
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter research topic..."
                />
              </div>

              {/* Drop Zone */}
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center hover:border-blue-400 transition-colors cursor-pointer"
              >
                <div className="text-4xl mb-2">📄</div>
                <p className="text-gray-600 dark:text-gray-400 mb-2">
                  Drop text files here
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500">
                  Supports .txt, .md files
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4">
                  <h3 className="font-medium mb-2 text-gray-900 dark:text-white">
                    Uploaded Files ({files.length})
                  </h3>
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {files.map((fileData, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                        <span className="text-sm truncate">{fileData.file.name}</span>
                        <span className="text-xs text-green-600 dark:text-green-400">
                          {fileData.memoryNote ? '✓ Processed' : 'Pending'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="mt-4 space-y-2">
                <button
                  onClick={processFiles}
                  disabled={files.length === 0 || isProcessing}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isProcessing ? '🧠 Processing...' : '🧠 Process into Memory'}
                </button>

                <button
                  onClick={clearAll}
                  disabled={isProcessing}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  🗑️ Clear All
                </button>
              </div>
            </div>
          </div>

          {/* Memory Network Visualization */}
          <div className="lg:col-span-2">
            {memoryNotes.length > 0 ? (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                    🕸️ Memory Network
                  </h2>
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

                {/* Network Stats */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {memoryNotes.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Memories</div>
                  </div>
                  <div className="text-center p-3 bg-green-50 dark:bg-green-900/20 rounded">
                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                      {memoryLinks.length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Connections</div>
                  </div>
                  <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {[...new Set(memoryNotes.flatMap(n => n.keywords))].length}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">Unique Keywords</div>
                  </div>
                </div>

                {/* Memory Nodes */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {memoryNotes.map((note) => (
                    <div
                      key={note.id}
                      onClick={() => setSelectedNote(note)}
                      className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg cursor-pointer hover:border-blue-400 dark:hover:border-blue-400 transition-colors"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {note.agentName}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {note.createdAt.substring(11, 19)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                        {note.context}
                      </p>

                      <div className="flex flex-wrap gap-1 mb-2">
                        {note.keywords.slice(0, 3).map((keyword, idx) => (
                          <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-xs rounded">
                            {keyword}
                          </span>
                        ))}
                        {note.keywords.length > 3 && (
                          <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                            +{note.keywords.length - 3}
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-1">
                        {note.tags.map((tag, idx) => (
                          <span key={idx} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-xs rounded">
                            {tag}
                          </span>
                        ))}
                      </div>

                      {/* Connection indicators */}
                      <div className="mt-2 flex items-center gap-1">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Links:</span>
                        {memoryLinks
                          .filter(link => link.sourceNoteId === note.id || link.targetNoteId === note.id)
                          .map(link => (
                            <div
                              key={link.id}
                              className="w-2 h-2 rounded-full bg-green-500"
                              title={`Connected with ${(link.strength * 100).toFixed(0)}% strength`}
                            />
                          ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Connection Visualization */}
                {memoryLinks.length > 0 && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-3 text-gray-900 dark:text-white">🔗 Connections</h3>
                    <div className="space-y-2">
                      {memoryLinks.map(link => {
                        const sourceNote = memoryNotes.find(n => n.id === link.sourceNoteId);
                        const targetNote = memoryNotes.find(n => n.id === link.targetNoteId);

                        return (
                          <div key={link.id} className="flex items-center gap-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {sourceNote?.agentName}
                            </span>
                            <div className="flex-1 h-0.5 bg-gradient-to-r from-blue-400 to-green-400"></div>
                            <span className="text-xs text-gray-600 dark:text-gray-400">
                              {link.relationship} ({(link.strength * 100).toFixed(0)}%)
                            </span>
                            <div className="flex-1 h-0.5 bg-gradient-to-l from-blue-400 to-green-400"></div>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {targetNote?.agentName}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-12 text-center">
                <div className="text-6xl mb-4">🧠</div>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  No Memory Network Yet
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Upload and process some documents to see your memory network grow!
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Memory Detail Modal */}
        {selectedNote && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                    📄 Memory Details
                  </h3>
                  <button
                    onClick={() => setSelectedNote(null)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Agent
                    </label>
                    <p className="text-gray-900 dark:text-white">{selectedNote.agentName}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Context
                    </label>
                    <p className="text-gray-600 dark:text-gray-400">{selectedNote.context}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Keywords
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {selectedNote.keywords.map((keyword, idx) => (
                        <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 text-sm rounded">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Tags
                    </label>
                    <div className="flex flex-wrap gap-1">
                      {selectedNote.tags.map((tag, idx) => (
                        <span key={idx} className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 text-sm rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Content Preview
                    </label>
                    <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded text-sm text-gray-600 dark:text-gray-400 max-h-40 overflow-y-auto">
                      {selectedNote.content.substring(0, 500)}
                      {selectedNote.content.length > 500 && '...'}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Metadata
                    </label>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <p>Created: {new Date(selectedNote.createdAt).toLocaleString()}</p>
                      <p>Updated: {new Date(selectedNote.updatedAt).toLocaleString()}</p>
                      <p>Iteration: {selectedNote.iteration}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryTestApp;
