import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';
import gsap from 'gsap';

@Directive({
  selector: '[appMagnetic]'
})
export class MagneticDirective {
  constructor(private el: ElementRef, private renderer: Renderer2) {}

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const el = this.el.nativeElement;
    const rect = el.getBoundingClientRect();
    
    // Calculate distance from center
    const x = event.clientX - (rect.left + rect.width / 2);
    const y = event.clientY - (rect.top + rect.height / 2);

    // Move element towards mouse (magnetic effect)
    // Strength factor: 0.3 (move 30% of distance)
    gsap.to(el, {
      duration: 0.3,
      x: x * 0.3,
      y: y * 0.3,
      ease: 'power2.out'
    });
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    gsap.to(this.el.nativeElement, {
      duration: 0.5,
      x: 0,
      y: 0,
      ease: 'elastic.out(1, 0.3)'
    });
  }
}
