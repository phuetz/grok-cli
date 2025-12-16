/**
 * Tests for AI Code Review Module
 *
 * Validates automated code review before commits.
 * Research: 73.8% of AI review comments are resolved (industrial study)
 */

import {
  CodeReviewManager,
  getCodeReviewManager,
  initializeCodeReview,
  DEFAULT_REVIEW_CONFIG,
  type ReviewIssue,
  type FileDiff as _FileDiff,
  type DiffHunk as _DiffHunk,
  type ReviewResult,
  type CodeReviewConfig,
  type IssueSeverity,
  type IssueType,
} from "../../src/integrations/code-review.js";

describe("AI Code Review", () => {
  describe("DEFAULT_REVIEW_CONFIG", () => {
    it("should have sensible defaults", () => {
      expect(DEFAULT_REVIEW_CONFIG.enabled).toBe(true);
      expect(DEFAULT_REVIEW_CONFIG.checkSecurity).toBe(true);
      expect(DEFAULT_REVIEW_CONFIG.checkPerformance).toBe(true);
      expect(DEFAULT_REVIEW_CONFIG.checkStyle).toBe(true);
      expect(DEFAULT_REVIEW_CONFIG.checkComplexity).toBe(true);
      expect(DEFAULT_REVIEW_CONFIG.autoFix).toBe(false);
      expect(Array.isArray(DEFAULT_REVIEW_CONFIG.ignorePatterns)).toBe(true);
    });

    it("should have reasonable ignore patterns", () => {
      expect(DEFAULT_REVIEW_CONFIG.ignorePatterns).toContain("node_modules/**");
      expect(DEFAULT_REVIEW_CONFIG.ignorePatterns).toContain("dist/**");
    });
  });

  describe("IssueSeverity", () => {
    it("should include all severity levels", () => {
      const severities: IssueSeverity[] = ["critical", "major", "minor", "info"];
      severities.forEach((severity) => {
        expect(typeof severity).toBe("string");
      });
    });
  });

  describe("IssueType", () => {
    it("should include all issue types", () => {
      const types: IssueType[] = [
        "bug",
        "security",
        "performance",
        "style",
        "maintainability",
        "documentation",
        "test-coverage",
        "complexity",
      ];
      types.forEach((type) => {
        expect(typeof type).toBe("string");
      });
    });
  });

  describe("CodeReviewManager", () => {
    let manager: CodeReviewManager;

    beforeEach(() => {
      manager = new CodeReviewManager(process.cwd());
    });

    describe("constructor", () => {
      it("should initialize with default config", () => {
        const mgr = new CodeReviewManager(process.cwd());
        expect(mgr.getConfig()).toEqual(DEFAULT_REVIEW_CONFIG);
      });

      it("should accept custom config", () => {
        const config: Partial<CodeReviewConfig> = { checkSecurity: false };
        const mgr = new CodeReviewManager(process.cwd(), config);
        expect(mgr.getConfig().checkSecurity).toBe(false);
      });
    });

    describe("updateConfig", () => {
      it("should update configuration", () => {
        manager.updateConfig({ autoFix: true });
        expect(manager.getConfig().autoFix).toBe(true);
      });

      it("should preserve other config values", () => {
        manager.updateConfig({ autoFix: true });
        expect(manager.getConfig().checkSecurity).toBe(true);
      });
    });

    describe("generateReviewPrompt", () => {
      it("should generate review prompt for diff", () => {
        const diff = `diff --git a/test.ts b/test.ts
+const x = 1;`;
        const prompt = manager.generateReviewPrompt(diff);
        expect(prompt).toContain("code reviewer");
        expect(prompt).toContain("Security");
        expect(prompt).toContain("const x = 1");
      });
    });

    describe("formatResults", () => {
      it("should format results with no issues", () => {
        const result: ReviewResult = {
          success: true,
          files: [],
          issues: [],
          summary: {
            filesReviewed: 5,
            totalIssues: 0,
            critical: 0,
            major: 0,
            minor: 0,
            info: 0,
          },
          duration: 100,
          recommendation: "approve",
        };

        const formatted = manager.formatResults(result);
        expect(formatted).toContain("Passed");
        expect(formatted).toContain("5 files");
      });

      it("should format results with issues", () => {
        const result: ReviewResult = {
          success: true,
          files: [],
          issues: [
            {
              id: "test-1",
              file: "test.ts",
              line: 10,
              type: "security",
              severity: "critical",
              message: "Hardcoded secret",
              fixable: false,
            },
          ],
          summary: {
            filesReviewed: 1,
            totalIssues: 1,
            critical: 1,
            major: 0,
            minor: 0,
            info: 0,
          },
          duration: 100,
          recommendation: "request-changes",
        };

        const formatted = manager.formatResults(result);
        expect(formatted).toContain("1 issue");
        expect(formatted).toContain("test.ts");
        expect(formatted).toContain("Hardcoded secret");
      });
    });

    describe("reviewStagedChanges", () => {
      it("should return result for empty diff", async () => {
        const result = await manager.reviewStagedChanges();
        // May have staged changes or not in test env
        expect(result).toHaveProperty("success");
        expect(result).toHaveProperty("summary");
        expect(result).toHaveProperty("recommendation");
      });
    });

    describe("events", () => {
      it("should emit review:start event", (done) => {
        manager.on("review:start", () => {
          done();
        });
        manager.reviewStagedChanges().catch(() => {
          // Ignore errors in test env
        });
      });
    });
  });

  describe("Singleton", () => {
    describe("getCodeReviewManager", () => {
      it("should return manager instance", () => {
        const mgr = getCodeReviewManager(process.cwd());
        expect(mgr).toBeInstanceOf(CodeReviewManager);
      });
    });

    describe("initializeCodeReview", () => {
      it("should create manager with config", () => {
        const mgr = initializeCodeReview(process.cwd(), { autoFix: true });
        expect(mgr.getConfig().autoFix).toBe(true);
      });
    });
  });

  describe("ReviewResult", () => {
    it("should have correct structure", () => {
      const result: ReviewResult = {
        success: true,
        files: [],
        issues: [],
        summary: {
          filesReviewed: 0,
          totalIssues: 0,
          critical: 0,
          major: 0,
          minor: 0,
          info: 0,
        },
        duration: 0,
        recommendation: "approve",
      };

      expect(result.success).toBe(true);
      expect(result.recommendation).toBe("approve");
    });

    it("should support different recommendations", () => {
      const recommendations: ReviewResult["recommendation"][] = [
        "approve",
        "request-changes",
        "comment",
      ];
      recommendations.forEach((rec) => {
        expect(typeof rec).toBe("string");
      });
    });
  });

  describe("ReviewIssue", () => {
    it("should have required fields", () => {
      const issue: ReviewIssue = {
        id: "test-id",
        file: "test.ts",
        line: 1,
        type: "security",
        severity: "critical",
        message: "Test message",
        fixable: false,
      };

      expect(issue.id).toBeDefined();
      expect(issue.file).toBeDefined();
      expect(issue.line).toBeDefined();
      expect(issue.type).toBeDefined();
      expect(issue.severity).toBeDefined();
      expect(issue.message).toBeDefined();
      expect(issue.fixable).toBeDefined();
    });

    it("should support optional fields", () => {
      const issue: ReviewIssue = {
        id: "test-id",
        file: "test.ts",
        line: 1,
        endLine: 5,
        type: "security",
        severity: "critical",
        message: "Test",
        suggestion: "Fix it",
        code: "const x = 1",
        fixable: true,
      };

      expect(issue.endLine).toBe(5);
      expect(issue.suggestion).toBe("Fix it");
      expect(issue.code).toBe("const x = 1");
    });
  });
});
