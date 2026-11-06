import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { data } from './data.js';
import { createChartRenderer, chartTitle, formatChartValue } from './charts.js';
import { createSoma } from './soma.js';
import { initInspector } from './inspector.js';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const reducedQuery=matchMedia('(prefers-reduced-motion: reduce)');
let reduced=reducedQuery.matches, connected=false, connecting=false, unlocked=0, routePoints=[], pending=false;
let chipScene, heroScene;
let somaChip;
const icon=n=>`<i class="fa-solid fa-${n}" aria-hidden="true"></i>`;
const buttonText=(el,text,name)=>{el.innerHTML=`${name?icon(name)+' ':''}${text}`;};
const nf=n=>new Intl.NumberFormat('es-CO').format(n);
const toast=msg=>{ $('#toast').textContent=msg; gsap.killTweensOf('#toast');gsap.fromTo('#toast',{opacity:1},{opacity:0,delay:3,duration:.4}); };
const chapters=[
 {title:'Superar los límites humanos',label:'ORIGEN',keys:['life','lifeGain'],text:'La tecnología extendió la vida. Cada versión de NEXUS prometía más tiempo para seguir siendo nosotros.',note:'El archivo compara 70, 120, 180 y 250 años de vida promedio.'},
 {title:'Construir un nuevo cuerpo',label:'ORIGEN',keys:['soma','transfers'],text:'Los cuerpos SOMA hicieron posible la transferencia. La disponibilidad de cuerpos y el uso del sistema aumentaron.',note:'La escala de SOMA disponibles corresponde al archivo original; no se equipara al total de transferencias.'},
 {title:'¿Qué nos hace ser nosotros?',label:'ORIGEN',keys:['storage'],text:'Memoria. Conciencia. Habilidades. Personalidad. NEXUS evolucionó hasta almacenar los cuatro módulos de una identidad.',note:'Explora los módulos en el implante al final del recorrido.'},
 {title:'Perfeccionar la transferencia',label:'EXPANSIÓN',keys:['time','transfail','timeReduction'],text:'El proceso pasó de 48 a 6 meses. La mayoría de las transferencias se completaba con éxito, aunque el riesgo nunca desapareció.',note:'92,2% exitosas y 7,8% fallidas en la distribución del archivo.'},
 {title:'Una sociedad conectada',label:'EXPANSIÓN',keys:['integration'],text:'Nueve de cada diez humanos estaban integrados con NEXUS. La sociedad había confiado su futuro a una misma red.',note:'90% con NEXUS. 10% sin NEXUS.'},
 {title:'La aparición de ET3RNITY',label:'CONTAGIO',keys:['virus','territory'],text:'Los casos aislados se convirtieron en millones. El sistema que protegía la identidad también conectaba a sus víctimas.',note:'De 1 a 30 millones de casos registrados entre 2617 y 2620.'},
 {title:'Cuando los recuerdos se apagan',label:'COLAPSO',keys:['mortality','deaths'],text:'El virus alteraba los módulos hasta borrar la identidad. Cuando NEXUS colapsaba, el cuerpo SOMA dejaba de vivir.',note:'El archivo registra 6 millones de SOMAS fallecidos en 2620.'}
];
const charts=createChartRenderer({isReduced:()=>reduced});
const chartInsights={
 life:['Antes de Nexus → Nexus estable','+180 años'],soma:['Máximo registrado','230 SOMA'],transfers:['Año 2580','245 M de transferencias'],time:['Nexus estable','6 meses'],storage:['Nexus estable','4 módulos'],virus:['Año 2620','30 M de casos'],deaths:['Año 2620','6.000.000 fallecidos'],
 lifeGain:['NEXUS estable frente al inicio',`+${data.lifeGain.values.at(-1)} años`],
 timeReduction:['Tiempo ahorrado en NEXUS estable',formatChartValue(data.timeReduction.values.at(-1),'%')]
};
const stationsEl=$('#stations'),stationViews=[];
const selectorTitle=key=>({integration:'Humanos con Nexus',lifeGain:'Años de vida ganados',timeReduction:'Tiempo ahorrado',territory:'Alcance territorial'}[key]??chartTitle(key));
chapters.forEach((s,i)=>{
 const a=document.createElement('article');a.className='station locked';a.dataset.index=i;a.id=i===3?'expansion':i===5?'colapso':`station-${i}`;a.setAttribute('aria-labelledby',`station-title-${i}`);
 a.innerHTML=`<span class="station-anchor"></span><div class="station-charts"></div><div class="station-caption"><span class="station-number">${String(i+1).padStart(2,'0')} / ${s.label}</span><h3 id="station-title-${i}">${s.title}</h3><p class="station-story">${s.text}</p></div>`;
 stationsEl.append(a);
 const wrap=a.querySelector('.station-charts'),nav=document.createElement('div'),card=document.createElement('button');
 nav.className='station-chart-nav';nav.setAttribute('role','group');nav.setAttribute('aria-label',`Gráficos de ${s.title}`);nav.hidden=s.keys.length<2;
 card.className='chart-preview chart-card';wrap.append(nav,card);
 const view={key:null,select(key){
  if(!s.keys.includes(key)||view.key===key)return;
  const previous=card.querySelector('.chart-plot');if(previous)charts.destroy(previous);
  const d=data[key];view.key=key;card.dataset.chart=key;card.setAttribute('aria-label',`${i<unlocked?'Ampliar':'Desbloquear'}: ${d.title}`);
  card.innerHTML=`<span class="card-head"><span><span class="chart-tag">${d.tag}</span><span class="chart-card-title">${d.title}</span></span><span class="chart-expand" aria-hidden="true">${icon('arrow-up-right-from-square')}</span></span><span class="chart-card-description">${d.description}</span><span class="preview-canvas chart-plot"></span>${chartInsights[key]?`<span class="chart-insight">${chartInsights[key][0]} <strong>${chartInsights[key][1]}</strong></span>`:''}<span class="lock-overlay"><b>${icon('lock')}</b>ACERCA SOMA PARA DESBLOQUEAR</span>`;
  nav.querySelectorAll('button').forEach(button=>{const selected=button.dataset.chart===key;button.classList.toggle('active',selected);button.setAttribute('aria-pressed',String(selected));});
  charts.draw(card.querySelector('.preview-canvas'),key,{preview:true});
 }};
 stationViews[i]=view;
 s.keys.forEach(key=>{const button=document.createElement('button');button.type='button';button.dataset.chart=key;button.textContent=selectorTitle(key);button.onclick=()=>view.select(key);nav.append(button);});
 view.select(s.keys[0]);
 card.onclick=()=>{if(i>=unlocked){if(!connected){toast('Primero conecta el implante a SOMA.');$('#inicio').scrollIntoView({behavior:reduced?'instant':'smooth'});return;}if(i===unlocked)advance();else toast('Acompaña a SOMA por las estaciones anteriores.');}else openChart(i,view.key);};
});
let currentStation=0;
function highlightChartValue(index){$$('#chartValues .data-pill').forEach((pill,i)=>pill.classList.toggle('is-active',i===index));}
function openChart(index,key=stationViews[index].key){
 stationViews[index].select(key);currentStation=index;const d=data[key],s=chapters[index];$('#chartTag').textContent=d.tag;$('#chartTitle').textContent=d.title;$('#chartDescription').textContent=d.description;
 $$('.chart-card').forEach(card=>card.classList.toggle('active',card.dataset.chart===key));
 $('#chartSwitch').replaceChildren();$('#chartSwitch').hidden=s.keys.length<2;
 s.keys.forEach(k=>{const b=document.createElement('button');b.textContent=selectorTitle(k);b.className=k===key?'active':'';b.setAttribute('aria-pressed',String(k===key));b.onclick=()=>openChart(index,k);$('#chartSwitch').append(b);});
 const pills=d.labels.map((label,i)=>{const pill=document.createElement('div');pill.className='data-pill';pill.dataset.index=i;const name=document.createElement('span'),value=document.createElement('strong');name.textContent=label;value.textContent=formatChartValue(d.values[i],d.unit);pill.append(name,value);return pill;});$('#chartValues').replaceChildren(...pills);
 if(!$('#chartDialog').open)$('#chartDialog').showModal();charts.draw($('#largeChart'),key,{onHover:highlightChartValue,playback:$('#chartPlayback')});
}
$('#chartDialog').addEventListener('close',()=>{charts.destroy($('#largeChart'));highlightChartValue(null);$$('.chart-card').forEach(card=>card.classList.remove('active'));});
$('#closeChart').onclick=()=>$('#chartDialog').close();$('#chartDialog').addEventListener('click',e=>{if(e.target===$('#chartDialog')){const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();}});
function routeLayout(){const jr=$('#journey').getBoundingClientRect();routePoints=$$('.station-anchor').map(n=>{const r=n.getBoundingClientRect();return{x:r.left-jr.left+r.width/2,y:r.top-jr.top+r.height/2};});const paths=[];routePoints.forEach((p,i)=>{if(!i){paths.push(`M${p.x} ${p.y-65} L${p.x} ${p.y}`);return;}const prev=routePoints[i-1];paths.push(`C${prev.x} ${prev.y+80},${p.x} ${p.y-80},${p.x} ${p.y}`);});$('#route').setAttribute('viewBox',`0 0 ${jr.width} ${jr.height}`);$('#routeBase').setAttribute('d',paths.join(' '));$('#routeProgress').setAttribute('d',paths.slice(0,unlocked).join(' '));if(!pending){const p=routePoints[Math.max(0,unlocked-1)];gsap.set('#somaTraveler',{left:p.x-34,top:p.y-36-(unlocked===0?65:0)});}}
requestAnimationFrame(routeLayout);new ResizeObserver(routeLayout).observe(stationsEl);
function moveTraveler(index,complete){
 const end=routePoints[index],start=index===0?{x:end.x,y:end.y-65}:routePoints[index-1];const state={t:0};const walker=$('#somaTraveler');walker.classList.add('walking');walker.classList.toggle('facing-left',end.x<start.x);
 gsap.to(state,{t:1,duration:reduced?0:index===0?.8:1.8,ease:'power1.inOut',onUpdate:()=>{const t=state.t,u=1-t;const x=u*u*u*start.x+3*u*u*t*start.x+3*u*t*t*end.x+t*t*t*end.x;const y=u*u*u*start.y+3*u*u*t*(start.y+80)+3*u*t*t*(end.y-80)+t*t*t*end.y;gsap.set(walker,{left:x-34,top:y-36});},onComplete:()=>{walker.classList.remove('walking');if(!reduced)gsap.fromTo(walker.querySelector('svg'),{y:-9},{y:0,duration:.5,ease:'bounce.out'});complete();}});
}
function advance(){if(!connected){toast('Conecta el chip a SOMA para comenzar.');$('#inicio').scrollIntoView({behavior:reduced?'instant':'smooth'});return;}if(pending)return;if(unlocked>=chapters.length){$('#mapa').scrollIntoView({behavior:reduced?'instant':'smooth'});return;}const i=unlocked,p=routePoints[i];pending=true;const target=$$('.station')[i];target.scrollIntoView({behavior:reduced?'instant':'smooth',block:'center'});moveTraveler(i,()=>{unlocked++;target.classList.replace('locked','unlocked');charts.refresh(target.querySelector('.chart-plot'));target.querySelectorAll('.chart-preview').forEach(card=>card.setAttribute('aria-label',`Ampliar: ${chartTitle(card.dataset.chart)}`));$('#progressText').textContent=`${unlocked} / 7 ESTACIONES`;buttonText($('#nextStation'),unlocked===7?'Explorar mapa':'Avanzar con SOMA','arrow-right');buttonText($('#systemStatus'),unlocked>=6?'ET3RNITY DETECTADO':'SOMA CONECTADO',unlocked>=6?'triangle-exclamation':'circle');$('#systemStatus').style.color=unlocked>=6?'var(--danger)':'var(--lime)';pending=false;routeLayout();if(!reduced)gsap.fromTo(target.querySelector('.chart-preview'),{opacity:.3,y:15},{opacity:1,y:0,duration:.7});toast(`Archivo ${String(i+1).padStart(2,'0')} desbloqueado`);});}
$('#nextStation').onclick=advance;
let travelerDrag=null,ignoreTravelerClick=false;
$('#somaTraveler').addEventListener('pointerdown',e=>{if(!connected||pending)return;travelerDrag={x:e.clientX,y:e.clientY,moved:false};e.currentTarget.setPointerCapture(e.pointerId);});
$('#somaTraveler').addEventListener('pointermove',e=>{if(!travelerDrag)return;if(Math.hypot(e.clientX-travelerDrag.x,e.clientY-travelerDrag.y)>8)travelerDrag.moved=true;if(!travelerDrag.moved)return;$('#somaTraveler').classList.add('dragging');const r=$('#journey').getBoundingClientRect();gsap.set('#somaTraveler',{left:e.clientX-r.left,top:e.clientY-r.top});if(e.clientY>innerHeight-80)window.scrollBy(0,13);if(e.clientY<90)window.scrollBy(0,-13);});
$('#somaTraveler').addEventListener('pointerup',e=>{if(!travelerDrag)return;const moved=travelerDrag.moved;travelerDrag=null;$('#somaTraveler').classList.remove('dragging');if(moved){ignoreTravelerClick=true;const target=$$('.station')[unlocked];if(target){const r=target.getBoundingClientRect();if(e.clientX>r.left-100&&e.clientX<r.right+70&&e.clientY>r.top-100&&e.clientY<r.bottom+70)advance();else{routeLayout();toast('Lleva SOMA a la siguiente estación o haz clic para avanzar.');}}else routeLayout();}});$('#somaTraveler').addEventListener('pointercancel',()=>{travelerDrag=null;$('#somaTraveler').classList.remove('dragging');routeLayout();});$('#somaTraveler').onclick=()=>{if(ignoreTravelerClick){ignoreTravelerClick=false;return;}advance();};
let chipPointer=null,chipMoved=false,dragGhost=null;
function socketPoint(){
 if(heroScene?.socketPoint)return heroScene.socketPoint();const r=$('#heroStage').getBoundingClientRect();return{x:r.left+r.width*.52,y:r.top+r.height*.34};
}
function chipGhost(x,y){if(!dragGhost){dragGhost=document.createElement('img');dragGhost.src='assets/nexus.svg';dragGhost.alt='';dragGhost.className='chip-insertion-ghost';document.body.append(dragGhost);}dragGhost.style.left=`${x}px`;dragGhost.style.top=`${y}px`;return dragGhost;}
function clearChipDrag(){dragGhost?.remove();dragGhost=null;$('#chipDrag').classList.remove('dragging-chip');$('#dropTarget').classList.remove('socket-hot');heroScene?.socketHover?.(false);if(heroScene)heroScene.controls.enableRotate=true;}
function finishConnection(){
 connected=true;connecting=false;clearChipDrag();$('#dropTarget').hidden=true;buttonText($('#connect'),'Comenzar recorrido','arrow-down');$('#chipDrag').classList.add('connected');$('#chipDrag').disabled=true;$('#chipDrag>span').innerHTML=`NEXUS / 04<br><small>${icon('check')} IMPLANTE INSERTADO</small>`;$('#connectionHint').textContent='Chip insertado en la ranura del cuello. Comienza el recorrido con SOMA.';$('.stage-label span').textContent='CUERPO RECEPTOR / NEXUS CONECTADO';buttonText($('#systemStatus'),'SOMA CONECTADO','circle');buttonText($('#nextStation'),'Avanzar con SOMA','arrow-right');toast('NEXUS insertado. El recorrido está listo.');
}
function connect(){
 if(connected){$('#origen').scrollIntoView({behavior:reduced?'instant':'smooth'});return;}if(connecting)return;if(heroScene?.loading){toast('SOMA se está preparando. Espera un momento.');return;}connecting=true;heroScene?.socketHover?.(true);if(heroScene)heroScene.controls.enableRotate=false;
 const source=$('#chipDrag img').getBoundingClientRect(),point=socketPoint();const ghost=dragGhost??chipGhost(source.left+source.width/2,source.top+6);$('#chipDrag').classList.add('dragging-chip');$('#connectionHint').textContent='Alineando el conector con la ranura del cuello…';
 gsap.to(ghost,{left:point.x,top:point.y,width:18,height:34,duration:reduced?0:.55,ease:'power2.inOut',onComplete:()=>{ghost.style.opacity='0';if(heroScene?.dock)heroScene.dock(finishConnection);else{heroScene?.connect?.();finishConnection();}}});
}
$('#connect').onclick=connect;$('#chipDrag').onclick=()=>{if(chipMoved){chipMoved=false;return;}connect();};
$('#chipDrag').onpointerdown=e=>{if(connected||connecting)return;chipPointer={x:e.clientX,y:e.clientY};chipMoved=false;e.currentTarget.setPointerCapture(e.pointerId);};
$('#chipDrag').onpointermove=e=>{if(!chipPointer||connecting)return;chipMoved ||=Math.hypot(e.clientX-chipPointer.x,e.clientY-chipPointer.y)>8;if(!chipMoved)return;chipGhost(e.clientX,e.clientY);$('#chipDrag').classList.add('dragging-chip');if(heroScene)heroScene.controls.enableRotate=false;const p=socketPoint(),near=Math.hypot(e.clientX-p.x,e.clientY-p.y)<=48;$('#dropTarget').classList.toggle('socket-hot',near);heroScene?.socketHover?.(near);$('#connectionHint').textContent=near?'Suelta el chip para insertarlo.':'Lleva el conector del chip a la ranura del cuello.';};
$('#chipDrag').onpointerup=e=>{if(!chipPointer)return;chipPointer=null;if(chipMoved){const p=socketPoint();if(Math.hypot(e.clientX-p.x,e.clientY-p.y)<=48)connect();else{clearChipDrag();$('#connectionHint').textContent='Acerca el conector a la ranura del cuello o pulsa Conectar implante.';toast('El chip se inserta en la ranura del cuello.');}}};
$('#chipDrag').onpointercancel=()=>{chipPointer=null;if(!connecting)clearChipDrag();};
function setReduced(v){reduced=v;document.body.classList.toggle('no-motion',v);$('#reduced').setAttribute('aria-pressed',String(v));buttonText($('#reduced'),v?'Movimiento reducido':'Movimiento','person-walking');charts.syncMotion();}setReduced(reduced);$('#reduced').onclick=()=>setReduced(!reduced);
// 3D scenes share the same animation loop and stop rendering offscreen.
const scenes=[];
function makeScene(el){const scene=new THREE.Scene();const camera=new THREE.PerspectiveCamera(35,1,.1,100);const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.setPixelRatio(Math.min(devicePixelRatio,1.65));renderer.setClearColor(0,0);renderer.localClippingEnabled=true;el.prepend(renderer.domElement);const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.enablePan=false;controls.minDistance=3;controls.maxDistance=15;scene.add(new THREE.HemisphereLight(0xf7fff2,0x24332a,2.5));const l=new THREE.DirectionalLight(0xffffff,3.5);l.position.set(3,5,4);scene.add(l);const rim=new THREE.DirectionalLight(0xc4f078,2);rim.position.set(-4,2,-3);scene.add(rim);const entry={el,scene,camera,renderer,controls,visible:false,update:()=>{}};new IntersectionObserver(([e])=>entry.visible=e.isIntersecting,{rootMargin:'100px'}).observe(el);new ResizeObserver(()=>{const w=el.clientWidth,h=el.clientHeight;camera.aspect=w/h;camera.updateProjectionMatrix();renderer.setSize(w,h);}).observe(el);scenes.push(entry);return entry;}
function mesh(geo,mat,parent,x=0,y=0,z=0){const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);parent.add(m);return m;}
try{heroScene=makeScene($('#heroStage'));heroScene.camera.position.set(2.7,.45,7.4);heroScene.controls.target.set(0,-.15,0);heroScene.controls.enableZoom=false;const model=createSoma();heroScene.loading=true;$('#connect').disabled=true;$('#chipDrag').disabled=true;$('#heroStage').classList.add('soma-loading');model.ready.then(()=>{heroScene.loading=false;$('#connect').disabled=false;$('#chipDrag').disabled=connected;$('#heroStage').classList.remove('soma-loading');}).catch(e=>{console.error(e);$('#heroStage').classList.add('soma-error');toast('No se pudo cargar SOMA. Recarga la página para intentarlo de nuevo.');});somaChip=model.chip;heroScene.scene.add(model.g);model.g.rotation.y=-.10;const ring=mesh(new THREE.TorusGeometry(1.05,.008,8,100),new THREE.MeshBasicMaterial({color:0x71885c}),heroScene.scene,0,-2.29,0);ring.rotation.x=Math.PI/2;const count=160,pos=new Float32Array(count*3);for(let i=0;i<count;i++){pos[i*3]=(Math.random()-.5)*5;pos[i*3+1]=(Math.random()-.5)*5;pos[i*3+2]=(Math.random()-.5)*4;}const geom=new THREE.BufferGeometry();geom.setAttribute('position',new THREE.BufferAttribute(pos,3));const particles=new THREE.Points(geom,new THREE.PointsMaterial({color:0xc4f078,size:.022,transparent:true,opacity:.8}));particles.visible=false;heroScene.scene.add(particles);let greeting;
 heroScene.connect=()=>{model.chip.visible=true;particles.visible=true;if(!reduced){greeting?.kill();greeting=gsap.timeline();greeting.to(model.motion,{energy:1,duration:.3}).to(model.motion,{energy:0,duration:.6,ease:'bounce.out'}).to(model.motion,{wave:1,duration:.5},.25).to(model.motion,{wave:0,duration:.5},2.5).to(model.motion,{walk:.4,duration:.4},.3).to(model.motion,{walk:0,duration:.5},2.5);}};
 let heroPointer;heroScene.renderer.domElement.addEventListener('pointerdown',e=>heroPointer={x:e.clientX,y:e.clientY});heroScene.renderer.domElement.addEventListener('pointerup',e=>{if(connected&&heroPointer&&Math.hypot(e.clientX-heroPointer.x,e.clientY-heroPointer.y)<7)heroScene.connect();});
 heroScene.socketHover=model.socketHover;
 heroScene.socketPoint=()=>{model.g.updateMatrixWorld(true);heroScene.camera.updateMatrixWorld();const v=model.socketAnchor.getWorldPosition(new THREE.Vector3());v.project(heroScene.camera);const r=$('#heroStage').getBoundingClientRect();return{x:r.left+(v.x*.5+.5)*r.width,y:r.top+(-v.y*.5+.5)*r.height};};
 heroScene.dock=done=>{model.chip.visible=true;model.chip.position.copy(model.chipHome).add(new THREE.Vector3(0,0,.32));gsap.to(model.chip.position,{z:model.chipHome.z,duration:reduced?0:.4,ease:'power2.in',onComplete:()=>{heroScene.connect();done();}});};
 heroScene.update=t=>{model.pose(t,{reduced:reduced||connecting,active:connected});if(!reduced)particles.rotation.y=t*.07;const point=heroScene.socketPoint(),r=$('#heroStage').getBoundingClientRect();$('#dropTarget').style.left=`${point.x-r.left}px`;$('#dropTarget').style.top=`${point.y-r.top}px`;};


}catch(e){console.warn('3D unavailable',e);$('#heroStage').insertAdjacentHTML('afterbegin','<div class="fallback-soma"><i class="fa-solid fa-person" aria-hidden="true"></i></div>');toast('El modo 3D no está disponible en este navegador. El recorrido y los datos siguen activos.');}
const inspector=initInspector({makeScene,isReduced:()=>reduced,toast});chipScene=inspector.scene;
let finalPlayed=false;new IntersectionObserver(([e])=>{if(e.isIntersecting&&!finalPlayed&&connected&&heroScene&&chipScene){finalPlayed=true;
 const floating=document.createElement('img');floating.src='assets/nexus.svg';floating.alt='';floating.className='chip-art extracted-chip';Object.assign(floating.style,{position:'fixed',left:'50%',top:'18%',zIndex:'40',pointerEvents:'none'});document.body.append(floating);if(somaChip)somaChip.visible=false;
 const r=$('#chipStage').getBoundingClientRect();gsap.to(floating,{left:r.left+r.width/2,top:r.top+r.height/2,scale:1.6,opacity:0,duration:reduced?0:1.3,onComplete:()=>{floating.remove();toast('Implante extraído: explora los módulos de NEXUS.');inspector.extract();}});}},{threshold:.2}).observe($('#anatomia'));
