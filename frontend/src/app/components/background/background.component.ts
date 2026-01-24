import { Component, OnInit } from '@angular/core';

interface Particle {
  style: any;
  class: string;
}

@Component({
  selector: 'app-background',
  templateUrl: './background.component.html',
  styleUrls: ['./background.component.scss']
})
export class BackgroundComponent implements OnInit {
  particles: Particle[] = [];
  shapes = ['cube', 'sphere', 'pyramid'];

  ngOnInit() {
    this.generateParticles(6); // Optimized for production (was 10)
  }

  generateParticles(count: number) {
    for (let i = 0; i < count; i++) {
      const shape = this.shapes[Math.floor(Math.random() * this.shapes.length)];
      const size = Math.floor(Math.random() * 40) + 10; // 10px to 50px
      const left = Math.floor(Math.random() * 100); // 0% to 100%
      const duration = Math.floor(Math.random() * 20) + 10; // 10s to 30s
      const delay = Math.floor(Math.random() * 20); // 0s to 20s
      const opacity = (Math.random() * 0.3) + 0.1; // 0.1 to 0.4

      this.particles.push({
        class: `particle ${shape}`,
        style: {
          'left': `${left}%`,
          'width': `${size}px`,
          'height': `${size}px`,
          'animation-duration': `${duration}s`,
          'animation-delay': `-${delay}s`, // Negative delay to start mid-animation (continuous feel)
          'opacity': `${opacity}`
        }
      });
    }
  }
}
