import { Injectable } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SeoService {
  constructor(private meta: Meta) { }

  generateTags(config: any){
    config = {
      title: "Game Glaxy",
      description: "Angular website to play classic games like tetris, tic-tac-toe, snake game",
      image: "",
      slug: "",
      ...config
    };

    this.meta.updateTag({ property: 'description', content: config.description });

    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    //this.meta.updateTag({ name: 'twitter:site', content: '@MiTwitter' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: config.image });

    this.meta.updateTag({ property: 'og:site_name', content: 'Game Glaxy' });
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:image', content: config.image });
    this.meta.updateTag({ property: 'og:url', content: `https://game-galaxy.netlify.app/${config.slug}` });
  }
}
