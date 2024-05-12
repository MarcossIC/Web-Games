import {
  Component,
  ElementRef,
  OnInit,
  QueryList,
  ViewChildren,
  inject,
} from '@angular/core';
import { SeoService } from '@app/data/services/seo.service';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.css'],
})
export class StartComponent implements OnInit {
  @ViewChildren('spanElement') spanElements!: QueryList<ElementRef>;

  isHovered: boolean[] = [false, false];

  private seo = inject(SeoService);

  constructor() {}

  ngOnInit(): void {
    this.seo.generateTags({
      title: 'Game Galaxy - Start Page',
      description: 'Start Page',
      slug: '',
    });
  }

  onHover(index: number): void {
    //this.isHovered[index] = true;
    this.spanElements.toArray().forEach((spanElement, i) => {
      const condition = index === i;
      spanElement.nativeElement.style.opacity = condition ? '1' : '0';
      spanElement.nativeElement.style.animation = condition
        ? 'left-right 1s linear infinite normal forwards'
        : 'none';
    });

    /*
    this.spanElements.toArray().forEach((spanElement, i) => {
        const condition = index === i;
        spanElement.nativeElement.style.opacity = condition ? '1' : '0';

        //spanElement.nativeElement.classList.add(condition ? 'highlight' : '');
        //spanElement.nativeElement.classList.remove(condition ? '' : 'highlight');
    });*/
  }

  notHover() {
    //this.isHovered = [false, false];

    this.spanElements.toArray().forEach((spanElement, i) => {
      spanElement.nativeElement.style.opacity = '0';
      spanElement.nativeElement.style.animation = 'none';
    });

    /*
    this.spanElements.toArray().forEach((spanElement)=>{
      spanElement.nativeElement.style.opacity = '0';
      //spanElement.nativeElement.classList.remove('highlight');
    })*/
  }
}
