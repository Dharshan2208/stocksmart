// Animate stats counter
function animateStats() {
    const statNumbers = document.querySelectorAll('.stat-number');
    
    statNumbers.forEach(stat => {
      const target = +stat.getAttribute('data-count');
      const duration = 2000;
      const step = target / (duration / 16);
      let current = 0;
      
      const updateCount = () => {
        current += step;
        if (current < target) {
          stat.textContent = Math.floor(current);
          requestAnimationFrame(updateCount);
        } else {
          stat.textContent = target;
        }
      };
      
      updateCount();
    });
  }
  
  // Header scroll effect
  function handleHeaderScroll() {
    const header = document.querySelector('.header');
    if (window.scrollY > 50) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  
  // Initialize animations when page loads
  document.addEventListener('DOMContentLoaded', () => {
    // Animate stats when they come into view
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateStats();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });
    
    const statsSection = document.querySelector('.stats');
    if (statsSection) {
      observer.observe(statsSection);
    }
    
    // Header scroll effect
    window.addEventListener('scroll', handleHeaderScroll);
    handleHeaderScroll(); // Initialize on load
    
    // Smooth scrolling for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function(e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href');
        if (targetId === '#') return;
        
        const targetElement = document.querySelector(targetId);
        if (targetElement) {
          window.scrollTo({
            top: targetElement.offsetTop - 80,
            behavior: 'smooth'
          });
        }
      });
    });
  });