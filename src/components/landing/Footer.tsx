import { useState, useEffect } from "react";
import { phoneTel, phoneDisplay, companyName, email, companyNameFull, address, footerDescription } from "../../content/site";
import { Phone, Mail, MapPin, ArrowUp } from "lucide-react";
import { ErrorBoundary } from "../ErrorBoundary";

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [footerVisible, setFooterVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setShowBackToTop(window.scrollY > window.innerHeight);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Hide back-to-top FAB when footer is in viewport
  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setFooterVisible(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    observer.observe(footer);
    return () => observer.disconnect();
  }, []);

  return (
    <ErrorBoundary>
    <footer
      id="footer"
      className="bg-neutral-900 text-white relative overflow-hidden"
      aria-label="Site footer"
    >
      {/* Gradient top border */}
      <div className="h-px bg-gradient-to-r from-transparent via-accent-500 to-transparent" aria-hidden="true" />

      {/* RMI watermark */}
      <div
        className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
        aria-hidden="true"
      >
        <span className="text-[10rem] sm:text-[14rem] lg:text-[18rem] font-black text-white/[0.025] tracking-[0.2em] uppercase">
          RMI
        </span>
      </div>

      <div className="container-custom pt-4 sm:pt-8 pb-3 sm:pb-4 relative">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-8">
          {/* Company Info */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white mb-2 sm:mb-3">
              {companyNameFull}
            </h3>
            <p className="text-neutral-300 text-sm leading-relaxed">
              {footerDescription}
            </p>
            <p className="text-neutral-300 text-sm mt-2">
              Serving Michigan, Ohio, Indiana &amp; the Midwest.
            </p>
          </div>

          {/* Quick Links */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white mb-2 sm:mb-3">
              Quick Links
            </h3>
            <nav className="flex flex-col items-center md:items-start gap-1" aria-label="Footer navigation">
              <a
                href="#services"
                className="footer-link inline-flex items-center text-neutral-300 hover:text-accent-400 transition-colors duration-200 text-sm min-w-[44px] min-h-[44px] sm:min-h-0 sm:py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              >
                Services
              </a>
              <a
                href="#about"
                className="footer-link inline-flex items-center text-neutral-300 hover:text-accent-400 transition-colors duration-200 text-sm min-w-[44px] min-h-[44px] sm:min-h-0 sm:py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              >
                About
              </a>
              <a
                href="#projects"
                className="footer-link inline-flex items-center text-neutral-300 hover:text-accent-400 transition-colors duration-200 text-sm min-w-[44px] min-h-[44px] sm:min-h-0 sm:py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              >
                Projects
              </a>
              <a
                href="#contact"
                className="footer-link inline-flex items-center text-neutral-300 hover:text-accent-400 transition-colors duration-200 text-sm min-w-[44px] min-h-[44px] sm:min-h-0 sm:py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              >
                Contact
              </a>
              <a
                href="#contact"
                className="footer-link inline-flex items-center text-neutral-300 hover:text-accent-400 transition-colors duration-200 text-sm min-w-[44px] min-h-[44px] sm:min-h-0 sm:py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              >
                Request a Quote
              </a>
            </nav>
          </div>

          {/* Contact Info */}
          <div className="text-center md:text-left">
            <h3 className="text-lg font-bold text-white mb-2 sm:mb-3">
              Contact
            </h3>
            <div className="inline-flex flex-col items-center md:items-start">
              <a
                href={phoneTel}
                className="group flex items-center gap-2 text-white hover:text-accent-400 transition-all duration-200 text-sm min-h-[44px] sm:min-h-0 sm:py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                aria-label={`Call ${companyName} at ${phoneDisplay}`}
              >
                <Phone className="w-3.5 h-3.5 text-accent-500 group-hover:drop-shadow-[0_0_6px_rgba(96,165,250,0.5)] transition-all duration-200" aria-hidden="true" />
                <span>{phoneDisplay}</span>
              </a>

              <a
                href={`mailto:${email}`}
                className="group flex items-center gap-2 text-white hover:text-accent-400 transition-all duration-200 text-sm min-h-[44px] sm:min-h-0 sm:py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                aria-label={`Email ${companyName} at ${email}`}
              >
                <Mail className="w-3.5 h-3.5 text-accent-500 group-hover:drop-shadow-[0_0_6px_rgba(96,165,250,0.5)] transition-all duration-200" aria-hidden="true" />
                <span>{email}</span>
              </a>

              <a
                href="https://maps.google.com/?q=11677+Wayne+Road+Suite+112+Romulus+MI+48174"
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-start gap-2 text-white hover:text-accent-400 transition-all duration-200 text-sm min-h-[44px] sm:min-h-0 sm:py-1.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
                aria-label="View our location on Google Maps"
              >
                <MapPin className="w-3.5 h-3.5 text-accent-500 group-hover:drop-shadow-[0_0_6px_rgba(96,165,250,0.5)] flex-shrink-0 mt-0.5 transition-all duration-200" aria-hidden="true" />
                <span>{address.full}</span>
              </a>
            </div>
          </div>
        </div>

        {/* Social Links */}
        <nav aria-label="Social media links" className="mt-4 pt-4 border-t border-neutral-700/30 flex flex-col items-center gap-2">
          <p className="text-xs text-neutral-600 uppercase tracking-wider">Follow Us</p>
          <div className="flex justify-center gap-6">
          <a
            href="https://www.linkedin.com/company/resource-mechanical-insulation"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit our LinkedIn page"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-neutral-400 hover:text-accent-400 hover:bg-accent-500/10 hover:scale-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
            </svg>
          </a>
          <a
            href="https://www.facebook.com/ResourceMechanicalInsulation"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Visit our Facebook page"
            className="inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-lg text-neutral-400 hover:text-accent-400 hover:bg-accent-500/10 hover:scale-110 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </a>
          {/* Google Business icon — add back when GBP is claimed and verified */}
          </div>
        </nav>

        {/* Bottom Bar */}
        <div className="mt-3 pt-3 border-t border-neutral-700/30">
          <div className="flex justify-center sm:justify-end mb-1">
            <a
              href="#"
              className="text-xs text-neutral-400 hover:text-accent-400 transition-colors duration-200 inline-flex items-center gap-1 min-h-[44px] sm:min-h-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-400 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900"
              aria-label="Scroll back to top of page"
            >
              Back to Top
              <ArrowUp className="w-3 h-3" aria-hidden="true" />
            </a>
          </div>
          <p className="text-sm text-neutral-400 text-center">
            &copy; {currentYear} {companyNameFull}. All rights reserved.
          </p>
        </div>
      </div>

      {/* Floating back-to-top button — fades in after scrolling past first viewport */}
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        tabIndex={showBackToTop && !footerVisible ? 0 : -1}
        className={`fixed bottom-6 right-6 z-40 flex items-center justify-center w-11 h-11 rounded-full bg-neutral-800/90 border border-neutral-600/50 text-neutral-300 hover:text-white hover:bg-neutral-700 shadow-lg backdrop-blur-sm transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 focus-visible:ring-offset-neutral-900 ${
          showBackToTop && !footerVisible
            ? "opacity-100 translate-y-0 pointer-events-auto"
            : "opacity-0 translate-y-4 pointer-events-none"
        }`}
        aria-label="Back to top"
      >
        <ArrowUp className="w-5 h-5" aria-hidden="true" />
      </button>
    </footer>
    </ErrorBoundary>
  );
}
