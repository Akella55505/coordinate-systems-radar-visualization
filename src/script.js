const SPEED_OF_LIGHT = 300000;
let targetsData = [];
const MAX_AGE_MS = 30000;

const layout = {
    title: 'Радар',
    polar: {
        angularaxis: { 
            direction: "clockwise",
            rotation: 90
        },
        radialaxis: { 
            range: [0, 150],
            title: "Відстань"
        }
    },
    showlegend: false,
    margin: { t: 50, b: 50, l: 50, r: 50 }
};

Plotly.newPlot('radar-plot', [{
    type: 'scatterpolar',
    mode: 'markers',
    r: [],
    theta: [],
    marker: { color: [], opacity: [], size: 8 }
}], layout);

const socket = new WebSocket('ws://localhost:21700');

socket.onopen = () => {
    console.log('Підключено до WebSocket сервера');
};

socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    const now = Date.now();

    if (data.echoResponses && data.echoResponses.length > 0) {
        data.echoResponses.forEach(echo => {
            const distance = (SPEED_OF_LIGHT * echo.time) / 2;
            
            targetsData.push({
                angle: data.scanAngle,
                distance: distance,
                power: echo.power,
                timestamp: now
            });
        });
    }

    targetsData = targetsData.filter(t => (now - t.timestamp) < MAX_AGE_MS);
};

socket.onclose = () => {
   console.log('З\'єднання закрито');
};

socket.onerror = (error) => {
    console.error('Помилка WebSocket:', error);
};

function renderPlot() {
    const now = Date.now();
            
    const r = [];
    const theta = [];
    const opacity = [];
    const color = [];

    targetsData.forEach(t => {
        r.push(t.distance);
        theta.push(t.angle);
                
        const age = now - t.timestamp;
        const pointOpacity = Math.max(0, 1 - (age / MAX_AGE_MS));
        opacity.push(pointOpacity);

        const logPower = Math.log10(t.power + 1);
        color.push(logPower);
    });

    Plotly.react('radar-plot', [{
        type: 'scatterpolar',
        mode: 'markers',
        r: r,
        theta: theta,
        marker: {
            opacity: opacity,
            size: 8,
        }
    }], layout);

    requestAnimationFrame(renderPlot);
}

requestAnimationFrame(renderPlot);

function updateRadarConfig() {
    const config = {};
            
    const meas = document.getElementById('measurementsPerRotation').value;
    const rot = document.getElementById('rotationSpeed').value;
    const targets = document.getElementById('numberOfTargets').value;
    const speed = document.getElementById('targetSpeed').value;

    if (meas) config.measurementsPerRotation = parseInt(meas);
    if (rot) config.rotationSpeed = parseFloat(rot);
    if (targets) config.numberOfTargets = parseInt(targets);
    if (speed) config.targetSpeed = parseFloat(speed);

    fetch('http://localhost:21700/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
    })
    .then(response => {
        if(response.ok) {
            document.getElementById('status-msg').innerText = "Параметри успішно оновлено";
            setTimeout(() => document.getElementById('status-msg').innerText = "", 3000);
        } else {
            document.getElementById('status-msg').innerText = "Помилка оновлення";
        }
        return response.json();
    })
    .then(result => console.log('Updated config:', result))
    .catch(error => console.error('Помилка API:', error));
}