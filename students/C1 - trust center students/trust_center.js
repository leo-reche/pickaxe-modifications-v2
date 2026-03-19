  (function() {
    var lastPathname = '';

    function isStudentTrustCenterPage() {
      var path = typeof window.location.pathname !== 'undefined'
        ? window.location.pathname
        : (window.location.pathname || '');
      return path === '/trust_center' || path.endsWith('/trust_center');
    }

    function initStudentFlowMobile() {
      var wrap = document.querySelector('.student-flow-carousel-wrap');
      var prevBtn = document.querySelector('.student-flow-carousel-arrow.prev');
      var nextBtn = document.querySelector('.student-flow-carousel-arrow.next');
      var container = document.querySelector('.student-flow-mobile');
      if (!wrap || !prevBtn || !nextBtn || !container) {
        console.log('[Student Trust Center] Carousel: not mounted (missing elements)');
        return;
      }
      console.log('[Student Trust Center] Carousel: mounted');

      function getScrollAmount() {
        return wrap.clientWidth;
      }

      prevBtn.addEventListener('click', function() {
        wrap.scrollBy({ left: -getScrollAmount(), behavior: 'smooth' });
      });
      nextBtn.addEventListener('click', function() {
        wrap.scrollBy({ left: getScrollAmount(), behavior: 'smooth' });
      });

      var scrollEndTimer;
      wrap.addEventListener('scroll', function() {
        container.classList.add('is-scrolling');
        clearTimeout(scrollEndTimer);
        scrollEndTimer = setTimeout(function() {
          container.classList.remove('is-scrolling');
        }, 150);
      });
    }

    function initSvgTooltips() {
      var nodeGroups = document.querySelectorAll('.node-group');
      var tooltip = document.getElementById('svg-tooltip');
      var svg = document.getElementById('flowchart-svg') || document.querySelector('.flowchart-svg');
      if (!nodeGroups.length || !tooltip || !svg) {
        console.log('[Student Trust Center] SVG tooltips: not mounted (missing elements)');
        return;
      }
      console.log('[Student Trust Center] SVG tooltips: mounted (' + nodeGroups.length + ' nodes)');

      nodeGroups.forEach(function(group) {
        group.addEventListener('mouseenter', function() {
          var tooltipText = this.getAttribute('data-tooltip');
          tooltip.innerHTML = tooltipText || '';
          if (tooltipText) {
            tooltip.classList.add('visible');
            this.classList.add('hovered');
            var svgRect = svg.getBoundingClientRect();
            var rect = this.querySelector('rect');
            if (rect) {
              var x = parseFloat(rect.getAttribute('x')) || 0;
              var y = parseFloat(rect.getAttribute('y')) || 0;
              var width = parseFloat(rect.getAttribute('width')) || 0;
              var height = parseFloat(rect.getAttribute('height')) || 0;
              var scaleX = svgRect.width / 1000;
              var scaleY = svgRect.height / 600;
              var elemCenterX = svgRect.left + (x + width / 2) * scaleX;
              var elemBottomY = svgRect.top + (y + height) * scaleY;
              tooltip.style.left = (elemCenterX - tooltip.offsetWidth / 2) + 'px';
              tooltip.style.top = (elemBottomY + 10) + 'px';
            }
          }
        });
        group.addEventListener('mouseleave', function() {
          tooltip.classList.remove('visible');
          this.classList.remove('hovered');
        });
      });
    }

    function runInit() {
      if (!isStudentTrustCenterPage()) {
        lastPathname = window.location.pathname;
        return;
      }
      if (window.location.pathname === lastPathname) {
        return;
      }
      lastPathname = window.location.pathname;
      console.log('[Student Trust Center] URL OK, initializing...');

      var maxAttempts = 15;
      var interval = 200;
      var attempts = 0;
      var carouselDone = false;
      var tooltipsDone = false;

      function tryMount() {
        attempts++;
        var wrap = document.querySelector('.student-flow-carousel-wrap');
        var prevBtn = document.querySelector('.student-flow-carousel-arrow.prev');
        var nextBtn = document.querySelector('.student-flow-carousel-arrow.next');
        var container = document.querySelector('.student-flow-mobile');
        var nodeGroups = document.querySelectorAll('.node-group');
        var tooltip = document.getElementById('svg-tooltip');
        var svg = document.getElementById('flowchart-svg') || document.querySelector('.flowchart-svg');

        if (!carouselDone && wrap && prevBtn && nextBtn && container) {
          initStudentFlowMobile();
          carouselDone = true;
        }
        if (!tooltipsDone && nodeGroups.length && tooltip && svg) {
          initSvgTooltips();
          tooltipsDone = true;
        }

        if (carouselDone && tooltipsDone) {
          return;
        }
        if (attempts < maxAttempts) {
          setTimeout(tryMount, interval);
        } else {
          if (!carouselDone) console.log('[Student Trust Center] Carousel: not mounted after ' + maxAttempts + ' attempts');
          if (!tooltipsDone) console.log('[Student Trust Center] SVG tooltips: not mounted after ' + maxAttempts + ' attempts');
        }
      }

      tryMount();
    }

    document.addEventListener('DOMContentLoaded', function() {
      if (!isStudentTrustCenterPage()) {
        console.log('[Student Trust Center] Skipped (URL does not end with /student_trust_center). Path: ', window.location.pathname);
        lastPathname = window.location.pathname;
        return;
      }
      runInit();
    });

    window.addEventListener('popstate', runInit);

    setInterval(function() {
      if (!isStudentTrustCenterPage()) {
        lastPathname = window.location.pathname;
        return;
      }
      runInit();
    }, 500);
  })();
