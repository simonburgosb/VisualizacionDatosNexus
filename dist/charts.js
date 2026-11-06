import {data} from './data.js';
const NS='http://www.w3.org/2000/svg';
const nf=n=>new Intl.NumberFormat('es-CO').format(n);
export const formatChartValue=(value,unit)=>unit==='%'?`${nf(value)}%`:`${nf(value)} ${unit}`;
export const chartTitle=key=>data[key].title;
const node=(tag,attrs,parent)=>{const n=document.createElementNS(NS,tag);for(const [key,value]of Object.entries(attrs||{}))n.setAttribute(key,value);parent?.append(n);return n;};
const text=(parent,value,x,y,attrs={})=>{const n=node('text',{x,y,fill:'#91a39b','font-size':11,'font-family':'DM Sans, Arial, sans-serif',...attrs},parent);n.textContent=value;return n;};
const colorsFor=key=>data[key].colors??[['virus','deaths','mortality'].includes(key)?'#f17878':'#c4f078','#bb8fdd','#ce9369'];
let sequence=0;
export function createChartRenderer({isReduced=()=>false}={}){
 const plots=new Map();
 function draw(el,key,{preview=false,onHover=()=>{},playback=null,resumeState=null}={}){
  plots.get(el)?.destroy();if(playback){playback.replaceChildren();playback.hidden=true;}el.replaceChildren();el.classList.add('chart-plot');el.dataset.chartKey=key;
  const d=data[key],w=Math.max(180,Math.min(1000,el.clientWidth||800)),h=preview?265:380,id='nexus-plot-'+(++sequence),colors=colorsFor(key);
  const svg=node('svg',{xmlns:NS,viewBox:`0 0 ${w} ${h}`,role:'group','aria-label':d.title},el);
  const tooltip=document.createElement('span');tooltip.className='chart-tooltip';tooltip.id=id+'-tooltip';tooltip.hidden=true;tooltip.setAttribute('role','tooltip');el.append(tooltip);
  const tipTitle=document.createElement('span'),tipValue=document.createElement('strong');tooltip.append(tipTitle,tipValue);
  const groups=[],activate=[],deactivate=[];let tween,disposed=false,refreshControls=()=>{},pauseForMotion=()=>{},snapshot=()=>null;
  const interactive=()=>!el.closest('.station')?.classList.contains('locked');
  function clear(){groups.forEach((g,i)=>{g.classList.remove('is-active');deactivate[i]?.();});tooltip.hidden=true;onHover(null);}
  function show(i,event){
   if(!interactive()||disposed)return;groups.forEach((g,j)=>{g.classList.toggle('is-active',i===j);if(i===j)activate[j]?.();else deactivate[j]?.();});
   tipTitle.textContent=d.labels[i];tipValue.textContent=formatChartValue(d.values[i],d.unit);tooltip.hidden=false;
   const r=el.getBoundingClientRect(),g=groups[i],px=event?.clientX!==undefined?event.clientX-r.left:+g.dataset.x/w*r.width,py=event?.clientY!==undefined?event.clientY-r.top:+g.dataset.y/h*r.height;
   const tw=tooltip.offsetWidth||180,th=tooltip.offsetHeight||58;
   tooltip.style.left=Math.max(6,Math.min(r.width-tw-6,px+12))+'px';tooltip.style.top=Math.max(6,Math.min(r.height-th-6,py-th-12))+'px';onHover(i);
  }
  function datum(group,i,x,y,{enter,leave}={}){
   group.classList.add('chart-datum');group.dataset.index=i;group.dataset.x=x;group.dataset.y=y;group.setAttribute('aria-label',`${d.labels[i]}: ${formatChartValue(d.values[i],d.unit)}`);
   if(!preview){group.setAttribute('tabindex','0');group.setAttribute('role','button');group.setAttribute('aria-describedby',tooltip.id);}
   groups[i]=group;activate[i]=enter;deactivate[i]=leave;
   group.addEventListener('pointerenter',e=>show(i,e));group.addEventListener('pointermove',e=>show(i,e));group.addEventListener('pointerdown',e=>show(i,e));
   group.addEventListener('pointerleave',()=>{if(document.activeElement!==group)clear();});group.addEventListener('focus',()=>show(i));group.addEventListener('blur',clear);
   group.addEventListener('keydown',e=>{if(e.key==='ArrowRight'||e.key==='ArrowLeft'){e.preventDefault();groups[(i+(e.key==='ArrowRight'?1:groups.length-1))%groups.length]?.focus();}else if(e.key==='Enter'||e.key===' '){e.preventDefault();show(i);}});
  }
  function valueBadge(parent,value,x,y,fontSize=11){const label=String(value),bw=Math.max(fontSize<11?22:31,label.length*fontSize*.61+(fontSize<11?8:14)),g=node('g',{'class':'chart-value-label','pointer-events':'none'},parent);node('rect',{x:x-bw/2,y:y-10,width:bw,height:20,rx:5,fill:'#080a0fe8',stroke:'#334139','stroke-width':.6},g);text(g,label,x,y+3.5,{'text-anchor':'middle',fill:'#eef2f7','font-size':fontSize,'font-weight':600});return g;}
  function legend(unit='%'){
   const legend=document.createElement('span');legend.className='plot-legend';legend.setAttribute('aria-hidden','true');
   d.labels.forEach((label,i)=>{const item=document.createElement('span'),swatch=document.createElement('i');swatch.style.background=colors[i];item.append(swatch,document.createTextNode(`${label} ${formatChartValue(d.values[i],unit)}`));item.addEventListener('pointerenter',()=>show(i));item.addEventListener('pointerleave',clear);legend.append(item);});el.append(legend);
  }
  if(d.type==='waffle'){
   const total=d.totalUnits??100,columns=d.columns??10,rows=Math.ceil(total/columns);
   const step=Math.min((w-32)/columns,(h-82)/rows),gap=step*.2,cell=step-gap,left=(w-columns*step)/2,top=10,gridHeight=rows*step;
   if(d.glyph==='network'){
    const wiring=node('g',{'class':'territory-wiring',stroke:'#ce9369','stroke-width':.8,opacity:.35,'pointer-events':'none','aria-hidden':'true'},svg);
    for(let unit=0;unit<total;unit++){
     const x=left+(unit%columns+.5)*step,y=top+(Math.floor(unit/columns)+.5)*step;
     if(unit%columns<columns-1&&unit+1<total)node('line',{x1:x,y1:y,x2:x+step,y2:y},wiring);
     if(unit+columns<total)node('line',{x1:x,y1:y,x2:x,y2:y+step},wiring);
    }
   }
   const defs=node('defs',{},svg),categories=d.values.map((value,i)=>node('g',{'class':'waffle-category','data-units':value},svg));
   const ranges=[];let cumulative=0;d.values.forEach(value=>{ranges.push([cumulative,cumulative+value]);cumulative+=value;});
   function glyph(parent,x,y,color,index){
    if(d.glyph==='network'){
     node('circle',{cx:x+cell/2,cy:y+cell/2,r:cell*.39,fill:'#10191b',stroke:color,'stroke-width':1.2,'class':'territory-node'},parent);
     node('rect',{x:x+cell*.33,y:y+cell*.33,width:cell*.34,height:cell*.34,rx:cell*.06,fill:color,'class':'territory-core'},parent);
     for(const side of [-1,1])node('line',{x1:x+cell/2+side*cell*.21,x2:x+cell/2+side*cell*.3,y1:y+cell/2,y2:y+cell/2,stroke:color,'stroke-width':1},parent);
     return;
    }
    node('rect',{x,y,width:cell,height:cell,rx:cell*.12,fill:color,'fill-opacity':d.glyph?.length ? .08 : .14,stroke:color,'stroke-width':1,'class':'waffle-shell'},parent);
    if(d.glyph==='soma'){
     const person=node('g',{transform:`translate(${x+cell*.3},${y+cell*.08}) scale(${cell*.004},${cell*.0042})`,fill:color,'class':'unit-soma'},parent);
     node('circle',{cx:50,cy:20,r:20},person);node('rect',{x:24,y:45,width:52,height:82,rx:19},person);node('rect',{x:7,y:50,width:13,height:83,rx:6},person);node('rect',{x:80,y:50,width:13,height:83,rx:6},person);node('rect',{x:27,y:124,width:20,height:76,rx:8},person);node('rect',{x:53,y:124,width:20,height:76,rx:8},person);
     node('rect',{x:43,y:39,width:14,height:9,fill:index===0?'#f2ffe8':'#0a0e11'},person);
    }else if(d.glyph==='modules'){
     const remaining=[4,0,2][index];
     for(let part=0;part<4;part++){const active=part<remaining,xx=x+cell*(.16+part*.18);node('rect',{x:xx,y:y+cell*.19,width:cell*.12,height:cell*.62,rx:cell*.035,fill:active?color:'#0a0e11',stroke:active?color:'#7d8790','stroke-width':.6,'data-module':active?'present':'lost'},parent);if(!active)node('path',{d:`M${xx} ${y+cell*.32}l${cell*.12} ${cell*.36}`,stroke:'#a0a5ab','stroke-width':.7,'pointer-events':'none'},parent);}
    }else{
     node('rect',{x:x+cell*.25,y:y+cell*.25,width:cell*.5,height:cell*.5,rx:cell*.05,fill:color,'fill-opacity':.8,'class':'waffle-core'},parent);
     for(const part of [.32,.5,.68])node('path',{d:`M${x} ${y+cell*part}h${cell*.2}M${x+cell*.8} ${y+cell*part}h${cell*.2}`,stroke:color,'stroke-width':.75,fill:'none','pointer-events':'none'},parent);
    }
   }
   for(let unit=0;unit<total;unit++){
    const x=left+(unit%columns)*step+gap/2,y=top+Math.floor(unit/columns)*step+gap/2;
    ranges.forEach(([start,end],category)=>{
     const from=Math.max(unit,start),to=Math.min(unit+1,end),fraction=to-from;if(fraction<1e-8)return;
     const part=node('g',{'class':'waffle-chip','data-category':category,'data-unit':unit+1,'data-fraction':fraction.toFixed(6)},categories[category]);
     if(fraction<1-1e-8){const clipId=`${id}-unit-${unit}-${category}`,clip=node('clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'},defs);node('rect',{x:x+(from-unit)*cell,y:y-1,width:fraction*cell,height:cell+2},clip);part.setAttribute('clip-path',`url(#${clipId})`);}
     glyph(part,x,y,colors[category],category);
    });
   }
   ranges.forEach(([start,end],i)=>{const firstRow=Math.floor(start/columns),lastRow=Math.floor((end-1e-8)/columns),y=top+(firstRow+lastRow+1)*step/2;datum(categories[i],i,w/2,y);});
   text(svg,d.unitLabel||'1 CHIP = 1% DEL TOTAL',w/2,top+gridHeight+22,{'text-anchor':'middle','font-size':preview?8:10,'letter-spacing':.5});
   if(d.values.some(value=>!Number.isInteger(value)))text(svg,'La silueta dividida conserva el decimal exacto.',w/2,top+gridHeight+36,{'text-anchor':'middle','font-size':8,fill:'#9bacaa'});
   legend(d.unit);
  }else if(d.type==='doughnut'){
   const cx=w/2,cy=(h-72)/2,r=Math.min((w-55)/2,(h-100)/2),inner=r*.72;let angle=-Math.PI/2;
   const centerValue=text(svg,formatChartValue(d.values[0],'%'),cx,cy+7,{'text-anchor':'middle',fill:'#f0f3ef','font-size':preview?29:38,'font-weight':600});
   text(svg,{transfail:'ÉXITO',humans:'INTEGRADOS',mortality:'COMPLETOS'}[key],cx,cy+28,{'text-anchor':'middle','font-size':9,'letter-spacing':1.5});
   d.values.forEach((v,i)=>{
    const end=angle+v/100*Math.PI*2,a=angle+.025,b=end-.025,mid=(a+b)/2,point=(radius,aa)=>[cx+Math.cos(aa)*radius,cy+Math.sin(aa)*radius];
    const group=node('g',{'class':'donut-segment'},svg),p1=point(r,a),p2=point(r,b),p3=point(inner,b),p4=point(inner,a);
    node('path',{d:`M${p1}A${r},${r},0,${b-a>Math.PI?1:0},1,${p2}L${p3}A${inner},${inner},0,${b-a>Math.PI?1:0},0,${p4}Z`,fill:colors[i]},group);
    const [bx,by]=point((r+inner)/2,mid);valueBadge(group,formatChartValue(v,'%'),bx,by);
    const distance=preview?12:20;
    datum(group,i,bx,by,{enter:()=>group.setAttribute('transform',`translate(${Math.cos(mid)*distance},${Math.sin(mid)*distance})`),leave:()=>group.removeAttribute('transform')});angle=end;
   });
   legend();
  }else{
   const left=key==='deaths'?76:55,right=24,bottom=60,pw=w-left-right;
   const top=d.type==='bar'?h-bottom-Math.min(h-bottom-35,pw/d.values.length*1.65):35,ph=h-top-bottom;
   const scale=d3.scaleLinear().domain([0,Math.max(...d.values)*1.12]).nice(4),maximum=scale.domain()[1];
   const x=i=>left+(d.type==='bar'?(i+.5)/d.values.length:i/(d.values.length-1))*pw,y=v=>h-bottom-v/maximum*ph;
   for(const tick of scale.ticks(4)){const yy=y(tick);node('line',{x1:left,x2:w-right,y1:yy,y2:yy,stroke:'#293a32','stroke-width':1},svg);text(svg,nf(tick),left-10,yy+3,{'text-anchor':'end','font-size':10});}
   text(svg,d.unit.toUpperCase(),left,14,{'font-size':9,'letter-spacing':1.2});
   for(let i=0;i<d.labels.length;i++){
    if(d.type==='line')node('line',{x1:x(i),x2:x(i),y1:top,y2:h-bottom,stroke:'#293a3266'},svg);
    const fontSize=w<280?8:w<400?9:10,space=d.type==='bar'?pw/d.labels.length*.93:pw/(d.labels.length-1)*.85,lines=[];let line='';
    for(const word of d.labels[i].split(' ')){const next=line?line+' '+word:word;if(line&&next.length*fontSize*.55>space){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);
    lines.forEach((part,j)=>text(svg,part,x(i),h-bottom+23+j*13,{'text-anchor':'middle','font-size':fontSize}));
   }
   if(d.type==='bar'){
    const height=ph,width=height/2,defs=node('defs',{},svg),clipId=id+'-soma-fill';
    // One fixed silhouette for every category; only the clipped liquid level encodes the value.
    const body='M37 45H63Q77 45 81 61L92 117Q94 126 86 128Q79 130 77 122L71 94V124L73 187Q74 200 64 200Q55 200 54 189L50 146L46 189Q45 200 36 200Q26 200 27 187L29 124V94L23 122Q21 130 14 128Q6 126 8 117L19 61Q23 45 37 45Z';
    function silhouette(parent,attrs={}){const shape=node('g',attrs,parent);node('circle',{cx:50,cy:20,r:20},shape);node('path',{d:body},shape);return shape;}
    const clip=node('clipPath',{id:clipId,clipPathUnits:'userSpaceOnUse'},defs);
    node('circle',{cx:50,cy:20,r:20},clip);node('path',{d:body},clip);
    d.values.forEach((v,i)=>{
     const xx=x(i),group=node('g',{'class':'soma-datum'},svg),fraction=Math.max(0,Math.min(1,v/maximum)),level=200*(1-fraction);
     node('rect',{x:xx-pw/d.values.length*.46,y:top,width:pw/d.values.length*.92,height:ph,fill:'transparent'},group);
     const soma=node('g',{transform:`translate(${xx-width/2},${top}) scale(${width/100})`,'class':'soma-bar','data-value':v,'data-maximum':maximum,'data-fraction':fraction},group);
     silhouette(soma,{fill:'#f1f0e9','class':'soma-base','pointer-events':'none'});
     const liquid=node('g',{'clip-path':`url(#${clipId})`,'pointer-events':'none'},soma);
     node('rect',{x:0,y:level,width:100,height:200*fraction,fill:'#c4f078','class':'soma-fill'},liquid);
     node('line',{x1:0,x2:100,y1:level,y2:level,stroke:'#8db94b','stroke-width':1.1,'vector-effect':'non-scaling-stroke'},liquid);
     silhouette(soma,{fill:'none',stroke:'#8cbb50','stroke-width':1.3,'class':'soma-outline','pointer-events':'none'});
     node('rect',{x:44,y:42,width:12,height:10,rx:2,fill:'#42692d',stroke:'#b8dc8b','stroke-width':.6,'pointer-events':'none'},soma);
     valueBadge(group,nf(v),xx,top-15,w<300?9:11);datum(group,i,xx,y(v));
    });

   }else{
    const points=d.values.map((v,i)=>[x(i),y(v)]),path=d3.line().curve(d3.curveMonotoneX)(points);
    const defs=node('defs',{},svg),gradient=node('linearGradient',{id:id+'-fill',x1:0,y1:0,x2:0,y2:1},defs);
    node('stop',{offset:'0%','stop-color':'#ce9369','stop-opacity':.22},gradient);node('stop',{offset:'100%','stop-color':'#ce9369','stop-opacity':0},gradient);
    node('path',{d:path+`L${x(d.values.length-1)} ${h-bottom}L${x(0)} ${h-bottom}Z`,fill:`url(#${id}-fill)`,stroke:'none'},svg);
    node('path',{d:path,fill:'none',stroke:'#ce93692e','stroke-width':14,'stroke-linejoin':'round'},svg);
    const cable=node('path',{d:path,fill:'none',stroke:'#ce9369','stroke-width':3.5,'stroke-linejoin':'round','class':'chip-cable'},svg),placedLabels=[];
    d.values.forEach((v,i)=>{
     const group=node('g',{'class':'line-datum'},svg),guide=node('line',{x1:x(i),x2:x(i),y1:y(v),y2:h-bottom,stroke:'#efc39b',opacity:0,'stroke-dasharray':'3 5'},group);
     const point=node('circle',{cx:x(i),cy:y(v),r:preview?4:6,fill:'#0a0e11',stroke:'#efc39b','stroke-width':3,'class':'line-point'},group);
     const labelWidth=String(nf(v)).length*6.7+14,bx=Math.max(left+labelWidth/2,Math.min(w-right-labelWidth/2,x(i)));
     let by=Math.max(24,y(v)-20);for(let attempt=0;attempt<d.values.length;attempt++){const collision=placedLabels.find(p=>Math.abs(p.x-bx)<(p.width+labelWidth)/2+4&&Math.abs(p.y-by)<23);if(!collision)break;by=collision.y>=48?collision.y-24:collision.y+24;}placedLabels.push({x:bx,y:by,width:labelWidth});
     valueBadge(group,nf(v),bx,by);node('circle',{cx:x(i),cy:y(v),r:18,fill:'transparent'},group);
     datum(group,i,x(i),y(v),{enter:()=>{point.setAttribute('r',preview?9:12);guide.setAttribute('opacity','.5');},leave:()=>{point.setAttribute('r',preview?4:6);guide.setAttribute('opacity','0');}});
    });
    const chip=node('g',{'pointer-events':'none','class':'chart-moving-chip'},svg);node('image',{href:'assets/nexus.svg',x:-9,y:-17,width:18,height:34},chip);
    const progress={t:0};let state='idle';
    const move=()=>{if(disposed)return;const p=cable.getPointAtLength(cable.getTotalLength()*progress.t);chip.setAttribute('transform',`translate(${p.x},${p.y})`);chip.setAttribute('data-progress',progress.t.toFixed(5));};
    let pauseButton,restartButton;
    const updateControls=()=>{if(!playback)return;playback.dataset.state=state;const label=state==='playing'?'Pausar':state==='paused'?'Reanudar':'Reproducir';pauseButton.innerHTML=`<i class="fa-solid fa-${state==='playing'?'pause':'play'}" aria-hidden="true"></i> ${label}`;pauseButton.setAttribute('aria-pressed',String(state==='paused'));pauseButton.disabled=restartButton.disabled=!interactive();};
    tween=gsap.fromTo(progress,{t:0},{t:1,duration:6,ease:'none',paused:true,immediateRender:false,onUpdate:move,onComplete:()=>{state='finished';updateControls();}});
    function restart(){if(disposed||!interactive())return;state='playing';tween.restart();updateControls();}
    if(playback){
     playback.hidden=false;playback.setAttribute('aria-label','Animación del recorrido NEXUS');pauseButton=document.createElement('button');restartButton=document.createElement('button');pauseButton.type=restartButton.type='button';restartButton.innerHTML='<i class="fa-solid fa-rotate-left" aria-hidden="true"></i> Reiniciar';
     pauseButton.onclick=()=>{if(disposed||!interactive())return;if(state==='playing'){tween.pause();state='paused';}else if(state==='paused'){tween.resume();state='playing';}else{restart();return;}updateControls();};restartButton.onclick=restart;playback.append(pauseButton,restartButton);
    }
    refreshControls=updateControls;pauseForMotion=()=>{if(isReduced()&&state==='playing'){tween.pause();state='paused';updateControls();}};
    snapshot=()=>({state,progress:progress.t});
    if(resumeState){tween.progress(resumeState.progress,true).pause();state=resumeState.state;move();if(state==='playing'&&!isReduced())tween.resume();else if(state==='playing')state='paused';}
    else if(!preview&&!isReduced()){state='playing';tween.play();move();}else{progress.t=1;move();}
    updateControls();

   }
  }
  svg.addEventListener('pointerleave',()=>{if(!svg.contains(document.activeElement))clear();});
  let lastWidth=el.clientWidth;const observer=new ResizeObserver(()=>{const width=el.clientWidth;if(width>0&&Math.abs(width-lastWidth)>12&&!disposed){lastWidth=width;draw(el,key,{preview,onHover,playback,resumeState:snapshot()});}});observer.observe(el);
  const instance={destroy(){disposed=true;tween?.kill();observer.disconnect();tooltip.hidden=true;if(playback){playback.replaceChildren();playback.hidden=true;}onHover(null);},select:show,refresh:()=>refreshControls(),syncMotion:()=>pauseForMotion()};plots.set(el,instance);return instance;
 }
 function destroy(el){plots.get(el)?.destroy();plots.delete(el);}
 return{draw,destroy,refresh:el=>plots.get(el)?.refresh(),syncMotion:()=>plots.forEach(plot=>plot.syncMotion())};
}
