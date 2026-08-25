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
            const width = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0, screen.width || 0);
            const height = Math.max(document.documentElement.clientHeight || 0, window.innerHeight || 0, screen.height || 0);
            const aspectRatio = width > 0 && height > 0 ? (width / height) : 1.777;
            const isTouch = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0);
            const dpr = window.devicePixelRatio || 1;

            // Dynamic viewport units (fixes mobile browser address bar jumps & safe-areas)
            const vh = height * 0.01;
            const vw = width * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            document.documentElement.style.setProperty('--vw', `${vw}px`);
            document.documentElement.style.setProperty('--device-aspect-ratio', aspectRatio.toFixed(3));
            document.documentElement.style.setProperty('--device-screen-width', `${width}px`);
            document.documentElement.style.setProperty('--device-screen-height', `${height}px`);
            document.documentElement.style.setProperty('--device-pixel-ratio', dpr.toFixed(2));

            // Compute smart aspect-ratio responsive scale factor
            let scaleFactor = 1.0;
            if (width <= 1024 && width > 480) {
                // Tablets & iPads (e.g. 4:3, 3:2 aspect ratio)
                if (aspectRatio >= 0.7 && aspectRatio <= 1.4) {
                    scaleFactor = Math.min(1.0, Math.max(0.90, width / 900));
                }
            } else if (width <= 480) {
                // Smartphones (Portrait 19.5:9, 18:9, 16:9)
                scaleFactor = Math.max(0.85, Math.min(1.0, width / 390));
            } else if (height < 650 && width > 768) {
                // Low height landscape displays (e.g. 1366x600)
                scaleFactor = Math.max(0.85, height / 700);
            }
            document.documentElement.style.setProperty('--app-scale', scaleFactor.toFixed(3));

            // Assign aspect-ratio & device classes to <html>
            const classTarget = document.documentElement;
            
            const aspectClasses = [
                'aspect-ultrawide',           // >= 2.1 (21:9 Monitors)
                'aspect-wide',                // 1.5 - 2.1 (16:9 / 16:10 Laptops & Desktops)
                'aspect-standard',            // 1.2 - 1.5 (Standard Laptops & Monitors)
                'aspect-tablet',              // 0.8 - 1.2 (iPads & Tablets / Foldables)
                'aspect-portrait',            // < 0.8 (Smartphones Portrait)
                'aspect-landscape-compact',   // Short height landscape phones
                'device-touch',               // Touch screen device
                'device-pointer'              // Pointer/Mouse device
            ];
            aspectClasses.forEach(cls => classTarget.classList.remove(cls));

            if (isTouch) classTarget.classList.add('device-touch');
            else classTarget.classList.add('device-pointer');

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

            if (height <= 600 && width > height) {
                classTarget.classList.add('aspect-landscape-compact');
            }
        },

        bindEvents() {
            let resizeTimer;
            const handleResize = () => {
                clearTimeout(resizeTimer);
                resizeTimer = setTimeout(() => this.adjustScreenToDevice(), 40);
            };

            window.addEventListener('resize', handleResize, { passive: true });
            window.addEventListener('orientationchange', handleResize, { passive: true });
            document.addEventListener('DOMContentLoaded', () => this.adjustScreenToDevice());
            
            if (document.readyState === 'interactive' || document.readyState === 'complete') {
                this.adjustScreenToDevice();
            }
        }
    };

    window.DeviceAspectAdapter = DeviceAspectAdapter;
    DeviceAspectAdapter.init();
})();
