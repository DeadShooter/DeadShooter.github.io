
window.requestAnimFrame = function () {
  return window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  function (callback) {
    window.setTimeout(callback, 1000 / 60);
  };
}();

// now we will setup our basic variables for the demo
var canvas = document.getElementById('canvas'),
ctx = canvas.getContext('2d'),
// full screen dimensions
cw = window.innerWidth,
ch = window.innerHeight,
// firework collection
fireworks = [],
// particle collection
particles = [],
// starting hue
hue = 120,
// when launching fireworks with a click, too many get launched at once without a limiter, one launch per 5 loop ticks
limiterTotal = 5,
limiterTick = 0,
// this will time the auto launches of fireworks, one launch per 80 loop ticks
timerTotal = 80,
timerTick = 0,
mousedown = false,
// mouse x coordinate,
mx,
// mouse y coordinate
my;

// set canvas dimensions
canvas.width = cw;
canvas.height = ch;

// now we are going to setup our function placeholders for the entire demo

// get a random number within a range
function random(min, max) {
  return Math.random() * (max - min) + min;
}

// calculate the distance between two points
function calculateDistance(p1x, p1y, p2x, p2y) {
  var xDistance = p1x - p2x,
  yDistance = p1y - p2y;
  return Math.sqrt(Math.pow(xDistance, 2) + Math.pow(yDistance, 2));
}

// create firework
function Firework(sx, sy, tx, ty) {
  // actual coordinates
  this.x = sx;
  this.y = sy;
  // starting coordinates
  this.sx = sx;
  this.sy = sy;
  // target coordinates
  this.tx = tx;
  this.ty = ty;
  // distance from starting point to target
  this.distanceToTarget = calculateDistance(sx, sy, tx, ty);
  this.distanceTraveled = 0;
  // track the past coordinates of each firework to create a trail effect, increase the coordinate count to create more prominent trails
  this.coordinates = [];
  this.coordinateCount = 3;
  // populate initial coordinate collection with the current coordinates
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  this.angle = Math.atan2(ty - sy, tx - sx);
  this.speed = 2;
  this.acceleration = 1.05;
  this.brightness = random(50, 70);
  // circle target indicator radius
  this.targetRadius = 1;
}

// update firework
Firework.prototype.update = function (index) {
  // remove last item in coordinates array
  this.coordinates.pop();
  // add current coordinates to the start of the array
  this.coordinates.unshift([this.x, this.y]);

  // cycle the circle target indicator radius
  if (this.targetRadius < 8) {
    this.targetRadius += 0.3;
  } else {
    this.targetRadius = 1;
  }

  // speed up the firework
  this.speed *= this.acceleration;

  // get the current velocities based on angle and speed
  var vx = Math.cos(this.angle) * this.speed,
  vy = Math.sin(this.angle) * this.speed;
  // how far will the firework have traveled with velocities applied?
  this.distanceTraveled = calculateDistance(this.sx, this.sy, this.x + vx, this.y + vy);

  // if the distance traveled, including velocities, is greater than the initial distance to the target, then the target has been reached
  if (this.distanceTraveled >= this.distanceToTarget) {
    createParticles(this.tx, this.ty);
    // remove the firework, use the index passed into the update function to determine which to remove
    fireworks.splice(index, 1);
  } else {
    // target not reached, keep traveling
    this.x += vx;
    this.y += vy;
  }
};

// draw firework
Firework.prototype.draw = function () {
  ctx.beginPath();
  // move to the last tracked coordinate in the set, then draw a line to the current x and y
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsl(' + hue + ', 100%, ' + this.brightness + '%)';
  ctx.stroke();

  ctx.beginPath();
  // draw the target for this firework with a pulsing circle
  ctx.arc(this.tx, this.ty, this.targetRadius, 0, Math.PI * 2);
  ctx.stroke();
};

// create particle
function Particle(x, y) {
  this.x = x;
  this.y = y;
  // track the past coordinates of each particle to create a trail effect, increase the coordinate count to create more prominent trails
  this.coordinates = [];
  this.coordinateCount = 5;
  while (this.coordinateCount--) {
    this.coordinates.push([this.x, this.y]);
  }
  // set a random angle in all possible directions, in radians
  this.angle = random(0, Math.PI * 2);
  this.speed = random(1, 10);
  // friction will slow the particle down
  this.friction = 0.95;
  // gravity will be applied and pull the particle down
  this.gravity = 1;
  // set the hue to a random number +-20 of the overall hue variable
  this.hue = random(hue - 20, hue + 20);
  this.brightness = random(50, 80);
  this.alpha = 1;
  // set how fast the particle fades out
  this.decay = random(0.015, 0.03);
}

