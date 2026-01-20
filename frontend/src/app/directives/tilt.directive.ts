import { Directive, ElementRef, HostListener, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appTilt]'
})
export class TiltDirective {
  constructor(private el: ElementRef, private renderer: Renderer2) {
    this.renderer.setStyle(this.el.nativeElement, 'transform-style', 'preserve-3d');
    this.renderer.setStyle(this.el.nativeElement, 'will-change', 'transform');
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    const el = this.el.nativeElement;
    const rect = el.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    
    // Calculate mouse position relative to element
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Calculate rotation (max 15 degrees)
    const rotateX = ((mouseY - height / 2) / height) * -15; // Invert for natural tilt
    const rotateY = ((mouseX - width / 2) / width) * 15;

    // Apply transform
    const transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.05)`;
    this.renderer.setStyle(el, 'transform', transform);

    // Dynamic Shadow/Glare
    const shadowX = (mouseX - width / 2) / 10;
    const shadowY = (mouseY - height / 2) / 10;
    this.renderer.setStyle(el, 'box-shadow', `${-shadowX}px ${-shadowY}px 30px rgba(0,0,0,0.1)`);
  }

  @HostListener('mouseleave')
  onMouseLeave() {
    // Reset on leave
    this.renderer.setStyle(this.el.nativeElement, 'transform', 'perspective(1000px) rotateX(0) rotateY(0) scale(1)');
    this.renderer.setStyle(this.el.nativeElement, 'box-shadow', '0 10px 40px rgba(0,0,0,0.08)'); // Original shadow
  }
}
