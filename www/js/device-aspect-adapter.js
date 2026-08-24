/**
 * Device Aspect Ratio & Screen Fitting Adapter
 * Automatically detects screen resolution, aspect ratio, orientation, and device pixel ratio.
 * Dynamic CSS variables and responsive aspect ratio helper classes are set on document root.
 */
(function() {
    const DeviceAspectAdapter = {
        init() {
            this.adjustScreenToDevice();
            this.bindEvents();
        },

        adjustScreenToDevice() {
            const width = window.innerWidth || document.documentElement.clientWidth || screen.width;
            const height = window.innerHeight || document.documentElement.clientHeight || screen.height;
            const aspectRatio = width / height;

            // Set dynamic viewport units to fix mobile browser bar issues
            const vh = height * 0.01;
            const vw = width * 0.01;
            document.documentElement.style.setProperty('--vh', `${vh}px`);
            document.documentElement.style.setProperty('--vw', `${vw}px`);
            document.documentElement.style.setProperty('--device-aspect-ratio', aspectRatio.toFixed(3));
            document.documentElement.style.setProperty('--device-screen-width', `${width}px`);
            document.documentElement.style.setProperty('--device-screen-height', `${height}px`);

            // Compute optimal scaling factor for low height or high aspect ratio screens
            let scaleFactor = 1.0;
            if (height < 650 && width > 768) {
                // Low height landscape display (e.g. 1366x600 or mobile landscape)
                scaleFactor = Math.max(0.85, height / 700);
            } else if (width < 380) {
                // Small narrow mobile screens
                scaleFactor = Math.max(0.88, width / 400);
            }
            document.documentElement.style.setProperty('--app-scale', scaleFactor.toFixed(3));

            // Assign aspect-ratio & device classes to <html> & <body>
            const classTarget = document.documentElement;
            
            // Remove existing aspect classes
            const aspectClasses = [
                'aspect-ultrawide',
                'aspect-wide',
                'aspect-standard',
                'aspect-tablet',
                'aspect-portrait',
                'aspect-landscape-compact'
            ];
            aspectClasses.forEach(cls => classTarget.classList.remove(cls));

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
                resizeTimer = setTimeout(() => this.adjustScreenToDevice(), 50);
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
