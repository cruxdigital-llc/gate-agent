/**
 * HTML reporter - generates a visual HTML dashboard
 */

import { writeFile, mkdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import type { QualityGatesReport, GateResult } from '../types.js';

function getStatusColor(status: GateResult['status']): string {
  switch (status) {
    case 'passed':
      return '#22c55e';
    case 'failed':
      return '#ef4444';
    case 'skipped':
      return '#eab308';
    case 'error':
      return '#dc2626';
  }
}

function generateHTML(report: QualityGatesReport): string {
  const gateRows = report.results
    .map((result) => {
      const statusColor = getStatusColor(result.status);
      const errors = result.errors
        ? `<ul>${result.errors.map((e) => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`
        : '';
      const warnings = result.warnings
        ? `<ul>${result.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>`
        : '';

      return `
        <tr>
          <td><strong>${escapeHtml(result.name)}</strong></td>
          <td><span class="status" style="background: ${statusColor}">${result.status.toUpperCase()}</span></td>
          <td>${escapeHtml(result.message || '')}</td>
          <td>${errors}${warnings}</td>
        </tr>
      `;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Quality Gates Report</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      padding: 2rem;
      background: #f9fafb;
      color: #1f2937;
    }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
    .timestamp { color: #6b7280; margin-bottom: 2rem; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }
    .summary-card {
      background: white;
      padding: 1.5rem;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    }
    .summary-card .label { font-size: 0.875rem; color: #6b7280; margin-bottom: 0.5rem; }
    .summary-card .value { font-size: 2rem; font-weight: bold; }
    .summary-card.success .value { color: #22c55e; }
    .summary-card.failed .value { color: #ef4444; }
    table {
      width: 100%;
      background: white;
      border-radius: 0.5rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      border-collapse: collapse;
      overflow: hidden;
    }
    th, td { padding: 1rem; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f3f4f6; font-weight: 600; }
    tr:last-child td { border-bottom: none; }
    .status {
      display: inline-block;
      padding: 0.25rem 0.75rem;
      border-radius: 0.25rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: white;
    }
    ul { margin-left: 1rem; color: #6b7280; font-size: 0.875rem; }
    li { margin: 0.25rem 0; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Quality Gates Report</h1>
    <div class="timestamp">${new Date(report.timestamp).toLocaleString()}</div>

    <div class="summary">
      <div class="summary-card ${report.success ? 'success' : 'failed'}">
        <div class="label">Status</div>
        <div class="value">${report.success ? '✓ PASSED' : '✗ FAILED'}</div>
      </div>
      <div class="summary-card">
        <div class="label">Total Gates</div>
        <div class="value">${report.summary.total}</div>
      </div>
      <div class="summary-card success">
        <div class="label">Passed</div>
        <div class="value">${report.summary.passed}</div>
      </div>
      <div class="summary-card failed">
        <div class="label">Failed</div>
        <div class="value">${report.summary.failed}</div>
      </div>
      <div class="summary-card">
        <div class="label">Duration</div>
        <div class="value">${(report.summary.totalDuration / 1000).toFixed(2)}s</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th>Gate</th>
          <th>Status</th>
          <th>Message</th>
          <th>Details</th>
        </tr>
      </thead>
      <tbody>
        ${gateRows}
      </tbody>
    </table>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m] ?? m);
}

export class HTMLReporter {
  async report(report: QualityGatesReport, outputDir: string, projectRoot: string): Promise<void> {
    const outputPath = resolve(projectRoot, outputDir, 'gate-agent-report.html');

    // Ensure output directory exists
    await mkdir(dirname(outputPath), { recursive: true });

    // Generate and write HTML report
    const html = generateHTML(report);
    await writeFile(outputPath, html, 'utf-8');

    console.log(`HTML report written to: ${outputPath}`);
  }
}
