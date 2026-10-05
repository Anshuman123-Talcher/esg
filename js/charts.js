/**
 * Dynamic Chart.js Analytics Engine
 * MEIL ESG & BRSR Reporting System
 */

class ChartEngine {
  constructor() {
    this.instances = {};
    // MEIL Corporate Chart Color Palette
    this.colors = {
      meilNavy: '#0b2545',
      meilNavyLight: '#1d4ed8',
      meilRed: '#c8102e',
      emerald: '#059669',
      emeraldLight: '#10b981',
      amber: '#d97706',
      purple: '#7c3aed',
      cyan: '#0284c7',
      slate: '#64748b',
      gridLines: 'rgba(226, 232, 240, 0.8)',
      textMuted: '#64748b'
    };
  }

  destroyChart(id) {
    if (this.instances[id]) {
      this.instances[id].destroy();
      delete this.instances[id];
    }
  }

  destroyAll() {
    Object.keys(this.instances).forEach(id => this.destroyChart(id));
  }

  // =========================================================================
  // 1. Consolidated / Subsidiary Energy Mix Chart (Donut / Bar)
  // =========================================================================
  renderEnergyMixChart(canvasId, energyData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const ren = Number(energyData.renewableEnergyMWh) || 0;
    const nonRen = Number(energyData.nonRenewableEnergyMWh) || 0;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Renewable Energy (Solar/Hydro)', 'Non-Renewable Energy (Grid/Diesel)'],
        datasets: [{
          data: [ren, nonRen],
          backgroundColor: [this.colors.emerald, this.colors.meilNavy],
          hoverBackgroundColor: [this.colors.emeraldLight, this.colors.meilNavyLight],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: {
            position: 'bottom',
            labels: { font: { family: 'Inter', size: 12 }, padding: 16 }
          },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${item.raw.toLocaleString()} MWh (${Math.round((item.raw / (ren + nonRen || 1)) * 100)}%)`
            }
          }
        }
      }
    });
  }

  // =========================================================================
  // 2. GHG Emissions Breakdown (Scope 1, 2, 3)
  // =========================================================================
  renderGHGChart(canvasId, ghgData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const s1 = Number(ghgData.ghgScope1) || 0;
    const s2 = Number(ghgData.ghgScope2) || 0;
    const s3 = Number(ghgData.ghgScope3) || 0;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Scope 1 (Direct)', 'Scope 2 (Electricity)', 'Scope 3 (Supply Chain)'],
        datasets: [{
          label: 'Emissions (tCO2e)',
          data: [s1, s2, s3],
          backgroundColor: [this.colors.meilRed, this.colors.amber, this.colors.meilNavy],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.raw.toLocaleString()} tCO2e`
            }
          }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: this.colors.gridLines },
            ticks: { callback: (v) => `${v.toLocaleString()} t` }
          }
        }
      }
    });
  }

  // =========================================================================
  // 3. Water Withdrawal vs Consumption vs Recycled
  // =========================================================================
  renderWaterChart(canvasId, waterData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Withdrawal', 'Consumption', 'Recycled & Reused'],
        datasets: [{
          label: 'Water Volume (kL)',
          data: [waterData.waterWithdrawalKL || 0, waterData.waterConsumptionKL || 0, waterData.waterRecycledKL || 0],
          backgroundColor: [this.colors.cyan, this.colors.amber, this.colors.emerald],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: this.colors.gridLines },
            ticks: { callback: (v) => `${(v / 1000).toFixed(0)}k kL` }
          }
        }
      }
    });
  }

  // =========================================================================
  // 4. Subsidiary ESG Benchmarking Comparison Bar Chart
  // =========================================================================
  renderSubsidiaryComparisonChart(canvasId, year = "FY 2025-26") {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const subs = store.getSubsidiaries();
    const labels = subs.map(s => s.shortName);

    const scores = [];
    const submissions = store.getSubmissions(year);

    subs.forEach(s => {
      const subm = submissions.find(sub => sub.subsidiaryId === s.id);
      scores.push(subm ? subm.esgScore : 50);
    });

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'ESG Index Score (0 - 100)',
          data: scores,
          backgroundColor: scores.map(score => score >= 90 ? this.colors.emerald : (score >= 75 ? this.colors.cyan : this.colors.amber)),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => ` ESG Index: ${item.raw}/100`
            }
          }
        },
        scales: {
          x: {
            min: 0,
            max: 100,
            grid: { color: this.colors.gridLines },
            ticks: { stepSize: 20 }
          },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // =========================================================================
  // 5. BRSR Principle-wise Performance Radar / Polar Chart
  // =========================================================================
  renderBRSRRadarChart(canvasId, principleScores) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const labels = [
      'P1 Ethics', 'P2 Sustainability', 'P3 Employees', 'P4 Stakeholders',
      'P5 Human Rights', 'P6 Environment', 'P7 Policy', 'P8 Community CSR', 'P9 Consumers'
    ];
    const dataPoints = principleScores.map(p => p.avgScore || p.score || 80);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'radar',
      data: {
        labels,
        datasets: [{
          label: 'BRSR Compliance Score %',
          data: dataPoints,
          backgroundColor: 'rgba(11, 37, 69, 0.2)',
          borderColor: this.colors.meilNavy,
          pointBackgroundColor: this.colors.meilRed,
          pointBorderColor: '#ffffff',
          pointHoverRadius: 6,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          r: {
            angleLines: { color: this.colors.gridLines },
            grid: { color: this.colors.gridLines },
            suggestedMin: 50,
            suggestedMax: 100,
            pointLabels: { font: { size: 11, family: 'Inter', weight: '600' } }
          }
        },
        plugins: {
          legend: { display: false }
        }
      }
    });
  }

  // =========================================================================
  // 6. Submissions Status Breakdown Chart (Donut)
  // =========================================================================
  renderSubmissionStatusChart(canvasId, statusCounts) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Approved', 'Submitted / In Review', 'Correction Required', 'Draft'],
        datasets: [{
          data: [
            statusCounts.approvedCount || 0,
            statusCounts.pendingReviewsCount || 0,
            statusCounts.correctionRequiredCount || 0,
            statusCounts.draftCount || 0
          ],
          backgroundColor: [
            this.colors.emerald,
            this.colors.cyan,
            this.colors.meilRed,
            this.colors.slate
          ],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { boxWidth: 12, padding: 12 } }
        }
      }
    });
  }

  // =========================================================================
  // 7. Multi-Year Historical ESG Trend
  // =========================================================================
  renderHistoricalTrendChart(canvasId) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['FY 2022-23', 'FY 2023-24', 'FY 2024-25', 'FY 2025-26 (Projected)'],
        datasets: [
          {
            label: 'Renewable Share %',
            data: [28.4, 39.2, 51.6, 61.4],
            borderColor: this.colors.emerald,
            backgroundColor: 'transparent',
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 4
          },
          {
            label: 'Emission Intensity Reduction %',
            data: [12.0, 19.5, 26.8, 34.2],
            borderColor: this.colors.meilNavyLight,
            backgroundColor: 'transparent',
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 4
          },
          {
            label: 'BRSR Readiness Index %',
            data: [62, 75, 88, 95],
            borderColor: this.colors.amber,
            backgroundColor: 'transparent',
            tension: 0.3,
            borderWidth: 3,
            pointRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { boxWidth: 12, padding: 14 } }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            grid: { color: this.colors.gridLines },
            ticks: { callback: (v) => `${v}%` },
            min: 0,
            max: 100
          }
        }
      }
    });
  }
  // =========================================================================
  // 8. Waste Breakdown Donut (Recycled, Disposed)
  // =========================================================================
  renderWasteChart(canvasId, wasteData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const recycled = Number(wasteData.wasteRecycledMT) || 0;
    const disposed = Number(wasteData.wasteDisposalMT) || 0;
    const other = Math.max(0, (Number(wasteData.wasteGeneratedMT) || 0) - recycled - disposed);
    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Recycled / Reused', 'Safe Disposal', 'Other Treatment'],
        datasets: [{
          data: [recycled, disposed, other],
          backgroundColor: [this.colors.emerald, this.colors.amber, this.colors.slate],
          borderWidth: 2, borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, cutout: '68%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 12, boxWidth: 10 } },
          tooltip: { callbacks: { label: (item) => ` ${item.label}: ${item.raw.toLocaleString()} MT` } }
        }
      }
    });
  }

  // =========================================================================
  // 9. ESG Performance Score - Horizontal Stacked Bar (E, S, G)
  // =========================================================================
  renderESGPerformanceChart(canvasId, esgData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const env = esgData.environment || {};
    const soc = esgData.social || {};
    const gov = esgData.governance || {};
    // Simplified scores from data completeness
    const eScore = Math.min(100, Math.round((env.renewablePercent || 50)));
    const sScore = Math.min(100, Math.round(((soc.femaleEmployees || 0) / Math.max(1, soc.totalEmployees || 100)) * 200 + 30));
    const gScore = Math.min(100, Math.round((gov.antiCorruptionTrainedPercent || 70)));
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Environment Score', 'Social Score', 'Governance Score'],
        datasets: [{
          label: 'Score / 100',
          data: [eScore, sScore, gScore],
          backgroundColor: [this.colors.emerald, this.colors.cyan, this.colors.purple],
          borderRadius: 8
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (item) => ` Score: ${item.raw}/100` } }
        },
        scales: {
          x: { min: 0, max: 100, grid: { color: this.colors.gridLines }, ticks: { callback: (v) => `${v}` } },
          y: { grid: { display: false } }
        }
      }
    });
  }

  // =========================================================================
  // 10. BRSR Section Completion Progress (Section A, B, C)
  // =========================================================================
  renderBRSRProgressChart(canvasId, brsrData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const secA = Number(brsrData.sectionA?.completed) || 75;
    const secB = Number(brsrData.sectionB?.completed) || 68;
    const secC = Number(brsrData.sectionC?.completed) || 82;
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: ['Section A\nGeneral Disclosures', 'Section B\nManagement Discussions', 'Section C\n9 BRSR Principles'],
        datasets: [{
          label: 'Completion %',
          data: [secA, secB, secC],
          backgroundColor: [
            `rgba(11, 37, 69, 0.85)`,
            `rgba(124, 58, 237, 0.85)`,
            `rgba(5, 150, 105, 0.85)`
          ],
          borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: (item) => ` ${item.raw}% Complete` } }
        },
        scales: {
          x: { grid: { display: false } },
          y: {
            min: 0, max: 100, grid: { color: this.colors.gridLines },
            ticks: { callback: (v) => `${v}%` }
          }
        }
      }
    });
  }

  // =========================================================================
  // 11. Business Unit ESG Status Polar Chart
  // =========================================================================
  renderBUStatusChart(canvasId, subsidiaryId) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const bus = store.getBusinessUnits(subsidiaryId);
    const labels = bus.map(bu => bu.name.replace('BU', '').trim().split(' ').slice(0, 3).join(' '));
    const data = bus.map(bu => {
      const projs = store.getProjects(subsidiaryId, bu.id);
      const avgESG = projs.length ? Math.round(projs.reduce((s, p) => s + (p.esgCompletion || 0), 0) / projs.length) : 70;
      return avgESG;
    });
    const colors = [this.colors.meilNavy, this.colors.emerald, this.colors.cyan, this.colors.amber, this.colors.purple, this.colors.meilRed];
    this.instances[canvasId] = new Chart(ctx, {
      type: 'polarArea',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: colors.slice(0, bus.length).map(c => c + 'CC'),
          borderColor: colors.slice(0, bus.length),
          borderWidth: 2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: {
          legend: { position: 'right', labels: { font: { size: 10, family: 'Inter' }, boxWidth: 10, padding: 8 } }
        },
        scales: {
          r: { grid: { color: this.colors.gridLines }, ticks: { display: false }, suggestedMin: 0, suggestedMax: 100 }
        }
      }
    });
  }

  // =========================================================================
  // 12. Project Progress Bar Chart (for Sub-Company)
  // =========================================================================
  renderProjectProgressChart(canvasId, subsidiaryId) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    const projs = store.getProjects(subsidiaryId).slice(0, 6);
    const labels = projs.map(p => p.name.split(' ').slice(0, 4).join(' '));
    const data = projs.map(p => p.progress || 0);
    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Progress %',
          data,
          backgroundColor: data.map(d => d >= 90 ? this.colors.emerald : d >= 60 ? this.colors.cyan : this.colors.amber),
          borderRadius: 6
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false }, tooltip: { callbacks: { label: (item) => ` ${item.raw}% Complete` } } },
        scales: {
          x: { min: 0, max: 100, grid: { color: this.colors.gridLines }, ticks: { callback: v => `${v}%` } },
          y: { grid: { display: false }, ticks: { font: { size: 10 } } }
        }
      }
    });
  }

  // =========================================================================
  // 13. Submission Status Timeline (Line Chart - for Sub Admin dashboard)
  // =========================================================================
  renderSubmissionTimelineChart(canvasId, submissionStatus) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    // Simulated milestone status
    const stages = ['Data Entry', 'Draft Ready', 'Internal Review', 'Submitted', 'Under Review', 'Approved'];
    const statusMap = {
      'Draft': 2, 'Submitted': 4, 'Under Review': 4.5, 'Correction Required': 3.5, 'Resubmitted': 4.5, 'Approved': 6
    };
    const currentStage = statusMap[submissionStatus] || 2;
    const dataPoints = [1, 2, 3, 4, 5, 6].map(s => s <= currentStage ? 100 : (s <= currentStage + 0.5 ? 50 : 0));
    this.instances[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: stages,
        datasets: [{
          label: 'Completion',
          data: dataPoints,
          borderColor: this.colors.emerald,
          backgroundColor: 'rgba(5, 150, 105, 0.15)',
          pointBackgroundColor: dataPoints.map(d => d === 100 ? this.colors.emerald : (d === 50 ? this.colors.amber : this.colors.slate)),
          pointRadius: 6,
          borderWidth: 2,
          fill: true,
          tension: 0.2
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { font: { size: 10 } } },
          y: { min: 0, max: 110, display: false }
        }
      }
    });
  }

  // =========================================================================
  // MODULE 11: SDG ANALYTICS CHARTS
  // =========================================================================

  renderSDGCoverageChart(canvasId, coverageData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (!coverageData) { coverageData = (store.getSDGAnalytics().coverage || []); }
    if (!coverageData || !coverageData.length) return;

    const labels = coverageData.map(c => `SDG ${c.id}`);
    const indicatorCounts = coverageData.map(c => c.indicatorsCount);
    const projectCounts = coverageData.map(c => c.projectsCount);
    const colors = coverageData.map(c => c.color || this.colors.meilNavy);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Mapped ESG Indicators',
            data: indicatorCounts,
            backgroundColor: colors,
            borderRadius: 4
          },
          {
            label: 'Contributing Projects',
            data: projectCounts,
            backgroundColor: this.colors.meilNavyLight,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } },
          tooltip: {
            callbacks: {
              title: (items) => {
                const idx = items[0].dataIndex;
                return `${coverageData[idx].code}: ${coverageData[idx].name}`;
              }
            }
          }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } },
          y: { beginAtZero: true, grid: { color: this.colors.gridLines }, ticks: { precision: 0 } }
        }
      }
    });
  }

  renderSDGProgressChart(canvasId, coverageData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (!coverageData) { coverageData = (store.getSDGAnalytics().coverage || []); }
    if (!coverageData || !coverageData.length) return;

    // Filter to top active SDGs or all
    const sorted = [...coverageData].sort((a,b) => b.progressPct - a.progressPct).slice(0, 10);
    const labels = sorted.map(c => `${c.code} (${c.name.slice(0, 16)}...)`);
    const progress = sorted.map(c => c.progressPct);
    const colors = sorted.map(c => c.color || this.colors.meilNavy);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Progress %',
          data: progress,
          backgroundColor: colors,
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              afterLabel: (item) => `Status: ${sorted[item.dataIndex].status} | Target: ${sorted[item.dataIndex].target}`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            max: 130,
            grid: { color: this.colors.gridLines },
            ticks: { callback: v => `${v}%` }
          },
          y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
        }
      }
    });
  }

  renderSDGSubsidiaryChart(canvasId, bySubsidiaryData) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    if (!bySubsidiaryData) { bySubsidiaryData = (store.getSDGAnalytics().bySubsidiary || []); }
    if (!bySubsidiaryData || !bySubsidiaryData.length) return;

    const labels = bySubsidiaryData.map(s => s.shortName);
    const data = bySubsidiaryData.map(s => s.contributingSDGsCount);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels,
        datasets: [{
          data,
          backgroundColor: [this.colors.meilNavy, this.colors.emerald, this.colors.meilRed, this.colors.amber, this.colors.purple],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 12 } },
          tooltip: {
            callbacks: {
              label: (item) => ` ${item.label}: ${item.raw} SDGs aligned`
            }
          }
        }
      }
    });
  }

  renderSDGProjectChart(canvasId, subsidiaryId = null) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const projs = store.getProjects(subsidiaryId && subsidiaryId !== 'all' ? subsidiaryId : null);
    if (!projs || !projs.length) return;

    // Sort by SDG count descending, take top 8
    const sorted = [...projs].sort((a,b) => ((b.sdgs||[]).length) - ((a.sdgs||[]).length)).slice(0, 8);
    const labels = sorted.map(p => `${p.code} (${p.city || p.location.split(',')[0]})`);
    const sdgCounts = sorted.map(p => (p.sdgs || []).length);
    const esgScores = sorted.map(p => p.esgCompletion || 80);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'Mapped SDGs Count',
            data: sdgCounts,
            backgroundColor: this.colors.meilNavy,
            borderRadius: 4,
            yAxisID: 'y'
          },
          {
            label: 'Project ESG Score (%)',
            data: esgScores,
            backgroundColor: this.colors.emerald,
            borderRadius: 4,
            yAxisID: 'y1'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } },
          y: {
            type: 'linear',
            display: true,
            position: 'left',
            beginAtZero: true,
            title: { display: true, text: 'SDGs Count', font: { size: 10 } },
            ticks: { precision: 0 }
          },
          y1: {
            type: 'linear',
            display: true,
            position: 'right',
            beginAtZero: true,
            max: 100,
            grid: { drawOnChartArea: false },
            title: { display: true, text: 'ESG Score %', font: { size: 10 } },
            ticks: { callback: v => `${v}%` }
          }
        }
      }
    });
  }

  renderSDGBusinessUnitChart(canvasId, subsidiaryId = null) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    const bus = store.getBusinessUnits(subsidiaryId && subsidiaryId !== 'all' ? subsidiaryId : null);
    if (!bus || !bus.length) return;

    const labels = bus.map(b => b.name.length > 22 ? b.name.slice(0, 20) + '...' : b.name);
    const projCounts = bus.map(b => b.projectCount || 0);

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Contributing Projects',
          data: projCounts,
          backgroundColor: [this.colors.meilNavy, this.colors.meilRed, this.colors.emerald, this.colors.amber, this.colors.purple, this.colors.meilBlue],
          borderRadius: 4
        }]
      },
      options: {
        indexAxis: 'y',
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: this.colors.gridLines }, ticks: { precision: 0 } },
          y: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 11 } } }
        }
      }
    });
  }

  renderBUComparisonChart(canvasId, busList, year = 'FY 2025-26') {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    // Accept either a BU list array or a subsidiary ID string
    if (!busList || typeof busList === 'string') {
      const subId = (typeof busList === 'string' && busList !== 'all') ? busList : null;
      busList = store.getBusinessUnits(subId);
    }
    if (!busList || !busList.length) return;

    const labels = busList.map(b => b.name.length > 20 ? b.name.slice(0, 18) + '...' : b.name);
    const esgScores = busList.map(b => {
      const buESG = store.getBusinessUnitESG(b.id, year);
      return buESG ? buESG.esgCompletion : 70;
    });
    const brsrScores = busList.map(b => {
      const buESG = store.getBusinessUnitESG(b.id, year);
      return buESG ? buESG.brsrCompletion : 65;
    });

    this.instances[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels,
        datasets: [
          {
            label: 'ESG Completion %',
            data: esgScores,
            backgroundColor: this.colors.emerald,
            borderRadius: 4
          },
          {
            label: 'BRSR Readiness %',
            data: brsrScores,
            backgroundColor: this.colors.meilNavyLight,
            borderRadius: 4
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top', labels: { font: { family: 'Inter', size: 11 } } }
        },
        scales: {
          x: { grid: { display: false }, ticks: { font: { family: 'Inter', size: 10 } } },
          y: { beginAtZero: true, max: 100, grid: { color: this.colors.gridLines } }
        }
      }
    });
  }

  renderProjectRollupChart(canvasId, projects) {
    this.destroyChart(canvasId);
    const ctx = document.getElementById(canvasId);
    if (!ctx || !projects) return;

    const approvedCount = projects.filter(p => p.submissionStatus === 'Approved').length;
    const submittedCount = projects.filter(p => p.submissionStatus === 'Submitted').length;
    const correctionCount = projects.filter(p => p.submissionStatus === 'Correction Required').length;
    const draftCount = projects.filter(p => p.submissionStatus === 'Draft').length;

    this.instances[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['Approved (In Consolidation)', 'Submitted (Under Review)', 'Correction Required', 'Draft (Pending)'],
        datasets: [{
          data: [approvedCount, submittedCount, correctionCount, draftCount],
          backgroundColor: [this.colors.emerald, this.colors.cyan, this.colors.amber, this.colors.slate],
          borderWidth: 2,
          borderColor: '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '70%',
        plugins: {
          legend: { position: 'bottom', labels: { font: { family: 'Inter', size: 11 }, padding: 10 } }
        }
      }
    });
  }
}

// Global Singleton Chart Instance
const chartEngine = new ChartEngine();
window.chartEngine = chartEngine;