// update particle
Particle.prototype.update = function (index) {
  // remove last item in coordinates array
  this.coordinates.pop();
  // add current coordinates to the start of the array
  this.coordinates.unshift([this.x, this.y]);
  // slow down the particle
  this.speed *= this.friction;
  // apply velocity
  this.x += Math.cos(this.angle) * this.speed;
  this.y += Math.sin(this.angle) * this.speed + this.gravity;
  // fade out the particle
  this.alpha -= this.decay;

  // remove the particle once the alpha is low enough, based on the passed in index
  if (this.alpha <= this.decay) {
    particles.splice(index, 1);
  }
};

// draw particle
Particle.prototype.draw = function () {
  ctx.beginPath();
  // move to the last tracked coordinates in the set, then draw a line to the current x and y
  ctx.moveTo(this.coordinates[this.coordinates.length - 1][0], this.coordinates[this.coordinates.length - 1][1]);
  ctx.lineTo(this.x, this.y);
  ctx.strokeStyle = 'hsla(' + this.hue + ', 100%, ' + this.brightness + '%, ' + this.alpha + ')';
  ctx.stroke();
};

// create particle group/explosion
function createParticles(x, y) {
  // increase the particle count for a bigger explosion, beware of the canvas performance hit with the increased particles though
  var particleCount = 30;
  while (particleCount--) {
    particles.push(new Particle(x, y));
  }
}

// main demo loop
function loop() {
  // this function will run endlessly with requestAnimationFrame
  requestAnimFrame(loop);

  // increase the hue to get different colored fireworks over time
  hue += 0.5;

  // normally, clearRect() would be used to clear the canvas
  // we want to create a trailing effect though
  // setting the composite operation to destination-out will allow us to clear the canvas at a specific opacity, rather than wiping it entirely
  ctx.globalCompositeOperation = 'destination-out';
  // decrease the alpha property to create more prominent trails
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, cw, ch);
  // change the composite operation back to our main mode
  // lighter creates bright highlight points as the fireworks and particles overlap each other
  ctx.globalCompositeOperation = 'lighter';

  // loop over each firework, draw it, update it
  var i = fireworks.length;
  while (i--) {
    fireworks[i].draw();
    fireworks[i].update(i);
  }

  // loop over each particle, draw it, update it
  var i = particles.length;
  while (i--) {
    particles[i].draw();
    particles[i].update(i);
  }

  // launch fireworks automatically to random coordinates, when the mouse isn't down
  if (timerTick >= timerTotal) {
    if (!mousedown) {
      // start the firework at the bottom middle of the screen, then set the random target coordinates, the random y coordinates will be set within the range of the top half of the screen
      fireworks.push(new Firework(cw / 2, ch, random(0, cw), random(0, ch / 2)));
      timerTick = 0;
    }
  } else {
    timerTick++;
  }

  // limit the rate at which fireworks get launched when mouse is down
  if (limiterTick >= limiterTotal) {
    if (mousedown) {
      // start the firework at the bottom middle of the screen, then set the current mouse coordinates as the target
      fireworks.push(new Firework(cw / 2, ch, mx, my));
      limiterTick = 0;
    }
  } else {
    limiterTick++;
  }
}

window.onload = function () {
  var merrywrap = document.getElementById("merrywrap");
  var box = merrywrap.getElementsByClassName("giftbox")[0];
  var step = 1;
  var stepMinutes = [2000, 2000, 1000, 1000];
  function init() {
    box.addEventListener("click", openBox, false);
  }
  function stepClass(step) {
    merrywrap.className = 'merrywrap';
    merrywrap.className = 'merrywrap step-' + step;
  }
  function openBox() {
    if (step === 1) {
      box.removeEventListener("click", openBox, false);
    }
    stepClass(step);
    if (step === 3) {
    }
    if (step === 4) {
      reveal();
      return;
    }
    setTimeout(openBox, stepMinutes[step - 1]);
    step++;
  }

  init();

};

