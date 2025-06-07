class SolarSystem {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.planets = [];
        this.sun = null;
        this.clock = new THREE.Clock();
        this.isPaused = false;
        this.isDarkTheme = true;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.controls = null;

        // Planet data with enhanced visibility - larger sizes for better viewing
        this.planetData = [
            { name: 'Mercury', color: 0x8c7853, size: 1.2, distance: 15, speed: 4.74 },
            { name: 'Venus', color: 0xffc649, size: 1.8, distance: 20, speed: 3.50 },
            { name: 'Earth', color: 0x6b93d6, size: 2.0, distance: 25, speed: 2.98 },
            { name: 'Mars', color: 0xc1440e, size: 1.5, distance: 30, speed: 2.41 },
            { name: 'Jupiter', color: 0xd8ca9d, size: 4.5, distance: 40, speed: 1.31 },
            { name: 'Saturn', color: 0xfad5a5, size: 4.0, distance: 50, speed: 0.97 },
            { name: 'Uranus', color: 0x4fd0e3, size: 3.2, distance: 60, speed: 0.68 },
            { name: 'Neptune', color: 0x4b70dd, size: 3.0, distance: 70, speed: 0.54 }
        ];

        this.init();
    }

    init() {
        this.createScene();
        this.createCamera();
        this.createRenderer();
        this.createLights();
        this.createStars();
        this.createSun();
        this.createPlanets();
        this.createControls();
        this.setupEventListeners();
        this.createUI();
        this.animate();
        this.hideLoading();
    }

    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x000011);
    }

    createCamera() {
        const aspect = window.innerWidth / window.innerHeight;
        this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
        this.camera.position.set(0, 50, 100);
        this.camera.lookAt(0, 0, 0);
    }

    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({
            antialias: true,
            powerPreference: "high-performance"
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        document.getElementById('canvas-container').appendChild(this.renderer.domElement);
    }

    createLights() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
        this.scene.add(ambientLight);

        // Sun light
        const sunLight = new THREE.PointLight(0xffffff, 2, 300);
        sunLight.position.set(0, 0, 0);
        sunLight.castShadow = true;
        sunLight.shadow.mapSize.width = 2048;
        sunLight.shadow.mapSize.height = 2048;
        this.scene.add(sunLight);
    }

    createStars() {
        const starsGeometry = new THREE.BufferGeometry();
        const starsMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,  // Much smaller stars
            transparent: true,
            opacity: 0.6,  // Less opacity so they don't overpower planets
            sizeAttenuation: true  // Stars get smaller with distance
        });

        const starsVertices = [];
        for (let i = 0; i < 2000; i++) {  // More stars but smaller
            const x = (Math.random() - 0.5) * 600;
            const y = (Math.random() - 0.5) * 600;
            const z = (Math.random() - 0.5) * 600;
            starsVertices.push(x, y, z);
        }

        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, starsMaterial);
        this.scene.add(stars);
    }

    createSun() {
        const sunGeometry = new THREE.SphereGeometry(5, 32, 32);
        const sunMaterial = new THREE.MeshBasicMaterial({
            color: 0xffff00,
            emissive: 0xffaa00,
            emissiveIntensity: 0.3
        });

        this.sun = new THREE.Mesh(sunGeometry, sunMaterial);
        this.scene.add(this.sun);
    }

    createPlanets() {
        this.planets = [];

        this.planetData.forEach((data, index) => {
            // Create planet with enhanced materials for better visibility
            const geometry = new THREE.SphereGeometry(data.size, 32, 32);  // Higher quality spheres
            const material = new THREE.MeshPhongMaterial({
                color: data.color,
                shininess: 30,
                specular: 0x222222,
                emissive: new THREE.Color(data.color).multiplyScalar(0.1)  // Slight glow
            });
            const planet = new THREE.Mesh(geometry, material);
            planet.castShadow = true;
            planet.receiveShadow = true;

            // Create orbit group
            const orbitGroup = new THREE.Group();
            planet.position.x = data.distance;
            orbitGroup.add(planet);
            this.scene.add(orbitGroup);

            // Create more visible orbit lines
            const orbitGeometry = new THREE.RingGeometry(data.distance - 0.2, data.distance + 0.2, 64);
            const orbitMaterial = new THREE.MeshBasicMaterial({
                color: 0x666666,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.4
            });
            const orbitLine = new THREE.Mesh(orbitGeometry, orbitMaterial);
            orbitLine.rotation.x = Math.PI / 2;
            this.scene.add(orbitLine);

            // Store planet data
            this.planets.push({
                mesh: planet,
                orbitGroup: orbitGroup,
                data: data,
                angle: Math.random() * Math.PI * 2,
                currentSpeed: data.speed
            });
        });
    }

    createControls() {
        // Simple orbit controls for mobile compatibility
        let isMouseDown = false;
        let mouseX = 0, mouseY = 0;
        let targetRotationX = 0, targetRotationY = 0;
        let rotationX = 0, rotationY = 0;

        const canvas = this.renderer.domElement;

        // Mouse events
        canvas.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        canvas.addEventListener('mousemove', (e) => {
            if (!isMouseDown) return;

            const deltaX = e.clientX - mouseX;
            const deltaY = e.clientY - mouseY;

            targetRotationY += deltaX * 0.01;
            targetRotationX += deltaY * 0.01;

            mouseX = e.clientX;
            mouseY = e.clientY;
        });

        canvas.addEventListener('mouseup', () => {
            isMouseDown = false;
        });

        // Touch events for mobile
        let touchStartX = 0, touchStartY = 0;

        canvas.addEventListener('touchstart', (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
            isMouseDown = true;
        });

        canvas.addEventListener('touchmove', (e) => {
            e.preventDefault();
            if (!isMouseDown) return;

            const touch = e.touches[0];
            const deltaX = touch.clientX - touchStartX;
            const deltaY = touch.clientY - touchStartY;

            targetRotationY += deltaX * 0.01;
            targetRotationX += deltaY * 0.01;

            touchStartX = touch.clientX;
            touchStartY = touch.clientY;
        });

        canvas.addEventListener('touchend', (e) => {
            e.preventDefault();
            isMouseDown = false;
        });

        // Zoom with mouse wheel and pinch
        canvas.addEventListener('wheel', (e) => {
            e.preventDefault();
            const zoomSpeed = 0.05;
            this.camera.position.multiplyScalar(1 + e.deltaY * zoomSpeed * 0.01);
        });

        // Update camera rotation
        const updateCamera = () => {
            rotationX += (targetRotationX - rotationX) * 0.05;
            rotationY += (targetRotationY - rotationY) * 0.05;

            const radius = this.camera.position.length();
            this.camera.position.x = radius * Math.sin(rotationY) * Math.cos(rotationX);
            this.camera.position.y = radius * Math.sin(rotationX);
            this.camera.position.z = radius * Math.cos(rotationY) * Math.cos(rotationX);
            this.camera.lookAt(0, 0, 0);

            requestAnimationFrame(updateCamera);
        };
        updateCamera();
    }

    createUI() {
        const controlsContainer = document.getElementById('planet-controls');

        this.planetData.forEach((data, index) => {
            const controlDiv = document.createElement('div');
            controlDiv.className = `planet-control ${data.name.toLowerCase()}`;

            controlDiv.innerHTML = `
                        <label>
                            ${data.name}
                            <span class="speed-value">${data.speed.toFixed(2)}x</span>
                        </label>
                        <input type="range" 
                               id="speed-${index}" 
                               min="0" 
                               max="10" 
                               step="0.1" 
                               value="${data.speed}">
                    `;

            controlsContainer.appendChild(controlDiv);

            const slider = controlDiv.querySelector('input');
            const speedValue = controlDiv.querySelector('.speed-value');

            slider.addEventListener('input', (e) => {
                const speed = parseFloat(e.target.value);
                this.planets[index].currentSpeed = speed;
                speedValue.textContent = `${speed.toFixed(2)}x`;
            });
        });

        // Mobile panel toggle
        if (window.innerWidth <= 768) {
            const panel = document.getElementById('control-panel');
            const header = panel.querySelector('h2');

            header.addEventListener('click', () => {
                panel.classList.toggle('expanded');
            });
        }
    }

    setupEventListeners() {
        // Pause/Resume button
        document.getElementById('pause-resume').addEventListener('click', () => {
            this.isPaused = !this.isPaused;
            document.getElementById('pause-resume').textContent = this.isPaused ? 'Resume' : 'Pause';
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.onWindowResize();
        });

        // Planet click detection
        this.renderer.domElement.addEventListener('click', (event) => {
            this.onPlanetClick(event);
        });
    }

    toggleTheme() {
        this.isDarkTheme = !this.isDarkTheme;

        if (this.isDarkTheme) {
            this.scene.background = new THREE.Color(0x000011);
            document.getElementById('theme-toggle').textContent = 'Dark Theme';
        } else {
            this.scene.background = new THREE.Color(0x87CEEB);
            document.getElementById('theme-toggle').textContent = 'Light Theme';
        }
    }

    onPlanetClick(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

        this.raycaster.setFromCamera(this.mouse, this.camera);

        const planetMeshes = this.planets.map(p => p.mesh);
        const intersects = this.raycaster.intersectObjects(planetMeshes);

        if (intersects.length > 0) {
            const clickedPlanet = intersects[0].object;
            const planetIndex = planetMeshes.indexOf(clickedPlanet);

            if (planetIndex !== -1) {
                const planetInfo = this.planetData[planetIndex];
                alert(`🪐 ${planetInfo.name}\nSize: ${planetInfo.size} Earth units\nDistance: ${planetInfo.distance} AU\nSpeed: ${planetInfo.speed}x`);
            }
        }
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());

        if (!this.isPaused) {
            const delta = this.clock.getDelta();

            // Rotate sun
            if (this.sun) {
                this.sun.rotation.y += delta * 0.5;
            }

            // Update planet positions
            this.planets.forEach((planet) => {
                planet.angle += delta * planet.currentSpeed * 0.1;
                planet.orbitGroup.rotation.y = planet.angle;

                // Rotate planet on its axis
                planet.mesh.rotation.y += delta * 2;
            });
        }

        this.renderer.render(this.scene, this.camera);
    }

    hideLoading() {
        setTimeout(() => {
            document.getElementById('loading').style.display = 'none';
        }, 1000);
    }
}

// Initialize the solar system when page loads
window.addEventListener('load', () => {
    new SolarSystem();
});

// Prevent zoom on double tap for mobile
let lastTouchEnd = 0;
document.addEventListener('touchend', function (event) {
    const now = (new Date()).getTime();
    if (now - lastTouchEnd <= 300) {
        event.preventDefault();
    }
    lastTouchEnd = now;
}, false);
