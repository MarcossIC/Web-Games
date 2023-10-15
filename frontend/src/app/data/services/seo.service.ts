import { Injectable } from '@angular/core';
import { Meta } from '@angular/platform-browser';

@Injectable({
  providedIn: 'root'
})
export class SeoService {

  constructor(private meta: Meta) { }

  generateTags(config: any){
    config = {
      title: "Marcos Lopez Web Portfolio",
      description: "Marcos Lopez Portfolio Web, site to show my projects and experiences",
      image: "",
      slug: "",
      ...config
    };

    this.meta.updateTag({ name: 'twitter:card', content: 'summary' });
    //this.meta.updateTag({ name: 'twitter:site', content: '@MiTwitter' });
    this.meta.updateTag({ name: 'twitter:title', content: config.title });
    this.meta.updateTag({ name: 'twitter:description', content: config.description });
    this.meta.updateTag({ name: 'twitter:image', content: config.image });

    this.meta.updateTag({ property: 'og:type', content: 'article' });
    this.meta.updateTag({ property: 'og:site_name', content: 'Marcos Lopez Web Portfolio' });
    this.meta.updateTag({ property: 'og:title', content: config.title });
    this.meta.updateTag({ property: 'og:description', content: config.description });
    this.meta.updateTag({ property: 'og:image', content: config.image });
    this.meta.updateTag({ property: 'og:url', content: `https://subtle-biscotti-007cf5.netlify.app/${config.slug}` });
  }
}