function animate(time){requestAnimationFrame(animate);for(const s of scenes){if(!s.visible||document.hidden)continue;s.controls.update();s.update(time*.001);s.renderer.render(s.scene,s.camera);}}requestAnimationFrame(animate);
// Local SVG reconstructed from the 38-zone reference drawing.
// Region names and contagion conditions retain the original archive's mapping.
fetch('./assets/territorial-map.svg').then(r=>{
 if(!r.ok)throw Error('Mapa no disponible');
 return r.text();
}).then(source=>{
 const drawing=new DOMParser().parseFromString(source,'image/svg+xml');
 if(drawing.querySelector('parsererror'))throw Error('SVG de mapa no válido');
 const map=$('#usMap'),svg=drawing.documentElement;
 map.setAttribute('viewBox',svg.getAttribute('viewBox'));
 map.replaceChildren(...Array.from(svg.children,node=>document.importNode(node,true)));
 map.setAttribute('aria-labelledby','territoryTitle territoryDescription');
 const regions=Array.from(map.querySelectorAll('.map-region'));
 regions.forEach(p=>{
  const name=p.dataset.name,healthy=p.dataset.condition==='healthy';
  const status=healthy?'Sin contagio':'Con contagio';
  const showState=()=>{
   $('#stateInfo .eyebrow').textContent=`${p.dataset.abbr} / ESTADO SELECCIONADO`;
   $('#stateInfo h3').textContent=name;
   $('#stateInfo>p:not(.eyebrow)').textContent=status;
   $('#stateInfo h3').style.color=healthy?'#c4f078':'#f17878';
  };
  const select=()=>{
   regions.forEach(region=>{
    region.classList.toggle('selected',region===p);
    region.setAttribute('aria-pressed',String(region===p));
   });
   showState();
  };
  p.addEventListener('pointerenter',showState);
  p.addEventListener('focus',showState);
  p.addEventListener('click',select);
  p.addEventListener('keydown',e=>{
   if(e.key==='Enter'||e.key===' '){e.preventDefault();select();}
  });
 });
}).catch(e=>{
 $('#usMap').insertAdjacentHTML('afterend','<p>No se pudo cargar el mapa. Recarga la página para intentarlo de nuevo.</p>');
 console.error(e);
});
$('#handToggle').onclick=()=>{const b=$('#handToggle'),v=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',v);buttonText(b,v?'Mano SOMA activa':'Activar mano SOMA','hand-pointer');$('.map-surface').classList.toggle('hand-mode',v);};
