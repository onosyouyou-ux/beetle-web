/* Shared in-app reference screen for education apps without a landing page. */
(function(){'use strict';
var path=location.pathname.replace(/index\.html$/,'');
var data={
'/tools/sekigae/':{hero:'.sk-hero',img:'/assets/images/sekigae-hero.jpg',alt:'教室の座席表と黒板のイラスト',title:'席替えメーカー',lead:'名簿から、配慮を守った座席表を作ります。',steps:[['名簿を貼る','1行に1人ずつ。出席番号つきでも使えます。'],['席と配慮を決める','横・縦の席数と、必要な配慮を入力します。'],['作って印刷する','何度でも引き直し、決まったら印刷します。']],guide:'配慮の書き方',items:[['離す','離す: 田中, 佐藤','前後左右の隣にしません。'],['前列','前列: 鈴木','前から2列目までにします。'],['後列','後列: 高橋','後ろから2列目までにします。'],['固定','固定: 山本 = 2れつ 3ばん','指定した席に固定します。']],note:'名簿は送信・保存されません。計算はこのブラウザの中だけで行います。'},
'/tools/kanji/':{hero:'.kj-hero',img:'/assets/images/kanji-hero.jpg',alt:'漢字練習帳と読み方カードのイラスト',title:'かんじドリル',lead:'小1・小2の漢字を、10問ずつ4択で練習できます。',steps:[['がくねんを えらぶ','小1・小2・ぜんぶから えらびます。'],['もんだいを えらぶ','よみか、かんじを えらぶ問題にします。'],['10もん とく','さいごに まちがえた ことばを見直せます。']],guide:'2つの れんしゅう',items:[['よみを えらぶ','ことば → よみ','ことばの正しい よみを4つから えらびます。'],['かんじを えらぶ','よみ → ことば','よみに合う ことばを4つから えらびます。']],note:'収録は小1の80字と小2の160字です。成績や回答は保存しません。'},
'/tools/tokei/':{hero:'.tk-hero',img:'/assets/images/tokei-hero.jpg',alt:'アナログ時計と時刻カードのイラスト',title:'とけいの れんしゅう',lead:'時計を読む・時刻から時計を探す練習ができます。',steps:[['れんしゅうを えらぶ','時計を読むか、時計をさがすか えらびます。'],['むずかしさを えらぶ','ちょうど・30ぷん・5ふん・1ぷんから えらびます。'],['10もん とく','まちがえても、読み方のヒントが出ます。']],guide:'はりの 見かた',items:[['みじかい はり','なんじ','赤い短い針で「なんじ」を読みます。'],['ながい はり','なんぷん','青い長い針で「なんぷん」を読みます。']],note:'1セットは10問です。結果や成績は保存しません。'}
};
var c=data[path];if(!c)return;
var hero=document.querySelector(c.hero);
if(hero){hero.classList.add('app-ref-hero');var copy=document.createElement('div');copy.className='app-ref-copy';while(hero.firstChild)copy.appendChild(hero.firstChild);var open=document.createElement('button');open.type='button';open.className='app-ref-button';open.textContent='リファレンス';open.setAttribute('aria-haspopup','dialog');copy.appendChild(open);hero.appendChild(copy);var visual=document.createElement('div');visual.className='app-ref-visual';visual.innerHTML='<img src="'+c.img+'" width="960" height="640" alt="'+c.alt+'">';hero.appendChild(visual);}
var dialog=document.createElement('dialog');dialog.className='app-ref-dialog';
var steps=c.steps.map(function(s,i){return '<article class="app-ref-step"><span class="app-ref-n">0'+(i+1)+'</span><h3>'+s[0]+'</h3><p>'+s[1]+'</p></article>';}).join('');
var items=c.items.map(function(g){return '<article><b>'+g[0]+'</b><code>'+g[1]+'</code><p>'+g[2]+'</p></article>';}).join('');
dialog.innerHTML='<div class="app-ref-head"><div><p class="app-ref-kicker">APP REFERENCE</p><h2>'+c.title+' の使い方</h2></div><button class="app-ref-x" type="button" data-ref-close aria-label="閉じる">×</button></div><div class="app-ref-body"><p class="app-ref-lead">'+c.lead+'</p><section class="app-ref-steps">'+steps+'</section><section class="app-ref-section"><p class="app-ref-label">QUICK GUIDE</p><h3>'+c.guide+'</h3><div class="app-ref-guide">'+items+'</div></section><p class="app-ref-note">'+c.note+'</p><button class="app-ref-start" type="button" data-ref-close>アプリにもどる</button></div>';
document.body.appendChild(dialog);
var openButton=document.querySelector('.app-ref-button');if(openButton)openButton.addEventListener('click',function(){dialog.showModal();});
dialog.querySelectorAll('[data-ref-close]').forEach(function(b){b.addEventListener('click',function(){dialog.close();});});
dialog.addEventListener('click',function(e){if(e.target===dialog)dialog.close();});
})();