function reveal() {
  document.querySelector('.merrywrap').style.backgroundColor = 'transparent';

  loop();

  var w, h;
  if (window.innerWidth >= 1000) {
    w = 295;h = 185;
  } else
  {
    w = 255;h = 155;
  }

  var ifrm = document.createElement("iframe");
  ifrm.setAttribute("src", "https://www.youtube.com/embed/Z6jpBot6fHc?start=12&autoplay=1");
  //ifrm.style.width = `${w}px`;
  //ifrm.style.height = `${h}px`;
  ifrm.style.border = 'none';
  document.querySelector('#video').appendChild(ifrm);

  const image=new Image()

image.src="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCAHVAdUDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD40ooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKVetACDGRnp3r1LwF8C/iF4x06LVLPSk07TZuYbvUpDCkq+qjBdl/wBoDFdJ+x18ObPx18SnvdXtxcaNocK3c8TnKTSk4hjb9fyr7h1zgEAYGAOOOgwKAPiGb9mXxHbr/pHiXRlk9IxIw/MgVz+pfAfxPZsduq6NMo/6aSof1jr7D17J3VwWu/xUDsfKeo/DXxVZOR9jgnA7xzr/AOzYrGk8La9EcS6ey8/89E/xr6K13+KuD1wn5qAseP3lrJZziGdNrbQSM10Xwz8KHxn4st/D6XQtJLiOVhK0ZcKUjLYOCODisvxTgaocf88xXdfsv/8AJYdK/wCuVz/6JagRy3jrwTr/AIM1T7Frdi0QY/urhMtDMPVH7/TrVfwd4ZvfFWtDSNLe0W8dMxpPL5YcjqoJ6mvuPXtK03WdOl03VbKC8s5hhopU3j6j0I7EV86/ET4I6jolyNb8DzXN1bxN5gtQ2bqDHOYyPv0Dsc2PgT47/wCeelf+BlIPgP447yaSB/19H/4mvTfhZ8YbLWvL0TxUVsdXQ7FuH4iuXHHPTy3r1F/UfMCMgjnI9c9MUCPmM/Ajxh3vdGH1uZP/AI3TT8CvFw/5iOh/9/5f/jdfSs1VpSeeaB2Pm+T4IeLUH/H5ozfSd/6pVOb4PeMYukenSf7t0K+kpSc9TVefpQFj5kufhn41tuZNELL6x3MT/kAxNY1/4Y8QWOfteiajAo6s8DFQPqBX1S/HSq8hYdCeORQFj5IZNrkEEEepx/OkIAr6i1fStL1FCL/TbS495IVLfn1ri9e+GHh+6DtYNNpz9ih8yH8mOaAseH0V13iHwBruj5kSIX1uOfMt+WA9ShwwrlSmN2Qcj9PYigRHRRRQAUUUUAFFFFABRRRQ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ZqrSV5h4s/aI+GGihkt9TuNbnBxs0+Alf+/j7UrxLx5+034r1ZZbfwzY23h63JOJT+/uMfVhtFAH0r448YeGvBunG88Sarb2aEEwxlt00v8AuoOW+oFfK3xg+O+s+LYrjSfDyy6JorZDfP8A6Tc/77Lwo/2BXj2r6rqWrahJqGp31zeXkpy808hd2+pNVCzGgBUJyBzgnkDvW/4F8L6l4z8V6d4a0SESX1/MsKDsvdnP+yAMmufThx9a+4f2IfhjDoPhN/iDq8af2prEW2xjbGYLT+99ZP8A0CgD1fw54X0rwZ4S07wvow/0Swi2K5XDTt1eVv8AaY8msnV+rV2Wqh2LEc5PufauQ1iGb5v3b/8AfBoA4vWPvNXHauTzya7PWY5BuJVvriuL1cgZyR+YoHc5DWOAe2euK4PxVp8Oo2zQzAeZzskPUHtXcazLEM/vE/OuM1eeAbszx47/ADigLnlNxE0E7wydUYio61fE4iOpeZG4cMgJINZVAgooooAKKKKAClHLAE9+tJRQB6X8KdaEiyaLO2GBM1vk/wDfSfh1FdtJXg2m3c9lfwXluds0MgZfqDmvbdKv4tU02C+gIKyoCR6N0IoHcfP1qtJ0/GrUoOelVpFbHRuvv/hQFyo9VpPvVbkU/wBw1WkU56UDKcv3TVZ6tTqaqStGvWQD8RQBVk6E1i+IrJXie4jULKn3sfxCtae6tU63MP4vWdqGoWRtZYvPViyMABk5JFArnLUUvrSUCCiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKXJpKKACnIzRuGVirDoRwRTaKAJpLq6lXa9zK49C5NQjiiigBckUZNJRQAUUUUAKDgg0F2IwTmkooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACp47u6jQxx3MqITnarkD8hUFFAEpuLg9Z5f8Avs03zZf+ej/99GmUUALvf++fzpMn1NFFA7hRRRQMKKKKCQooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigAooooAKKKKACiiigD//2Q=="

image.addEventListener('load', function(){
    const canvas = document.getElementById('canvas1');
    const ctx = canvas.getContext('2d');
    canvas.width = 459;
    canvas.height = 459;


    let particlesArray = [];
    const numberOfParticles = 3000;
    const detail = 5;

    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let grid = [];
    for (let y = 0; y < canvas.height; y += detail){
        let row = [];
        for (let x = 0; x < canvas.width; x += detail){
            const red = pixels.data[(y * 4 * pixels.width) + (x * 4)]
            const green = pixels.data[(y * 4 * pixels.width) + (x * 4 + 1)]
            const blue = pixels.data[(y * 4 * pixels.width) + (x * 4 + 2)]
            const color = 'rgb(' + red +',' + green + ',' + blue + ')';
            const brightness = calculateBrightness(red, green, blue)/100;
            const cell = [
                cellColor = color,
                cellBrightness = brightness,
            ];
            row.push(cell);
        }  
        grid.push(row); 
    }
    console.log(grid);
    class Particle {
        constructor(){
            this.x = Math.random() * canvas.width;
            this.y = canvas.height;
            //this.prevX = this.x;
            this.speed = 0.7;
            this.velocity = Math.random() * 0.4;
            this.size = Math.random() * 2 + 0.5;
            this.position1 = Math.floor(this.y / detail);
            this.position2 = Math.floor(this.x / detail);
            this.angle = 0;
        }
        update () {
            this.position1 = Math.floor(this.y / detail);
            this.position2 = Math.floor(this.x / detail);
            if (grid[this.position1]){
                if (grid[this.position1][this.position2]){
                    this.speed = grid[this.position1][this.position2][1];
                }
            }
            this.angle += this.speed/10;
            let movement = (6 - this.speed) + this.velocity;
            this.y -= movement + Math.cos(this.angle) * 2;
            this.x += Math.cos(this.angle) * 2;
            if (this.y <= 0) {
                this.y = canvas.height;
                this.x = Math.random() * canvas.width;
            }
            //console.log(this.x += movement)
        }
        draw(){
            ctx.beginPath();
            ctx.fillStyle = 'black';
            if (this.y > canvas.height - this.size * 6) ctx.globalAlpha = 0;
            if (grid[this.position1]){
                if (grid[this.position1][this.position2]){
                    ctx.fillStyle = grid[this.position1][this.position2][0];
                }

            } else {
                ctx.fillStyle = 'white';
            }
            ctx.arc(this.x, this.y, this.size, 0, 2 * Math.PI);
            ctx.fill();

        }
    }

    function init(){
        for (let i = 0; i < numberOfParticles; i++){
            particlesArray.push(new Particle());
        }
    }
    init();

    function animate () {
        ctx.globalAlpha = 0.05;
        ctx.fillStyle = 'rgb(0, 0, 0)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.globalAlpha = 0.2;
        for (let i = 0; i < particlesArray.length; i++) {
            particlesArray[i].update();
            ctx.globalAlpha = particlesArray[i].speed * 0.3;
            particlesArray[i].draw();
        }
        requestAnimationFrame( animate );
    }
    animate();

    function calculateBrightness(red, green, blue){
        return Math.sqrt(
            (red * red) * 0.299 +
            (green * green) * 0.587 +
            (blue * blue) * 0.114
        );
    }

});


}



