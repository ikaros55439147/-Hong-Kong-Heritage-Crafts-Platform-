import { NextRequest, NextResponse } from 'next/server';
import { securityAuditService } from '@/lib/services/security-audit.service';
import { penetrationTestingService } from '@/lib/services/penetration-testing.service';
import { complianceCheckerService } from '@/lib/services/compliance-checker.service';
import { adminMiddleware } from '@/lib/auth/admin-middleware';

export async function POST(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await adminMiddleware(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    const { auditType } = await request.json();

    switch (auditType) {
      case 'comprehensive':
        const comprehensiveAudit = await securityAuditService.performComprehensiveSecurityAudit();
        return NextResponse.json({
          success: true,
          audit: comprehensiveAudit
        });

      case 'penetration-test':
        const penTest = await penetrationTestingService.runComprehensivePenetrationTest();
        return NextResponse.json({
          success: true,
          penetrationTest: penTest
        });

      case 'compliance':
        const { regulation } = await request.json();
        if (!regulation || !['GDPR', 'CCPA', 'PIPEDA', 'PDPO'].includes(regulation)) {
          return NextResponse.json(
            { error: 'Invalid regulation specified' },
            { status: 400 }
          );
        }
        
        const complianceReport = await complianceCheckerService.performComplianceAssessment(regulation);
        return NextResponse.json({
          success: true,
          complianceReport
        });

      case 'full-security-assessment':
        // Run all security assessments
        const [securityAudit, penetrationTest, gdprCompliance, pdpoCompliance] = await Promise.all([
          securityAuditService.performComprehensiveSecurityAudit(),
          penetrationTestingService.runComprehensivePenetrationTest(),
          complianceCheckerService.performComplianceAssessment('GDPR'),
          complianceCheckerService.performComplianceAssessment('PDPO')
        ]);

        return NextResponse.json({
          success: true,
          fullAssessment: {
            securityAudit,
            penetrationTest,
            compliance: {
              gdpr: gdprCompliance,
              pdpo: pdpoCompliance
            },
            summary: {
              overallRiskScore: securityAudit.overallRiskScore,
              vulnerabilitiesFound: securityAudit.vulnerabilities.length,
              criticalVulnerabilities: securityAudit.vulnerabilities.filter(v => v.type === 'critical').length,
              complianceScore: Math.round((gdprCompliance.overallScore + pdpoCompliance.overallScore) / 2),
              penetrationTestResults: {
                totalTests: penetrationTest.summary.totalTests,
                vulnerabilitiesFound: penetrationTest.summary.vulnerabilitiesFound
              }
            }
          }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid audit type specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Security audit error:', error);
    return NextResponse.json(
      { error: 'Failed to perform security audit' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    // Check admin authorization
    const authResult = await adminMiddleware(request);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: 'Unauthorized - Admin access required' },
        { status: 401 }
      );
    }

    // Return available audit types and their descriptions
    return NextResponse.json({
      success: true,
      auditTypes: {
        comprehensive: {
          name: 'Comprehensive Security Audit',
          description: 'Full security vulnerability scan and assessment',
          estimatedDuration: '15-30 minutes'
        },
        'penetration-test': {
          name: 'Penetration Testing',
          description: 'Automated penetration testing of API endpoints',
          estimatedDuration: '10-20 minutes'
        },
        compliance: {
          name: 'Compliance Assessment',
          description: 'Check compliance with data protection regulations',
          estimatedDuration: '5-10 minutes',
          supportedRegulations: ['GDPR', 'CCPA', 'PIPEDA', 'PDPO']
        },
        'full-security-assessment': {
          name: 'Full Security Assessment',
          description: 'Complete security audit including all tests and compliance checks',
          estimatedDuration: '30-60 minutes'
        }
      }
    });
  } catch (error) {
    console.error('Security audit info error:', error);
    return NextResponse.json(
      { error: 'Failed to get audit information' },
      { status: 500 }
    );
  }
}