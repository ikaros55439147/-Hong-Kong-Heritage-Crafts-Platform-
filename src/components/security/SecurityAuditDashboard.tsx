'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Alert } from '@/components/ui/Alert';
import { Loading } from '@/components/ui/Loading';

interface SecurityAuditResult {
  id: string;
  timestamp: Date;
  vulnerabilities: Array<{
    id: string;
    type: 'critical' | 'high' | 'medium' | 'low';
    category: string;
    description: string;
    location: string;
    recommendation: string;
    status: 'open' | 'fixed' | 'mitigated';
  }>;
  complianceChecks: Array<{
    id: string;
    regulation: 'GDPR' | 'CCPA' | 'PIPEDA' | 'PDPO';
    requirement: string;
    status: 'compliant' | 'non-compliant' | 'partial';
    recommendations: string[];
  }>;
  overallRiskScore: number;
  recommendations: string[];
}

interface PenetrationTestResult {
  id: string;
  name: string;
  tests: Array<{
    id: string;
    testType: string;
    endpoint: string;
    vulnerability: {
      detected: boolean;
      severity: 'critical' | 'high' | 'medium' | 'low';
      description: string;
      recommendation: string;
    };
  }>;
  summary: {
    totalTests: number;
    vulnerabilitiesFound: number;
    criticalVulnerabilities: number;
    highVulnerabilities: number;
    mediumVulnerabilities: number;
    lowVulnerabilities: number;
  };
}

interface ComplianceReport {
  id: string;
  regulation: string;
  overallScore: number;
  summary: {
    totalRequirements: number;
    compliantRequirements: number;
    nonCompliantRequirements: number;
    partialRequirements: number;
  };
  criticalGaps: string[];
  actionPlan: Array<{
    id: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    description: string;
    estimatedEffort: string;
  }>;
}

