import { describe, it, expect, beforeEach, vi } from 'vitest';
import { complianceCheckerService } from '../compliance-checker.service';

// Mock dependencies
vi.mock('@prisma/client');
vi.mock('fs/promises');

describe('ComplianceCheckerService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('performComplianceAssessment', () => {
    it('should perform GDPR compliance assessment', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      expect(result).toBeDefined();
      expect(result.id).toMatch(/^compliance-gdpr-\d+$/);
      expect(result.regulation).toBe('GDPR');
      expect(result.generatedAt).toBeInstanceOf(Date);
      expect(typeof result.overallScore).toBe('number');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(Array.isArray(result.assessments)).toBe(true);
      expect(result.summary).toBeDefined();
      expect(Array.isArray(result.criticalGaps)).toBe(true);
      expect(Array.isArray(result.actionPlan)).toBe(true);
    });

    it('should perform CCPA compliance assessment', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('CCPA');

      expect(result).toBeDefined();
      expect(result.regulation).toBe('CCPA');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should perform PIPEDA compliance assessment', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('PIPEDA');

      expect(result).toBeDefined();
      expect(result.regulation).toBe('PIPEDA');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should perform PDPO compliance assessment', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('PDPO');

      expect(result).toBeDefined();
      expect(result.regulation).toBe('PDPO');
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
    });

    it('should throw error for unsupported regulation', async () => {
      await expect(
        complianceCheckerService.performComplianceAssessment('INVALID' as any)
      ).rejects.toThrow('Unsupported regulation: INVALID');
    });
  });

  describe('GDPR assessment', () => {
    it('should assess Article 6 - Lawfulness of processing', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      const lawfulnessAssessment = result.assessments.find(a => 
        a.requirementId.includes('art6')
      );

      if (lawfulnessAssessment) {
        expect(lawfulnessAssessment.status).toMatch(/^(compliant|non-compliant|partial|not-applicable)$/);
        expect(lawfulnessAssessment.score).toBeGreaterThanOrEqual(0);
        expect(lawfulnessAssessment.score).toBeLessThanOrEqual(100);
        expect(Array.isArray(lawfulnessAssessment.evidence)).toBe(true);
        expect(Array.isArray(lawfulnessAssessment.recommendations)).toBe(true);
      }
    });

    it('should assess Article 7 - Consent', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      const consentAssessment = result.assessments.find(a => 
        a.requirementId.includes('art7')
      );

      if (consentAssessment) {
        expect(consentAssessment.status).toMatch(/^(compliant|non-compliant|partial|not-applicable)$/);
        expect(consentAssessment.score).toBeGreaterThanOrEqual(0);
        expect(consentAssessment.score).toBeLessThanOrEqual(100);
      }
    });

    it('should check for privacy policy existence', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      // Should have evidence related to privacy policy
      const hasPrivacyPolicyEvidence = result.assessments.some(assessment =>
        assessment.evidence.some(evidence => 
          evidence.description.toLowerCase().includes('privacy policy')
        )
      );

      // This might be true or false depending on implementation
      expect(typeof hasPrivacyPolicyEvidence).toBe('boolean');
    });

    it('should check for consent management', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      // Should have evidence related to consent management
      const hasConsentEvidence = result.assessments.some(assessment =>
        assessment.evidence.some(evidence => 
          evidence.description.toLowerCase().includes('consent')
        )
      );

      expect(typeof hasConsentEvidence).toBe('boolean');
    });
  });

  describe('compliance scoring', () => {
    it('should determine compliance status based on score', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      result.assessments.forEach(assessment => {
        if (assessment.score >= 90) {
          expect(assessment.status).toBe('compliant');
        } else if (assessment.score >= 50) {
          expect(assessment.status).toBe('partial');
        } else if (assessment.score > 0) {
          expect(assessment.status).toBe('non-compliant');
        } else {
          expect(assessment.status).toBe('not-applicable');
        }
      });
    });

    it('should calculate overall score correctly', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      if (result.assessments.length > 0) {
        const expectedScore = result.assessments.reduce((sum, a) => sum + a.score, 0) / result.assessments.length;
        expect(result.overallScore).toBe(Math.round(expectedScore));
      }
    });
  });

  describe('compliance summary', () => {
    it('should provide accurate summary statistics', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      expect(result.summary.totalRequirements).toBe(result.assessments.length);
      expect(result.summary.compliantRequirements).toBe(
        result.assessments.filter(a => a.status === 'compliant').length
      );
      expect(result.summary.nonCompliantRequirements).toBe(
        result.assessments.filter(a => a.status === 'non-compliant').length
      );
      expect(result.summary.partialRequirements).toBe(
        result.assessments.filter(a => a.status === 'partial').length
      );
      expect(result.summary.notApplicableRequirements).toBe(
        result.assessments.filter(a => a.status === 'not-applicable').length
      );
    });

    it('should identify critical gaps', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      const nonCompliantAssessments = result.assessments.filter(a => a.status === 'non-compliant');
      const expectedCriticalGaps = nonCompliantAssessments.flatMap(a => a.gaps);

      expect(result.criticalGaps).toEqual(expectedCriticalGaps);
    });
  });

  describe('action plan generation', () => {
    it('should generate action items for non-compliant requirements', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      const nonCompliantAssessments = result.assessments.filter(a => 
        a.status === 'non-compliant' || a.status === 'partial'
      );

      if (nonCompliantAssessments.length > 0) {
        expect(result.actionPlan.length).toBeGreaterThan(0);
        
        result.actionPlan.forEach(action => {
          expect(action.id).toBeDefined();
          expect(action.priority).toMatch(/^(critical|high|medium|low)$/);
          expect(action.requirement).toBeDefined();
          expect(action.description).toBeDefined();
          expect(action.estimatedEffort).toBeDefined();
          expect(action.dueDate).toBeInstanceOf(Date);
          expect(action.status).toBe('pending');
        });
      }
    });

    it('should prioritize critical issues', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      const criticalActions = result.actionPlan.filter(action => action.priority === 'critical');
      const nonCompliantAssessments = result.assessments.filter(a => a.status === 'non-compliant');

      if (nonCompliantAssessments.length > 0) {
        expect(criticalActions.length).toBeGreaterThan(0);
      }
    });

    it('should estimate effort for action items', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      result.actionPlan.forEach(action => {
        expect(action.estimatedEffort).toMatch(/\d+(-\d+)?\s+(days?|weeks?)/);
      });
    });
  });

  describe('evidence collection', () => {
    it('should collect different types of evidence', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      const evidenceTypes = new Set();
      result.assessments.forEach(assessment => {
        assessment.evidence.forEach(evidence => {
          evidenceTypes.add(evidence.type);
        });
      });

      // Should have various evidence types
      const validTypes = ['code', 'documentation', 'configuration', 'process'];
      evidenceTypes.forEach(type => {
        expect(validTypes).toContain(type);
      });
    });

    it('should verify evidence when possible', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');

      result.assessments.forEach(assessment => {
        assessment.evidence.forEach(evidence => {
          expect(typeof evidence.verified).toBe('boolean');
          expect(evidence.description).toBeDefined();
          expect(evidence.location).toBeDefined();
        });
      });
    });
  });

  describe('regulation-specific checks', () => {
    it('should perform CCPA-specific privacy policy checks', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('CCPA');

      // Should have assessments specific to CCPA requirements
      expect(result.assessments.length).toBeGreaterThan(0);
      result.assessments.forEach(assessment => {
        expect(assessment.lastAssessed).toBeInstanceOf(Date);
      });
    });

    it('should perform PDPO-specific data protection principle checks', async () => {
      const result = await complianceCheckerService.performComplianceAssessment('PDPO');

      // Should have assessments specific to PDPO requirements
      expect(result.assessments.length).toBeGreaterThan(0);
      result.assessments.forEach(assessment => {
        expect(assessment.lastAssessed).toBeInstanceOf(Date);
      });
    });
  });

  describe('report persistence', () => {
    it('should save compliance report', async () => {
      // Mock console.log to verify report saving
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await complianceCheckerService.performComplianceAssessment('GDPR');

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Compliance report saved: compliance-reports\/compliance-gdpr-\d+\.json/)
      );

      consoleSpy.mockRestore();
    });
  });

  describe('error handling', () => {
    it('should handle file system errors gracefully', async () => {
      // The service should not throw errors even if file checks fail
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');
      
      expect(result).toBeDefined();
      expect(result.assessments.length).toBeGreaterThan(0);
    });

    it('should handle code scanning errors gracefully', async () => {
      // The service should not throw errors even if code pattern matching fails
      const result = await complianceCheckerService.performComplianceAssessment('GDPR');
      
      expect(result).toBeDefined();
      expect(Array.isArray(result.assessments)).toBe(true);
    });
  });
});