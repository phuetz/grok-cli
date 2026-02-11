/**
 * Context module - RAG, compression, context management, and web search
 */

// Codebase map
export {
  CodebaseMapper,
  getCodebaseMapper,
  type FileInfo,
  type SymbolInfo,
  type DependencyEdge,
  type CodebaseMap,
  type CodebaseSummary,
} from "./codebase-map.js";

// Context files
export {
  loadContext,
  formatContextForPrompt,
  formatContextSummary,
  type LoadedContext,
  type ContextFile,
} from "./context-files.js";

// Context loader
export {
  ContextLoader,
  getContextLoader,
  resetContextLoader,
  type ContextLoaderOptions,
} from "./context-loader.js";

// Context manager
export {
  ContextManagerV2,
  createContextManager,
  getContextManager,
  type ContextManagerConfig,
  type ContextStats,
  type ContextMemoryMetrics,
} from "./context-manager-v2.js";

// Compression
export {
  ContextCompressor,
  type CompressionOptions,
} from "./compression.js";

// Enhanced compression
export {
  EnhancedContextCompressor,
  DEFAULT_ENHANCED_CONFIG,
  type EnhancedCompressionConfig,
} from "./enhanced-compression.js";

// Cross-encoder reranker
export {
  CrossEncoderReranker,
  getCrossEncoderReranker,
  resetCrossEncoderReranker,
  type RerankerConfig,
  type RerankedResult,
  type RerankerStats,
} from "./cross-encoder-reranker.js";

// Dependency-aware RAG
export {
  DependencyAwareRAG,
  createDependencyAwareRAG,
  getDependencyAwareRAG,
  resetDependencyAwareRAG,
  type DependencyRAGConfig,
  type DependencyAwareResult,
  type DependencyContext,
} from "./dependency-aware-rag.js";

// Multi-path retrieval
export {
  MultiPathRetrieval,
  getMultiPathRetrieval,
  resetMultiPathRetrieval,
  type CodeChunk,
  type RetrievalQuery,
  type RetrievalPath,
  type QueryContext,
  type RetrievalResult,
  type MultiPathConfig,
} from "./multi-path-retrieval.js";

// Observation masking
export {
  ObservationMasker,
  createObservationMasker,
  getObservationMasker,
  resetObservationMasker,
  type OutputType,
  type MaskingConfig,
  type Observation,
  type MaskedObservation,
  type MaskingStats,
} from "./observation-masking.js";

// Repository map
export {
  RepositoryMap,
  getRepositoryMap,
  resetRepositoryMap,
} from "./repository-map.js";

// Smart preloader
export {
  SmartContextPreloader,
  createSmartPreloader,
  type PreloadedContext,
  type PreloadedFile,
  type PreloadedSymbol,
  type GitContext,
  type GitCommit,
  type ProjectInfo,
  type ProjectType,
  type PreloadReason,
  type PreloaderConfig,
  type UserPattern,
} from "./smart-preloader.js";

// Web search grounding
export {
  WebSearchManager,
  getWebSearchManager,
  resetWebSearchManager,
  type SearchEngine,
  type SearchResult,
  type SearchResponse,
  type WebSearchConfig,
  type GroundingContext,
} from "./web-search-grounding.js";

// Export types from types.ts, excluding those already exported by context-manager-v2
export type {
  ConversationSummary,
  ContextWarning,
  CompressionResult,
  MessageImportance,
  ImportanceFactors,
  ImportanceWeights,
  CompressionQualityMetrics,
  SummarizationConfig,
  SlidingWindowConfig,
  KeyInformation,
  ContentType,
  ClassifiedMessage,
  EnhancedCompressionResult,
  CompressionMetrics,
  ContextArchive,
} from "./types.js";
