class CyberpunkShape {
    constructor(ctx, width, height, color) {
        this.ctx = ctx;
        this.xPos = 0;
        this.yPos = 0;
        this.color = color;
        this.border = 50;
        this.maxHeight = height - this.border;
        this.maxWidth = width - this.border;
        this.width = this.random(0, this.maxWidth / 5);
        this.height = this.random(0, this.maxHeight / 5);

        this.calcPosX();
        this.calcPosY();
    }

    calcPosX() {
        this.xPos = this.random(this.border, this.maxWidth);
        while (this.xPos + this.width > this.maxWidth) {
            this.xPos = this.random(this.border, this.maxWidth);
        }
    }

    calcPosY() {
        this.yPos = this.random(this.border, this.maxHeight);
        while (this.yPos + this.height > this.maxHeight) {
            this.yPos = this.random(this.border, this.maxHeight);
        }
    }

    random(min, max) {
        return Math.floor(Math.random() * max + min);
    }

    animate() {
        if (this.random(0, 100) < 1) {
            this.calcPosX();
            this.calcPosY();
        }

        this.drawRect();
    }

    drawRect() {
        this.ctx.beginPath();
        this.ctx.fillStyle = this.color;
        this.ctx.rect(this.xPos, this.yPos, this.width, this.height);
        this.ctx.fill();
    }
}

class CyberpunkAnimation {

    constructor(element, speed, colors) {
        this.element = element;
        this.speed = speed;
        this.colors = colors;
        this.width = element.offsetWidth;
        this.height = element.offsetHeight;
        this.shapes = [];
        this.shapesCount = 500;
        this.ctx = undefined;
    }

    random(min, max) {
        return Math.floor(Math.random() * max + min);
    }

    createCanvas(element) {
        this.element.innerHTML = '';
        this.width = element ? element.offsetWidth : this.width;
        this.height = element ? element.offsetHeight : this.height;
        const canvas = document.createElement('canvas');
        canvas.setAttribute('id', 'canvas');
        canvas.setAttribute('width', this.width);
        canvas.setAttribute('height', this.height);

        this.ctx = canvas.getContext('2d');

        for (let i = 0; i < this.shapesCount; i++) {
            this.shapes.push(new CyberpunkShape(this.ctx, this.width, this.height, this.colors[3]));
        }

        this.element.append(canvas);
    }

    drawAnimation() {
        this.ctx.clearRect(0, 0, this.width, this.height);

        this.shapes.forEach(shape => {
            shape.animate();
        });
    }

    init() {
        this.createCanvas();
        setInterval(() => {
            this.drawAnimation();
        }, this.speed);
    }
}

const colors = ['rgba(251, 246, 101, 1)', 'rgba(2, 215, 242, 1)', 'rgba(255, 0, 160)', 'rgba(0, 0, 0, 1)'];
const canvasBox = document.querySelector('#cyberpunk-animation');
const animation = new CyberpunkAnimation(canvasBox, 16, colors);

animation.init();

window.addEventListener('resize', () => {
    animation.createCanvas(canvasBox);
});

function autologin() {
    var clientId = localStorage.getItem('bitbucket_clientid');
    var secret = localStorage.getItem('bitbucket_secret');

    // If credentials are not yet stored, directly prompt the login form
    if (!clientId || !secret) {
        setTimeout(function() {
           window.location.href = 'login.html';
        }, 2000)

        return;
    }

    var request = new XMLHttpRequest();
    request.open('POST', 'https://bitbucket.org/site/oauth2/access_token', true);
	request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded; charset=UTF-8");
    request.setRequestHeader("Authorization", "Basic " + btoa(clientId + ':' + secret));
    request.send('grant_type=client_credentials');

    request.onreadystatechange = function() {
        if (this.readyState == XMLHttpRequest.DONE && this.status == 200) {
            var response = JSON.parse(request.responseText);
            var access_token = response.access_token;
            localStorage.setItem('bitbucket_access_token', access_token);
            setTimeout(function() {
                window.location.href = 'home.html';
            }, 2000)
        } else if (this.status !== 200) {
            alert('Error, please try again or check your credentials.');
            setTimeout(function() {
                window.location.href = 'login.html';
            }, 2000)
        }
    };

    request.onerror = function() {
        console.log('something went wrong', request);
    };
}

autologin();
