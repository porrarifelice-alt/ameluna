 (function(){
  class LocalMobileReader {
    constructor(root, settings){
      this.root=root; this.settings=settings||{}; this.pages=[]; this.index=0; this.events={};
      this.scale=1; this.tx=0; this.ty=0;
      this.startScale=1; this.startDistance=0; this.dragStart=null; this.swipeStart=null;
      this.root.innerHTML='';
      this.wrap=document.createElement('div');
      this.wrap.className='local-mobile-reader';
      this.img=document.createElement('img');
      this.img.draggable=false;
      this.wrap.appendChild(this.img);
      this.root.appendChild(this.wrap);
      this.bindGestures();
    }
    on(name, cb){ (this.events[name]||(this.events[name]=[])).push(cb); }
    emit(name, data){ (this.events[name]||[]).forEach(cb=>cb({data})); }
    loadFromImages(pages){
      this.pages=pages.slice(); this.index=0; this.resetZoom(false); this.render();
      setTimeout(()=>this.emit('init',0),0);
    }
    render(){
      if(!this.pages.length) return;
      this.img.src=this.pages[this.index];
      this.emit('flip',this.index);
    }
    flipNext(){ if(this.index<this.pages.length-1){this.emit('changeState','flipping');this.index++;this.resetZoom(false);this.animate('next');} }
    flipPrev(){ if(this.index>0){this.emit('changeState','flipping');this.index--;this.resetZoom(false);this.animate('prev');} }
    flip(i){
      const old=this.index;
      this.index=Math.max(0,Math.min(this.pages.length-1,i));
      this.emit('changeState','flipping'); this.resetZoom(false); this.animate(this.index>=old?'next':'prev');
    }
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
    distance(a,b){ return Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY); }
    clamp(v,min,max){ return Math.max(min,Math.min(max,v)); }
    getPanBounds(){
      const wrapW=this.wrap.clientWidth||0, wrapH=this.wrap.clientHeight||0;
      const imgW=this.img.offsetWidth||wrapW, imgH=this.img.offsetHeight||wrapH;
      return {
        maxX:Math.max(0,(imgW*this.scale-wrapW)/2),
        maxY:Math.max(0,(imgH*this.scale-wrapH)/2)
      };
    }
    canPan(){
      const b=this.getPanBounds();
      return b.maxX>1 || b.maxY>1 || this.scale>1.001;
    }
    applyTransform(){
      if(this.scale<1){ this.scale=1; }
      const {maxX,maxY}=this.getPanBounds();
      this.tx=this.clamp(this.tx,-maxX,maxX);
      this.ty=this.clamp(this.ty,-maxY,maxY);
      this.img.style.transform=`translate3d(${this.tx}px,${this.ty}px,0) scale(${this.scale})`;
    }
    resetZoom(animate=true){
      if(animate) this.img.style.transition='transform .18s ease';
      this.scale=1; this.tx=0; this.ty=0; this.applyTransform();
      if(animate) setTimeout(()=>{ if(this.img) this.img.style.transition=''; },200);
    }
    bindGestures(){
      this.wrap.addEventListener('touchstart',e=>{
        if(e.touches.length===2){
          e.preventDefault();
          this.startDistance=this.distance(e.touches[0],e.touches[1]);
          this.startScale=this.scale;
          this.dragStart=null; this.swipeStart=null;
        } else if(e.touches.length===1){
          const t=e.touches[0];
          if(this.canPan()){ this.dragStart={x:t.clientX,y:t.clientY,tx:this.tx,ty:this.ty}; }
          else { this.swipeStart={x:t.clientX,y:t.clientY}; }
        }
      },{passive:false});

      this.wrap.addEventListener('touchmove',e=>{
        if(e.touches.length===2 && this.startDistance){
          e.preventDefault();
          const d=this.distance(e.touches[0],e.touches[1]);
          this.scale=this.clamp(this.startScale*(d/this.startDistance),1,4);
          this.applyTransform();
        } else if(e.touches.length===1 && this.canPan() && this.dragStart){
          e.preventDefault();
          const t=e.touches[0];
          this.tx=this.dragStart.tx+(t.clientX-this.dragStart.x);
          this.ty=this.dragStart.ty+(t.clientY-this.dragStart.y);
          this.applyTransform();
        }
      },{passive:false});

      this.wrap.addEventListener('touchend',e=>{
        if(e.touches.length<2){ this.startDistance=0; }
        if(e.touches.length===0){
          if(this.scale<=1.02 && this.swipeStart && e.changedTouches.length){
            const t=e.changedTouches[0];
            const dx=t.clientX-this.swipeStart.x;
            const dy=t.clientY-this.swipeStart.y;
            if(Math.abs(dx)>35 && Math.abs(dx)>Math.abs(dy)*1.15){ dx<0?this.flipNext():this.flipPrev(); }
          }
          this.dragStart=null; this.swipeStart=null;
          if(this.scale<1.02) this.resetZoom(false);
        }
      },{passive:false});

      let lastTap=0;
      this.wrap.addEventListener('touchend',e=>{
        if(e.touches.length===0 && e.changedTouches.length===1){
          const now=Date.now();
          if(now-lastTap<280){ this.resetZoom(true); lastTap=0; }
          else lastTap=now;
        }
      },{passive:true});
    }
  }
  window.AmelunaLocalMobileReader=LocalMobileReader;
})();
