/**
 * Automatic Device Aspect Ratio & Screen Fitting Adapter
 * Dynamically detects screen resolution, aspect ratio, orientation, touch capabilities, and device pixel ratio.
 * Calculates responsive scale factors and assigns aspect-ratio CSS variables and helper classes on <html> root.
 */
(function() {
    'use strict';

    const DeviceAspectAdapter = {
        init() {
            this.adjustScreenToDevice();
            this.bindEvents();
        },

        adjustScreenToDevice() {
            // Use true window viewport dimensions (avoid screen.width which returns desktop monitor specs in iframes)
            const width = window.innerWidth || document.documentElement.clientWidth || (window.visualViewport ? window.visualViewport.width : 360);
            const height = window.innerHeight || document.documentElement.clientHeight || (window.visualViewport ? window.visualViewport.height : 640);
            const aspectRatio = (width > 0 && height > 0) ? (width / height) : 0.562;
            const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
            const dpr = window.devicePixelRatio || 1;

            // Dynamic viewport units (fixes mobile browser address bar jumps & safe-areas)
            const vh = height * 0.01;
            const vw = width * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            document.documentElement.style.setProperty('--vw', `${vw}px`);
            document.documentElement.style.setProperty('--dvh', `${height}px`);
            document.documentElement.style.setProperty('--dvw', `${width}px`);
            document.documentElement.style.setProperty('--device-aspect-ratio', aspectRatio.toFixed(3));
            document.documentElement.style.setProperty('--device-screen-width', `${width}px`);
            document.documentElement.style.setProperty('--device-screen-height', `${height}px`);
            document.documentElement.style.setProperty('--device-pixel-ratio', dpr.toFixed(2));

            // Compute smart aspect-ratio responsive scale factor
            let scaleFactor = 1.0;
            if (width <= 360) {
                scaleFactor = Math.max(0.88, width / 375);
            } else if (width <= 480) {
                scaleFactor = 1.0;
            } else if (width <= 1024 && width > 480) {
                if (aspectRatio >= 0.7 && aspectRatio <= 1.4) {
                    scaleFactor = Math.min(1.0, Math.max(0.92, width / 900));
                }
            } else if (height < 600 && width > 768) {
                scaleFactor = Math.max(0.85, height / 700);
            }
            document.documentElement.style.setProperty('--app-scale', scaleFactor.toFixed(3));

            // Assign aspect-ratio & device classes to <html>
            const classTarget = document.documentElement;
            
            const aspectClasses = [
                'is-mobile',
                'is-phone',
                'is-small-phone',
                'aspect-ultrawide',           // >= 2.1 (21:9 Monitors)
                'aspect-wide',                // 1.5 - 2.1 (16:9 / 16:10 Laptops & Desktops)
                'aspect-standard',            // 1.2 - 1.5 (Standard Laptops & Monitors)
                'aspect-tablet',              // 0.8 - 1.2 (iPads & Tablets)
                'aspect-foldable',            // 0.65 - 0.95 (Foldables)
                'aspect-portrait',            // < 0.8 (Portrait screens)
                'aspect-tall-mobile',         // < 0.52 (19.5:9, 20:9, 21:9 modern phones)
                'aspect-standard-mobile',     // 0.52 - 0.65 (16:9, 18:9 phones)
                'aspect-landscape-compact',   // Short height landscape phones
                'device-touch',               // Touch screen device
                'device-pointer'              // Pointer/Mouse device
            ];
            aspectClasses.forEach(cls => classTarget.classList.remove(cls));

            if (isTouch) classTarget.classList.add('device-touch');
            else classTarget.classList.add('device-pointer');

            if (width <= 768) classTarget.classList.add('is-mobile');
            if (width <= 540) classTarget.classList.add('is-phone');
            if (width <= 360) classTarget.classList.add('is-small-phone');

            if (aspectRatio >= 2.1) {
                classTarget.classList.add('aspect-ultrawide');
            } else if (aspectRatio >= 1.5) {
                classTarget.classList.add('aspect-wide');
            } else if (aspectRatio >= 1.2) {
                classTarget.classList.add('aspect-standard');
            } else if (aspectRatio >= 0.8 && aspectRatio < 1.2) {
                classTarget.classList.add('aspect-tablet');
            } else {
                classTarget.classList.add('aspect-portrait');
            }

            // Mobile-specific aspect ratio classification
            if (width <= 600) {
                if (aspectRatio < 0.52) {
                    classTarget.classList.add('aspect-tall-mobile');
                } else {
                    classTarget.classList.add('aspect-standard-mobile');
                }
            } else if (width <= 850 && aspectRatio >= 0.65 && aspectRatio <= 0.95) {
                classTarget.classList.add('aspect-foldable');
            }

            if (height <= 500 && width > height) {
                classTarget.classList.add('aspect-landscape-compact');
            }
        },

        bindEvents() {
            let resizeTimer;
            const handleResize = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => this.adjustScreenToDevice(), 30);
            };

            window.addEventListener('resize', handleResize, { passive: true });
            window.addEventListener('orientationchange', handleResize, { passive: true });
            if (window.visualViewport) {
                window.visualViewport.addEventListener('resize', handleResize, { passive: true });
            }
            document.addEventListener('DOMContentLoaded', () => this.adjustScreenToDevice());
            
            if (document.readyState === 'interactive' || document.readyState === 'complete') {
                this.adjustScreenToDevice();
            }
        }
    };

    window.DeviceAspectAdapter = DeviceAspectAdapter;
    DeviceAspectAdapter.init();
})();
