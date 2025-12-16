/**
 * Configuration Validator
 * Validates extension settings and API keys
 */
export interface ValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
export interface AIProviderConfig {
    provider: string;
    apiKey: string;
    model: string;
    baseUrl?: string;
    maxTokens?: number;
}
/**
 * Validate AI provider configuration
 */
export declare function validateAIConfig(config: AIProviderConfig): ValidationResult;
/**
 * Get API key from environment or settings
 */
export declare function getApiKey(provider: string): string;
/**
 * Get default model for provider
 */
export declare function getDefaultModel(provider: string): string;
/**
 * Get default base URL for provider
 */
export declare function getDefaultBaseUrl(provider: string): string;
/**
 * Show configuration wizard if not properly configured
 */
export declare function showConfigurationWizard(): Promise<boolean>;
/**
 * Validate and log configuration on startup
 */
export declare function validateStartupConfig(): ValidationResult;
//# sourceMappingURL=config-validator.d.ts.map