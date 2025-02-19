function $$(selector, context = document) {
  return Array.from(context.querySelectorAll(selector));
}

let pages = [
    { url: '', title: 'Visualization' },
    { url: 'write-up/', title: 'Write-Up' },
  ];

const ARE_WE_HOME = document.documentElement.classList.contains('home');

let nav = document.createElement('nav');
document.body.prepend(nav);

for (let p of pages) {
    let url = p.url;
    let title = p.title;
  
    url = !ARE_WE_HOME && !url.startsWith('http') ? '../' + url : url;
  
    let a = document.createElement('a');
    a.href = url;
    a.textContent = title;
  
    a.classList.toggle(
      'current',
      a.host === location.host && a.pathname === location.pathname
    );
  
    a.target = a.host !== location.host ? '_blank' : '';
  
    nav.append(a);
  }