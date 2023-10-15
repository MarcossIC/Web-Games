import { Component, ElementRef, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { Title } from '@angular/platform-browser';
import { SeoService } from '@app/data/services/seo.service';

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.css']
})
export class StartComponent implements OnInit {
  @ViewChildren('spanElement') spanElements!: QueryList<ElementRef>;
  
  isHovered: boolean[] = [false, false];

  constructor(private seo: SeoService, private title: Title) { }

  ngOnInit(): void {
    this.title.setTitle("Start");
    this.seo.generateTags({
      title: "Start",
      description: "Start page, before games",
      slug: ""
    });
  }

  onHover(index: number): void{
    //this.isHovered[index] = true;
    this.spanElements.toArray().forEach((spanElement, i) => {
      const condition = index === i;
      spanElement.nativeElement.style.opacity = condition ? '1' : '0';
      spanElement.nativeElement.style.animation = condition ? 'left-right 1s linear infinite normal forwards' : 'none';
    });
   
/*
    this.spanElements.toArray().forEach((spanElement, i) => {
        const condition = index === i;
        spanElement.nativeElement.style.opacity = condition ? '1' : '0';

        //spanElement.nativeElement.classList.add(condition ? 'highlight' : '');
        //spanElement.nativeElement.classList.remove(condition ? '' : 'highlight');
    });*/
  }

  notHover(){
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
