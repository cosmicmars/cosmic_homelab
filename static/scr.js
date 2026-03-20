(function() {
        const canvas = document.getElementById('starsCanvas');
        const ctx = canvas.getContext('2d');
        let width, height;
        let stars = [];
        const STAR_COUNT = 200; // количество звезд

        function initStars() {
            stars = [];
            for (let i = 0; i < STAR_COUNT; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    radius: Math.random() * 2 + 1, // размер от 1 до 3
                    speed: Math.random() * 0.5 + 0.2, // скорость движения вверх
                    brightness: Math.random() * 0.7 + 0.3 // яркость 0.3-1.0
                });
            }
        }

        function resizeCanvas() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = width;
            canvas.height = height;
            initStars(); // пересоздаем звезды при изменении размера
        }

        function drawStars() {
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = 'white';
            for (let star of stars) {
                ctx.beginPath();
                ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness})`;
                ctx.fill();
            }
        }

        function updateStars() {
            for (let star of stars) {
                star.y -= star.speed; // двигаем вверх
                // если звезда ушла за верхнюю границу, возвращаем вниз
                if (star.y + star.radius < 0) {
                    star.y = height + star.radius;
                    star.x = Math.random() * width;
                }
            }
        }

        function animate() {
            updateStars();
            drawStars();
            requestAnimationFrame(animate);
        }

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();
        animate();
    })();