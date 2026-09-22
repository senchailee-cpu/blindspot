/**
 * Chart.js Integration for AI Blind Spot Analysis
 */

let sourceDonutChart = null;

function initSourceChart(containerCanvasId, distribution) {
  const ctx = document.getElementById(containerCanvasId);
  if (!ctx) return;

  const dataValues = [
    distribution.instagram || 0,
    distribution.viralBlog || 0,
    distribution.mediaBroadcast || 0,
    distribution.officialOpenData || 0
  ];

  const colors = [
    '#FF3366', // Instagram
    '#00C73C', // Naver Blog
    '#3B82F6', // Broadcast / Media
    '#8B5CF6'  // Official Open Data
  ];

  if (sourceDonutChart) {
    sourceDonutChart.destroy();
  }

  sourceDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['SNS/인스타그램', '체험단/블로그', 'TV방송/언론', '공공데이터/문화재'],
      datasets: [{
        data: dataValues,
        backgroundColor: colors,
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverOffset: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '68%',
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f8fafc',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(255, 255, 255, 0.1)',
          borderWidth: 1,
          padding: 8,
          callbacks: {
            label: function(context) {
              return ` ${context.label}: ${context.raw}%`;
            }
          }
        }
      },
      animation: {
        duration: 600,
        easing: 'easeOutQuart'
      }
    }
  });
}

function updateSourceChart(distribution) {
  if (!sourceDonutChart) return;
  sourceDonutChart.data.datasets[0].data = [
    distribution.instagram || 0,
    distribution.viralBlog || 0,
    distribution.mediaBroadcast || 0,
    distribution.officialOpenData || 0
  ];
  sourceDonutChart.update();
}

window.ChartManager = {
  initSourceChart,
  updateSourceChart,
  renderDonutChart: initSourceChart
};
