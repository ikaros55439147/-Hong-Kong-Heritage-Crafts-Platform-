import { NextRequest, NextResponse } from 'next/server';
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

    const { regulation, action } = await request.json();

    if (!regulation || !['GDPR', 'CCPA', 'PIPEDA', 'PDPO'].includes(regulation)) {
      return NextResponse.json(
        { error: 'Invalid regulation specified. Supported: GDPR, CCPA, PIPEDA, PDPO' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'assess':
        const complianceReport = await complianceCheckerService.performComplianceAssessment(regulation);
        return NextResponse.json({
          success: true,
          complianceReport
        });

      case 'quick-check':
        // Perform a quick compliance check (subset of full assessment)
        const quickReport = await complianceCheckerService.performComplianceAssessment(regulation);
        
        // Return simplified report for quick overview
        return NextResponse.json({
          success: true,
          quickCheck: {
            regulation,
            overallScore: quickReport.overallScore,
            status: quickReport.overallScore >= 90 ? 'compliant' : 
                   quickReport.overallScore >= 70 ? 'mostly-compliant' :
                   quickReport.overallScore >= 50 ? 'partially-compliant' : 'non-compliant',
            summary: quickReport.summary,
            criticalGaps: quickReport.criticalGaps.slice(0, 5), // Top 5 critical gaps
            nextSteps: quickReport.actionPlan.filter(item => item.priority === 'critical').slice(0, 3)
          }
        });

      default:
        return NextResponse.json(
          { error: 'Invalid action specified. Supported: assess, quick-check' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Compliance check error:', error);
    return NextResponse.json(
      { error: 'Failed to perform compliance check' },
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

    const { searchParams } = new URL(request.url);
    const regulation = searchParams.get('regulation');

    if (regulation && !['GDPR', 'CCPA', 'PIPEDA', 'PDPO'].includes(regulation)) {
      return NextResponse.json(
        { error: 'Invalid regulation specified' },
        { status: 400 }
      );
    }

    // Return compliance information
    const complianceInfo = {
      supportedRegulations: {
        GDPR: {
          name: 'General Data Protection Regulation',
          jurisdiction: 'European Union',
          description: 'EU regulation on data protection and privacy',
          keyRequirements: [
            'Lawful basis for processing',
            'Data subject consent',
            'Right to access',
            'Right to rectification',
            'Right to erasure',
            'Data portability',
            'Privacy by design',
            'Data breach notification'
          ]
        },
        CCPA: {
          name: 'California Consumer Privacy Act',
          jurisdiction: 'California, USA',
          description: 'California state law on consumer privacy rights',
          keyRequirements: [
            'Privacy policy requirements',
            'Consumer right to know',
            'Consumer right to delete',
            'Consumer right to opt-out',
            'Non-discrimination'
          ]
        },
        PIPEDA: {
          name: 'Personal Information Protection and Electronic Documents Act',
          jurisdiction: 'Canada',
          description: 'Canadian federal privacy law',
          keyRequirements: [
            'Consent for collection',
            'Purpose limitation',
            'Data minimization',
            'Accuracy',
            'Retention limits',
            'Security safeguards'
          ]
        },
        PDPO: {
          name: 'Personal Data (Privacy) Ordinance',
          jurisdiction: 'Hong Kong',
          description: 'Hong Kong privacy law',
          keyRequirements: [
            'Data protection principles',
            'Purpose limitation',
            'Data subject access',
            'Data correction',
            'Data security',
            'Cross-border data transfer restrictions'
          ]
        }
      }
    };

    if (regulation) {
      return NextResponse.json({
        success: true,
        regulation: complianceInfo.supportedRegulations[regulation as keyof typeof complianceInfo.supportedRegulations]
      });
    }

    return NextResponse.json({
      success: true,
      complianceInfo
    });
  } catch (error) {
    console.error('Compliance info error:', error);
    return NextResponse.json(
      { error: 'Failed to get compliance information' },
      { status: 500 }
    );
  }
}