export function SecurityAuditDashboard() {
  const [loading, setLoading] = useState(false);
  const [auditResult, setAuditResult] = useState<SecurityAuditResult | null>(null);
  const [penetrationTestResult, setPenetrationTestResult] = useState<PenetrationTestResult | null>(null);
  const [complianceReport, setComplianceReport] = useState<ComplianceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'audit' | 'pentest' | 'compliance'>('audit');

  const runSecurityAudit = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/security/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ auditType: 'comprehensive' }),
      });

      if (!response.ok) {
        throw new Error('Failed to run security audit');
      }

      const data = await response.json();
      setAuditResult(data.audit);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runPenetrationTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/security/penetration-test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ testType: 'comprehensive' }),
      });

      if (!response.ok) {
        throw new Error('Failed to run penetration test');
      }

      const data = await response.json();
      setPenetrationTestResult(data.penetrationTest);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runComplianceCheck = async (regulation: 'GDPR' | 'PDPO') => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/security/compliance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ regulation, action: 'assess' }),
      });

      if (!response.ok) {
        throw new Error('Failed to run compliance check');
      }

      const data = await response.json();
      setComplianceReport(data.complianceReport);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const runFullSecurityAssessment = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/security/audit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ auditType: 'full-security-assessment' }),
      });

      if (!response.ok) {
        throw new Error('Failed to run full security assessment');
      }

      const data = await response.json();
      const assessment = data.fullAssessment;
      
      setAuditResult(assessment.securityAudit);
      setPenetrationTestResult(assessment.penetrationTest);
      setComplianceReport(assessment.compliance.gdpr);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getRiskColor = (type: string) => {
    switch (type) {
      case 'critical': return 'text-red-600 bg-red-50';
      case 'high': return 'text-orange-600 bg-orange-50';
      case 'medium': return 'text-yellow-600 bg-yellow-50';
      case 'low': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getComplianceColor = (score: number) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    if (score >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Security Audit Dashboard
        </h1>
        <p className="text-gray-600">
          Comprehensive security assessment and compliance checking for the Heritage Crafts Platform
        </p>
      </div>

      {error && (
        <Alert type="error" className="mb-6">
          {error}
        </Alert>
      )}

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Button
          onClick={runSecurityAudit}
          disabled={loading}
          className="h-20 flex flex-col items-center justify-center"
        >
          <span className="text-sm font-medium">Security Audit</span>
          <span className="text-xs text-gray-500 mt-1">Vulnerability Scan</span>
        </Button>
        
        <Button
          onClick={runPenetrationTest}
          disabled={loading}
          variant="outline"
          className="h-20 flex flex-col items-center justify-center"
        >
          <span className="text-sm font-medium">Penetration Test</span>
          <span className="text-xs text-gray-500 mt-1">Attack Simulation</span>
        </Button>
        
        <Button
          onClick={() => runComplianceCheck('GDPR')}
          disabled={loading}
          variant="outline"
          className="h-20 flex flex-col items-center justify-center"
        >
          <span className="text-sm font-medium">GDPR Compliance</span>
          <span className="text-xs text-gray-500 mt-1">EU Regulation</span>
        </Button>
        
        <Button
          onClick={runFullSecurityAssessment}
          disabled={loading}
          variant="secondary"
          className="h-20 flex flex-col items-center justify-center"
        >
          <span className="text-sm font-medium">Full Assessment</span>
          <span className="text-xs text-gray-500 mt-1">Complete Audit</span>
        </Button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loading size="large" />
          <span className="ml-3 text-lg">Running security assessment...</span>
        </div>
      )}

      {/* Results Tabs */}
      {(auditResult || penetrationTestResult || complianceReport) && (
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {auditResult && (
                <button
                  onClick={() => setActiveTab('audit')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'audit'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Security Audit
                </button>
              )}
              {penetrationTestResult && (
                <button
                  onClick={() => setActiveTab('pentest')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'pentest'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Penetration Test
                </button>
              )}
              {complianceReport && (
                <button
                  onClick={() => setActiveTab('compliance')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'compliance'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  Compliance Report
                </button>
              )}
            </nav>
          </div>

          <div className="p-6">
            {/* Security Audit Results */}
            {activeTab === 'audit' && auditResult && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Security Audit Results</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {auditResult.vulnerabilities.length}
                      </div>
                      <div className="text-sm text-gray-600">Total Vulnerabilities</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {auditResult.vulnerabilities.filter(v => v.type === 'critical').length}
                      </div>
                      <div className="text-sm text-red-600">Critical Issues</div>
                    </div>
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-blue-600">
                        {auditResult.overallRiskScore}%
                      </div>
                      <div className="text-sm text-blue-600">Risk Score</div>
                    </div>
                  </div>
                </div>

                {auditResult.vulnerabilities.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-3">Vulnerabilities Found</h4>
                    <div className="space-y-3">
                      {auditResult.vulnerabilities.map((vuln) => (
                        <div key={vuln.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(vuln.type)}`}>
                              {vuln.type.toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-500">{vuln.category}</span>
                          </div>
                          <h5 className="font-medium mb-1">{vuln.description}</h5>
                          <p className="text-sm text-gray-600 mb-2">Location: {vuln.location}</p>
                          <p className="text-sm text-blue-600">Recommendation: {vuln.recommendation}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {auditResult.recommendations.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold mb-3">General Recommendations</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {auditResult.recommendations.map((rec, index) => (
                        <li key={index} className="text-sm text-gray-700">{rec}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Penetration Test Results */}
            {activeTab === 'pentest' && penetrationTestResult && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Penetration Test Results</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-gray-900">
                        {penetrationTestResult.summary.totalTests}
                      </div>
                      <div className="text-sm text-gray-600">Total Tests</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {penetrationTestResult.summary.criticalVulnerabilities}
                      </div>
                      <div className="text-sm text-red-600">Critical</div>
                    </div>
                    <div className="bg-orange-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-orange-600">
                        {penetrationTestResult.summary.highVulnerabilities}
                      </div>
                      <div className="text-sm text-orange-600">High</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {penetrationTestResult.summary.mediumVulnerabilities}
                      </div>
                      <div className="text-sm text-yellow-600">Medium</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {penetrationTestResult.tests
                    .filter(test => test.vulnerability.detected)
                    .map((test) => (
                      <div key={test.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(test.vulnerability.severity)}`}>
                            {test.vulnerability.severity.toUpperCase()}
                          </span>
                          <span className="text-sm text-gray-500">{test.testType}</span>
                        </div>
                        <h5 className="font-medium mb-1">{test.vulnerability.description}</h5>
                        <p className="text-sm text-gray-600 mb-2">Endpoint: {test.endpoint}</p>
                        <p className="text-sm text-blue-600">Recommendation: {test.vulnerability.recommendation}</p>
                      </div>
                    ))}
                </div>

                {penetrationTestResult.tests.filter(test => test.vulnerability.detected).length === 0 && (
                  <div className="text-center py-8">
                    <div className="text-green-600 text-lg font-medium mb-2">
                      ✅ No vulnerabilities detected
                    </div>
                    <p className="text-gray-600">All penetration tests passed successfully</p>
                  </div>
                )}
              </div>
            )}

            {/* Compliance Report */}
            {activeTab === 'compliance' && complianceReport && (
              <div>
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-2">Compliance Report - {complianceReport.regulation}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={`p-4 rounded-lg ${getComplianceColor(complianceReport.overallScore)}`}>
                      <div className="text-2xl font-bold">
                        {complianceReport.overallScore}%
                      </div>
                      <div className="text-sm">Overall Score</div>
                    </div>
                    <div className="bg-green-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-green-600">
                        {complianceReport.summary.compliantRequirements}
                      </div>
                      <div className="text-sm text-green-600">Compliant</div>
                    </div>
                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-yellow-600">
                        {complianceReport.summary.partialRequirements}
                      </div>
                      <div className="text-sm text-yellow-600">Partial</div>
                    </div>
                    <div className="bg-red-50 p-4 rounded-lg">
                      <div className="text-2xl font-bold text-red-600">
                        {complianceReport.summary.nonCompliantRequirements}
                      </div>
                      <div className="text-sm text-red-600">Non-Compliant</div>
                    </div>
                  </div>
                </div>

                {complianceReport.criticalGaps.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold mb-3">Critical Compliance Gaps</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {complianceReport.criticalGaps.map((gap, index) => (
                        <li key={index} className="text-sm text-red-700">{gap}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {complianceReport.actionPlan.length > 0 && (
                  <div>
                    <h4 className="text-md font-semibold mb-3">Action Plan</h4>
                    <div className="space-y-3">
                      {complianceReport.actionPlan.slice(0, 5).map((action) => (
                        <div key={action.id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRiskColor(action.priority)}`}>
                              {action.priority.toUpperCase()}
                            </span>
                            <span className="text-sm text-gray-500">{action.estimatedEffort}</span>
                          </div>
                          <p className="text-sm text-gray-700">{action.description}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}