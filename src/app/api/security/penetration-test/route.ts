import { NextRequest, NextResponse } from 'next/server';
import { penetrationTestingService } from '@/lib/services/penetration-testing.service';
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

    const { testType, targetEndpoint } = await request.json();

    switch (testType) {
      case 'comprehensive':
        const comprehensiveTest = await penetrationTestingService.runComprehensivePenetrationTest();
        return NextResponse.json({
          success: true,
          penetrationTest: comprehensiveTest
        });

      case 'authentication':
        // Run only authentication tests
        const authTests = await penetrationTestingService.runComprehensivePenetrationTest();
        const authOnlyResults = {
          ...authTests,
          tests: authTests.tests.filter(test => test.testType === 'authentication'),
          summary: {
            ...authTests.summary,
            totalTests: authTests.tests.filter(test => test.testType === 'authentication').length,
            vulnerabilitiesFound: authTests.tests.filter(test => 
              test.testType === 'authentication' && test.vulnerability.detected
            ).length
          }
        };
        
        return NextResponse.json({
          success: true,
          penetrationTest: authOnlyResults
        });

      case 'authorization':
        // Run only authorization tests
        const authzTests = await penetrationTestingService.runComprehensivePenetrationTest();
        const authzOnlyResults = {
          ...authzTests,
          tests: authzTests.tests.filter(test => test.testType === 'authorization'),
          summary: {
            ...authzTests.summary,
            totalTests: authzTests.tests.filter(test => test.testType === 'authorization').length,
            vulnerabilitiesFound: authzTests.tests.filter(test => 
              test.testType === 'authorization' && test.vulnerability.detected
            ).length
          }
        };
        
        return NextResponse.json({
          success: true,
          penetrationTest: authzOnlyResults
        });

      case 'injection':
        // Run only injection tests
        const injectionTests = await penetrationTestingService.runComprehensivePenetrationTest();
        const injectionOnlyResults = {
          ...injectionTests,
          tests: injectionTests.tests.filter(test => test.testType === 'injection'),
          summary: {
            ...injectionTests.summary,
            totalTests: injectionTests.tests.filter(test => test.testType === 'injection').length,
            vulnerabilitiesFound: injectionTests.tests.filter(test => 
              test.testType === 'injection' && test.vulnerability.detected
            ).length
          }
        };
        
        return NextResponse.json({
          success: true,
          penetrationTest: injectionOnlyResults
        });

      case 'xss':
        // Run only XSS tests
        const xssTests = await penetrationTestingService.runComprehensivePenetrationTest();
        const xssOnlyResults = {
          ...xssTests,
          tests: xssTests.tests.filter(test => test.testType === 'xss'),
          summary: {
            ...xssTests.summary,
            totalTests: xssTests.tests.filter(test => test.testType === 'xss').length,
            vulnerabilitiesFound: xssTests.tests.filter(test => 
              test.testType === 'xss' && test.vulnerability.detected
            ).length
          }
        };
        
        return NextResponse.json({
          success: true,
          penetrationTest: xssOnlyResults
        });

      case 'csrf':
        // Run only CSRF tests
        const csrfTests = await penetrationTestingService.runComprehensivePenetrationTest();
        const csrfOnlyResults = {
          ...csrfTests,
          tests: csrfTests.tests.filter(test => test.testType === 'csrf'),
          summary: {
            ...csrfTests.summary,
            totalTests: csrfTests.tests.filter(test => test.testType === 'csrf').length,
            vulnerabilitiesFound: csrfTests.tests.filter(test => 
              test.testType === 'csrf' && test.vulnerability.detected
            ).length
          }
        };
        
        return NextResponse.json({
          success: true,
          penetrationTest: csrfOnlyResults
        });

      case 'session':
        // Run only session management tests
        const sessionTests = await penetrationTestingService.runComprehensivePenetrationTest();
        const sessionOnlyResults = {
          ...sessionTests,
          tests: sessionTests.tests.filter(test => test.testType === 'session'),
          summary: {
            ...sessionTests.summary,
            totalTests: sessionTests.tests.filter(test => test.testType === 'session').length,
            vulnerabilitiesFound: sessionTests.tests.filter(test => 
              test.testType === 'session' && test.vulnerability.detected
            ).length
          }
        };
        
        return NextResponse.json({
          success: true,
          penetrationTest: sessionOnlyResults
        });

      default:
        return NextResponse.json(
          { error: 'Invalid test type specified' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Penetration test error:', error);
    return NextResponse.json(
      { error: 'Failed to perform penetration test' },
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

    // Return available test types and their descriptions
    return NextResponse.json({
      success: true,
      testTypes: {
        comprehensive: {
          name: 'Comprehensive Penetration Test',
          description: 'Full penetration testing suite covering all vulnerability types',
          testCategories: ['authentication', 'authorization', 'injection', 'xss', 'csrf', 'session'],
          estimatedDuration: '15-30 minutes'
        },
        authentication: {
          name: 'Authentication Tests',
          description: 'Test authentication mechanisms for vulnerabilities',
          tests: [
            'Brute force protection',
            'Weak password acceptance',
            'Account lockout mechanism',
            'Password reset security'
          ],
          estimatedDuration: '3-5 minutes'
        },
        authorization: {
          name: 'Authorization Tests',
          description: 'Test authorization and access control mechanisms',
          tests: [
            'Horizontal privilege escalation',
            'Vertical privilege escalation',
            'Direct object reference'
          ],
          estimatedDuration: '2-4 minutes'
        },
        injection: {
          name: 'Injection Tests',
          description: 'Test for various injection vulnerabilities',
          tests: [
            'SQL injection',
            'NoSQL injection',
            'Command injection'
          ],
          estimatedDuration: '3-5 minutes'
        },
        xss: {
          name: 'Cross-Site Scripting Tests',
          description: 'Test for XSS vulnerabilities',
          tests: [
            'Reflected XSS',
            'Stored XSS',
            'DOM-based XSS'
          ],
          estimatedDuration: '2-4 minutes'
        },
        csrf: {
          name: 'CSRF Tests',
          description: 'Test for Cross-Site Request Forgery vulnerabilities',
          tests: [
            'CSRF token validation',
            'SameSite cookie attribute'
          ],
          estimatedDuration: '1-2 minutes'
        },
        session: {
          name: 'Session Management Tests',
          description: 'Test session management security',
          tests: [
            'Session fixation',
            'Session timeout',
            'Secure cookie flags'
          ],
          estimatedDuration: '2-3 minutes'
        }
      },
      riskLevels: {
        critical: {
          description: 'Immediate action required - high risk of exploitation',
          color: '#dc2626'
        },
        high: {
          description: 'High priority - significant security risk',
          color: '#ea580c'
        },
        medium: {
          description: 'Medium priority - moderate security risk',
          color: '#d97706'
        },
        low: {
          description: 'Low priority - minimal security risk',
          color: '#65a30d'
        }
      }
    });
  } catch (error) {
    console.error('Penetration test info error:', error);
    return NextResponse.json(
      { error: 'Failed to get penetration test information' },
      { status: 500 }
    );
  }
}