function switchTab(id,el){
  document.querySelectorAll('.sw').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.icon-nav button').forEach(b=>b.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  el.classList.add('active');
  window.scrollTo({top:0,behavior:'smooth'});
}
document.querySelectorAll('.cat-bar a').forEach(a=>{
  a.addEventListener('click',e=>{
    e.preventDefault();
    const t=document.querySelector(a.getAttribute('href'));
    if(!t) return;
    const bc=document.querySelector('.bc');
    const nav=document.querySelector('.icon-nav-wrap');
    const offset=(bc?bc.offsetHeight:0)+(nav?nav.offsetHeight:0)+8;
    window.scrollTo({top:t.getBoundingClientRect().top+window.scrollY-offset,behavior:'smooth'});
  });
});
