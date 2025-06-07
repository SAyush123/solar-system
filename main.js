class SolarSystem {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.clock = new THREE.Clock();
        this.planets = [];
        this.sun = null;
        this.isPaused = false;
        this.isDarkMode = true;
        this.mouse = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        // Planet data with realistic relative sizes and distances
        this.planetData = [
            { name: 'Mercury', size: 0.4, distance: 8, color: 0x8C7853, speed: 4.15 },
            { name: 'Venus', size: 0.9, distance: 12, color: 0xFFC649, speed: 1.62 },
            { name: 'Earth', size: 1, distance: 16, color: 0x6B93D6, speed: 1.0 },
            { name: 'Mars', size: 0.5, distance: 20, color: 0xC1440E, speed: 0.53 },
            { name: 'Jupiter', size: 2.5, distance: 28, color: 0xD8CA9D, speed: 0.084 },
            { name: 'Saturn', size: 2.1, distance: 36, color: 0xFAD5A5, speed: 0.034 },
            { name: 'Uranus', size: 1.5, distance: 44, color: 0x4FD0E7, speed: 0.012 },
            { name: 'Neptune', size: 1.4, distance: 52, color: 0x4B70DD, speed: 0.006 }
        ];

        this.init();
        this.createControls();
        this.animate();
        this.setupSwipeGestures();
    }

    setupSwipeGestures() {
        const sidebar = document.getElementById('sidebar');
        const swipeIndicator = document.getElementById('swipeIndicator');
        let touchStartX = 0;
        let touchStartY = 0;
        let touchEndX = 0;
        let touchEndY = 0;
        let isDragging = false;

        const toggleSidebar = () => {
            if (sidebar.classList.contains('active')) {
                sidebar.classList.remove('active');
                swipeIndicator.style.opacity = '0.8';
            } else {
                sidebar.classList.add('active');
                swipeIndicator.style.opacity = '0.6';
            }
        };

        // Touch events for mobile
        const handleTouchStart = (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            isDragging = false;
        };

        const handleTouchMove = (e) => {
            if (!isDragging) {
                touchEndX = e.touches[0].clientX;
                touchEndY = e.touches[0].clientY;

                const deltaX = touchEndX - touchStartX;
                const deltaY = Math.abs(e.touches[0].clientY - touchStartY);

                // Only trigger swipe if horizontal movement is significant and vertical is minimal
                if (Math.abs(deltaX) > 10 && deltaY < 50) {
                    isDragging = true;
                    e.preventDefault();
                }
            }
        };

        const handleTouchEnd = (e) => {
            if (!isDragging) return;

            const deltaX = touchEndX - touchStartX;
            const deltaY = Math.abs(touchEndY - touchStartY);

            // Minimum swipe distance and ensure it's more horizontal than vertical
            if (Math.abs(deltaX) > 50 && deltaY < 100) {
                if (deltaX > 0 && !sidebar.classList.contains('active')) {
                    // Swipe right - open sidebar
                    sidebar.classList.add('active');
                    swipeIndicator.style.opacity = '0.6';
                } else if (deltaX < 0 && sidebar.classList.contains('active')) {
                    // Swipe left - close sidebar
                    sidebar.classList.remove('active');
                    swipeIndicator.style.opacity = '0.8';
                }
            }

            isDragging = false;
        };

        // Add touch event listeners for mobile devices
        if ('ontouchstart' in window) {
            document.addEventListener('touchstart', handleTouchStart, { passive: false });
            document.addEventListener('touchmove', handleTouchMove, { passive: false });
            document.addEventListener('touchend', handleTouchEnd, { passive: false });
        }

        // Click event for both desktop and mobile
        swipeIndicator.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSidebar();
        });

        // Desktop: Also allow clicking anywhere on left edge to toggle
        document.addEventListener('click', (e) => {
            if (e.clientX < 50 && e.clientY > 100 && e.clientY < window.innerHeight - 100) {
                toggleSidebar();
            }
        });

        // Keyboard shortcut for desktop (Ctrl + Space)
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.code === 'Space') {
                e.preventDefault();
                toggleSidebar();
            }
        });
    }

    init() {
        // Scene setup
        this.scene = new THREE.Scene();

        // Camera setup
        this.camera = new THREE.PerspectiveCamera(
            75,
            window.innerWidth / window.innerHeight,
            0.1,
            1000
        );
        this.camera.position.set(0, 30, 60);

        // Renderer setup
        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setClearColor(0x000011);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);

        this.createSun();
        this.createPlanets();
        this.createStars();
        this.setupLighting();
        this.setupControls();
        this.updateTheme();
    }

    createSun() {
        const sunGeometry = new THREE.SphereGeometry(3, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xFFD700,
            emissive: 0xFF6600,
            emissiveIntensity: 0.3
        });

        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.sun.userData = { name: 'Sun', info: 'The center of our solar system' };
        this.scene.add(this.sun);
    }

    createPlanets() {
        this.planetData.forEach((data, index) => {
            // Planet mesh
            const geometry = new THREE.SphereGeometry(data.size, 32, 32);
            const material = new THREE.MeshPhongMaterial({
                color: data.color,
                shininess: 30
            });

            const planet = new THREE.Mesh(geometry, material);
            planet.castShadow = true;
            planet.receiveShadow = true;

            // Create orbit group
            const orbitGroup = new THREE.Group();
            orbitGroup.add(planet);

            // Position planet at distance
            planet.position.x = data.distance;

            // Store planet data
            const planetObj = {
                mesh: planet,
                orbitGroup: orbitGroup,
                data: data,
                currentSpeed: data.speed,
                angle: Math.random() * Math.PI * 2
            };

            planet.userData = {
                name: data.name,
                info: `Distance: ${data.distance} AU, Size: ${data.size} Earth radii`
            };

            this.planets.push(planetObj);
            this.scene.add(orbitGroup);

            // Create orbit path
            this.createOrbitPath(data.distance);
        });
    }

    createOrbitPath(radius) {
        const curve = new THREE.EllipseCurve(
            0, 0,
            radius, radius,
            0, 2 * Math.PI,
            false,
            0
        );

        const points = curve.getPoints(100);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x444444,
            transparent: true,
            opacity: 0.3
        });

        const orbitLine = new THREE.Line(geometry, material);
        orbitLine.rotation.x = Math.PI / 2;
        this.scene.add(orbitLine);
    }

    createStars() {
        const starGeometry = new THREE.BufferGeometry();
        const starCount = 2000;
        const positions = new Float32Array(starCount * 3);

        for (let i = 0; i < starCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 400;
            positions[i + 1] = (Math.random() - 0.5) * 400;
            positions[i + 2] = (Math.random() - 0.5) * 400;
        }

        starGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const starMaterial = new THREE.PointsMaterial({
            color: 0xFFFFFF,
            size: 1,
            transparent: true,
            opacity: 0.8
        });

        const stars = new THREE.Points(starGeometry, starMaterial);
        this.scene.add(stars);
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.2);
        this.scene.add(ambientLight);

        // Point light from sun
        const sunLight = new THREE.PointLight(0xFFFFFF, 2, 300);
        sunLight.position.set(0, 0, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
    }

    setupControls() {
        // Simple mouse controls for camera rotation
        let mouseDown = false;
        let mouseX = 0;
        let mouseY = 0;

        this.renderer.domElement.addEventListener('mousedown', (e) => {
            mouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        this.renderer.domElement.addEventListener('mouseup', () => {
            mouseDown = false;
        });

        this.renderer.domElement.addEventListener('mousemove', (e) => {
            if (mouseDown) {
                const deltaX = e.clientX - mouseX;
                const deltaY = e.clientY - mouseY;

                // Rotate camera around origin
                const spherical = new THREE.Spherical();
                spherical.setFromVector3(this.camera.position);
                spherical.theta -= deltaX * 0.01;
                spherical.phi += deltaY * 0.01;
                spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi));

                this.camera.position.setFromSpherical(spherical);
                this.camera.lookAt(0, 0, 0);

                mouseX = e.clientX;
                mouseY = e.clientY;
            }

            // Update mouse position for raycasting
            this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
            this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
        });

        // Zoom with mouse wheel
        this.renderer.domElement.addEventListener('wheel', (e) => {
            const zoom = e.deltaY > 0 ? 1.1 : 0.9;
            this.camera.position.multiplyScalar(zoom);
            this.camera.position.clampLength(10, 200);
        });
    }

    createControls() {
        const controlsContainer = document.getElementById('planet-controls');

        this.planets.forEach((planet, index) => {
            const controlDiv = document.createElement('div');
            controlDiv.className = 'planet-control';

            const label = document.createElement('label');
            label.textContent = planet.data.name;
            label.style.color = `#${planet.data.color.toString(16).padStart(6, '0')}`;

            const slider = document.createElement('input');
            slider.type = 'range';
            slider.min = '0';
            slider.max = '5';
            slider.step = '0.1';
            slider.value = planet.data.speed;
            slider.id = `speed-${index}`;

            const valueDisplay = document.createElement('div');
            valueDisplay.className = 'speed-value';
            valueDisplay.textContent = `Speed: ${planet.data.speed.toFixed(1)}x`;

            slider.addEventListener('input', (e) => {
                const newSpeed = parseFloat(e.target.value);
                planet.currentSpeed = newSpeed;
                valueDisplay.textContent = `Speed: ${newSpeed.toFixed(1)}x`;
            });

            controlDiv.appendChild(label);
            controlDiv.appendChild(slider);
            controlDiv.appendChild(valueDisplay);
            controlsContainer.appendChild(controlDiv);
        });
    }

    setupEventListeners() {
        // Pause/Resume button
        document.getElementById('pauseBtn').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            const btn = document.getElementById('pauseBtn');
            btn.textContent = this.isPaused ? '▶️ Resume' : '⏸️ Pause';
            btn.classList.toggle('active', this.isPaused);
        });

        // Theme toggle
        document.getElementById('themeBtn').addEventListener('click', () => {
            this.isDarkMode = !this.isDarkMode;
            this.updateTheme();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Tooltip on hover
        this.renderer.domElement.addEventListener('mousemove', (e) => {
            this.handleMouseMove(e);
        });
    }

    handleMouseMove(event) {
        this.raycaster.setFromCamera(this.mouse, this.camera);

        const allObjects = [this.sun, ...this.planets.map(p => p.mesh)];
        const intersects = this.raycaster.intersectObjects(allObjects);

        const tooltip = document.getElementById('tooltip');

        if (intersects.length > 0) {
            const object = intersects[0].object;
            tooltip.style.display = 'block';
            tooltip.style.left = event.clientX + 10 + 'px';
            tooltip.style.top = event.clientY - 30 + 'px';
            tooltip.innerHTML = `<strong>${object.userData.name}</strong><br>${object.userData.info}`;
        } else {
            tooltip.style.display = 'none';
        }
    }

    updateTheme() {
        const btn = document.getElementById('themeBtn');
        if (this.isDarkMode) {
            this.renderer.setClearColor(0x000011);
            btn.textContent = 'Light Mode';
        } else {
            this.renderer.setClearColor(0x87CEEB);
            btn.textContent = 'Dark Mode';
        }
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.isPaused) {
            const deltaTime = this.clock.getDelta();

            // Animate sun rotation
            this.sun.rotation.y += deltaTime * 0.5;

            // Animate planets
            this.planets.forEach(planet => {
                planet.angle += deltaTime * planet.currentSpeed * 0.5;
                planet.orbitGroup.rotation.y = planet.angle;

                // Rotate planet on its axis
                planet.mesh.rotation.y += deltaTime * 2;
            });
        }

        this.renderer.render(this.scene, this.camera);
    }
}

// Initialize the solar system when the page loads
window.addEventListener('load', () => {
    new SolarSystem();
});