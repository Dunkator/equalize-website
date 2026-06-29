/* ============================================================
   Equalize — script.js
============================================================ */

(function () {
  'use strict';

  /* ----------------------------------------------------------
     NAV: add scrolled state
  ---------------------------------------------------------- */
  const nav = document.getElementById('nav');

  function updateNav() {
    if (window.scrollY > 10) {
      nav.classList.add('is-scrolled');
    } else {
      nav.classList.remove('is-scrolled');
    }
  }

  window.addEventListener('scroll', updateNav, { passive: true });
  updateNav();


  /* ----------------------------------------------------------
     MOBILE MENU: toggle open / close
  ---------------------------------------------------------- */
  const hamburger   = document.getElementById('hamburger');
  const mobileMenu  = document.getElementById('mobile-menu');

  if (hamburger && mobileMenu) {
    const mobileLinks = mobileMenu.querySelectorAll('a');

    function openMenu() {
      mobileMenu.classList.add('is-open');
      mobileMenu.setAttribute('aria-hidden', 'false');
      hamburger.classList.add('is-active');
      hamburger.setAttribute('aria-expanded', 'true');
      document.body.style.overflow = 'hidden';
    }

    function closeMenu() {
      mobileMenu.classList.remove('is-open');
      mobileMenu.setAttribute('aria-hidden', 'true');
      hamburger.classList.remove('is-active');
      hamburger.setAttribute('aria-expanded', 'false');
      document.body.style.overflow = '';
    }

    hamburger.addEventListener('click', function () {
      if (mobileMenu.classList.contains('is-open')) {
        closeMenu();
      } else {
        openMenu();
      }
    });

    // Close when a nav link is clicked
    mobileLinks.forEach(function (link) {
      link.addEventListener('click', closeMenu);
    });

    // Close when clicking outside the menu
    document.addEventListener('click', function (e) {
      if (
        mobileMenu.classList.contains('is-open') &&
        !mobileMenu.contains(e.target) &&
        !hamburger.contains(e.target)
      ) {
        closeMenu();
      }
    });

    // Close on Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && mobileMenu.classList.contains('is-open')) {
        closeMenu();
        hamburger.focus();
      }
    });
  }


  /* ----------------------------------------------------------
     FAQ: accordion
  ---------------------------------------------------------- */
  const faqItems = document.querySelectorAll('.faq-item');

  faqItems.forEach(function (item) {
    const btn    = item.querySelector('.faq-q');
    const answer = item.querySelector('.faq-a');

    btn.addEventListener('click', function () {
      const isOpen = btn.getAttribute('aria-expanded') === 'true';

      // Close all other items first
      faqItems.forEach(function (other) {
        if (other !== item) {
          other.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
          other.querySelector('.faq-a').classList.remove('is-open');
        }
      });

      // Toggle this one
      if (isOpen) {
        btn.setAttribute('aria-expanded', 'false');
        answer.classList.remove('is-open');
      } else {
        btn.setAttribute('aria-expanded', 'true');
        answer.classList.add('is-open');
      }
    });
  });


  /* ----------------------------------------------------------
     SCROLL ANIMATIONS: fade + slide in on scroll
  ---------------------------------------------------------- */
  const animatedEls = document.querySelectorAll('.animate-on-scroll');

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );

    animatedEls.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    // Fallback: show everything immediately
    animatedEls.forEach(function (el) {
      el.classList.add('is-visible');
    });
  }


  /* ----------------------------------------------------------
     SMOOTH SCROLL: for anchor links (enhances html scroll-behavior
     for browsers that don't support it natively, and offsets for
     the fixed nav height)
  ---------------------------------------------------------- */
  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (e) {
      const href = link.getAttribute('href');
      if (href === '#') return;

      const target = document.querySelector(href);
      if (!target) return;

      e.preventDefault();

      const navHeight = nav ? nav.offsetHeight : 0;
      const targetTop = target.getBoundingClientRect().top + window.scrollY - navHeight - 8;

      window.scrollTo({ top: targetTop, behavior: 'smooth' });
    });
  });


  /* ----------------------------------------------------------
     ACTIVE NAV LINK: highlight current section while scrolling
  ---------------------------------------------------------- */
  const sections    = document.querySelectorAll('section[id]');
  const navAnchors  = document.querySelectorAll('.nav-links a');

  function updateActiveLink() {
    const scrollPos = window.scrollY + (nav ? nav.offsetHeight : 0) + 60;

    let current = '';
    sections.forEach(function (section) {
      if (section.offsetTop <= scrollPos) {
        current = section.id;
      }
    });

    navAnchors.forEach(function (a) {
      a.classList.remove('is-active');
      if (a.getAttribute('href') === '#' + current) {
        a.classList.add('is-active');
      }
    });
  }

  window.addEventListener('scroll', updateActiveLink, { passive: true });
  updateActiveLink();

})();
