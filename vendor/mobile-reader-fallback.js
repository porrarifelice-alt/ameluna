
(function(){
  class LocalMobileReader {
    constructor(root, settings){
      this.root=root; this.settings=settings||{}; this.pages=[]; this.index=0; this.events={};
      this.root.innerHTML='';
      this.wrap=document.createElement('div');
      this.wrap.className='local-mobile-reader';
      this.img=document.createElement('img');
      this.img.draggable=false;
      this.wrap.appendChild(this.img);
      this.root.appendChild(this.wrap);
      this.bindSwipe();
    }
    on(name, cb){ (this.events[name]||(this.events[name]=[])).push(cb); }
    emit(name, data){ (this.events[name]||[]).forEach(cb=>cb({data})); }
    loadFromImages(pages){
      this.pages=pages.slice(); this.index=0; this.render();
      setTimeout(()=>this.emit('init',0),0);
    }
    render(){
      if(!this.pages.length) return;
      this.img.src=this.pages[this.index];
      this.emit('flip',this.index);
    }
    flipNext(){ if(this.index<this.pages.length-1){this.emit('changeState','flipping');this.index++;this.animate('next');} }
    flipPrev(){ if(this.index>0){this.emit('changeState','flipping');this.index--;this.animate('prev');} }
    flip(i){ this.index=Math.max(0,Math.min(this.pages.length-1,i)); this.emit('changeState','flipping'); this.animate(i>=this.index?'next':'prev'); }
    turnToPage(i){ this.flip(i); }
    getCurrentPageIndex(){ return this.index; }
    getOrientation(){ return 'portrait'; }
    destroy(){ this.root.innerHTML=''; }
    animate(dir){
      this.wrap.classList.remove('flip-next','flip-prev');
      void this.wrap.offsetWidth;
      this.wrap.classList.add(dir==='prev'?'flip-prev':'flip-next');
      setTimeout(()=>{this.render();this.wrap.classList.remove('flip-next','flip-prev');},170);
    }
    bindSwipe(){
      let x0=null;
      this.wrap.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;},{passive:true});
      this.wrap.addEventListener('touchend',e=>{
        if(x0===null)return;
        const dx=e.changedTouches[0].clientX-x0;
        if(Math.abs(dx)>35){ dx<0?this.flipNext():this.flipPrev(); }
        x0=null;
      },{passive:true});
    }
  }
  window.AmelunaLocalMobileReader=LocalMobileReader;
})();
