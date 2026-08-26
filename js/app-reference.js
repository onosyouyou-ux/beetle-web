/* Shared landing-page link and hero visual for education apps. */
(function(){'use strict';
var path=location.pathname.replace(/index\.html$/,'');
var data={
'/tools/sekigae/':{hero:'.sk-hero',img:'/assets/images/sekigae-hero-people.jpg',alt:'座席表を並べる小学校の先生のイラスト',landing:'/tools/sekigae/landing.html',label:'このツールについて'},
'/tools/kanji/':{hero:'.kj-hero',img:'/assets/images/kanji-hero-people.jpg',alt:'親子で絵カードと空白ノートを使って学ぶイラスト',landing:'/tools/kanji/landing.html'},
'/tools/tokei/':{hero:'.tk-hero',img:'/assets/images/tokei-hero-people.jpg',alt:'親子でアナログ時計を学ぶイラスト',landing:'/tools/tokei/landing.html'},
'/tools/katakana/':{hero:'.kt-hero',landing:'/tools/katakana/landing.html'},
'/tools/romaji/':{hero:'.rj-hero',landing:'/tools/romaji/landing.html'},
'/tools/phonics/':{hero:'.pn-hero',landing:'/tools/phonics/landing.html'}
};
var c=data[path];if(!c)return;
var hero=document.querySelector(c.hero);
if(hero){
  var mascot=hero.querySelector('.ninja-mascot');
  hero.classList.add('app-ref-hero');
  var copy=document.createElement('div');copy.className='app-ref-copy';
  while(hero.firstChild)copy.appendChild(hero.firstChild);
  var link=document.createElement('a');link.className='app-ref-button';link.href=c.landing;
  link.textContent=c.label||'おうちのかたへ・よくある しつもん';
  copy.appendChild(link);hero.appendChild(copy);
  var visual=document.createElement('div');visual.className='app-ref-visual';
  if(mascot){
    visual.classList.add('is-ninja');
    mascot.classList.add('ninja-hero-art');
    visual.appendChild(mascot);
  }else{
    visual.innerHTML='<img src="'+c.img+'" width="960" height="640" alt="'+c.alt+'">';
  }
  hero.appendChild(visual);
}
})();
