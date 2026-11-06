import * as THREE from './vendor/three.module.js';
import {createNexus,MODULES,COMPONENTS,MODULE_PARTS,USB_PARTS} from './artifact.js';
const $=s=>document.querySelector(s),fa=n=>`<i class="fa-solid fa-${n}" aria-hidden="true"></i>`;
const PART_ICONS={shell:'shield-halved',receiver:'download',link:'link',copper:'diagram-project',core:'microchip',lens:'lightbulb'};
export function initInspector({makeScene,isReduced,toast}){
 let scene,artifact,mode='explosion',selected=0,selectedPart=null,tween,firstPlayed=false,pointer,dragged=false,zoomFit;
 let notes=[],selectedNote=null;
 const amount={v:100},hotspots=[],originalMaterials=new Map();
 const titles={explosion:'Selecciona una pieza',disassembly:'Explora sus componentes',cut:'Dentro del conector',transparency:'Dentro del cerebro',zoom:'Acercamiento'};
 const help={explosion:'Selecciona el conector para ver el corte, el cerebro para ver su interior o un módulo para abrir su despiece.',disassembly:'Cada componente está señalado y descrito. Toca una pieza para acercarte y conocer su función.',cut:'El corte lateral muestra la conexión de cables y los componentes de conexión.',transparency:'El cerebro muestra las cuatro categorías de elementos del SOMA.',zoom:'Gira el componente o ajusta el acercamiento. Vuelve al módulo para seleccionar otra pieza.'};
 const brainDescription='Cada elemento es analizado y categorizado en el cerebro. Se evalúan su compatibilidad y estabilidad antes de transferirlo a los módulos.';
 const stage=$('#chipStage'),svgNS='http://www.w3.org/2000/svg',leaders=document.createElementNS(svgNS,'svg');
 leaders.classList.add('chip-leaders');leaders.setAttribute('aria-hidden','true');stage.append(leaders);
 try{
  scene=makeScene(stage);scene.controls.minDistance=.12;scene.controls.maxDistance=25;artifact=createNexus();scene.scene.add(artifact.g);scene.camera.position.set(1.7,.5,17);scene.controls.target.set(0,-.3,0);
  artifact.parts.forEach(p=>{const m=p.mesh.material;if(m.emissive&&!originalMaterials.has(m))originalMaterials.set(m,{color:m.emissive.clone(),intensity:m.emissiveIntensity});});
 }catch(e){console.warn('Inspector unavailable',e);stage.insertAdjacentHTML('afterbegin','<img class="artifact-fallback" src="assets/nexus.svg" alt="Chip de reencarnación"><p class="fallback-note">Vista 3D no disponible. Las señalizaciones permiten consultar las piezas.</p>');}
 function text(title,body){$('#moduleTitle').textContent=title;$('#moduleText').textContent=body;}
 function generalNotes(){return Object.entries(COMPONENTS).map(([id,[title,body]])=>({id,title,body,icon:{usb:'scissors',cables:'diagram-project',brain:'eye',modules:'layer-group',life:'battery-half'}[id]}));}
 function cutNotes(){return Object.entries(USB_PARTS).map(([id,[title,body]])=>({id,title,body,icon:id==='cable-link'?'bolt':'plug'}));}
 function brainNotes(){return MODULES.map((m,i)=>({id:'category-'+i,title:m.name,body:m.items.join(' · '),icon:'brain',color:m.color}));}
 function moduleBody(key){return MODULE_PARTS[key][1];}
 function moduleNotes(){return Object.entries(MODULE_PARTS).map(([key,[title]])=>({id:'part-'+key,title,body:moduleBody(key),icon:PART_ICONS[key]}));}
 function details(items){
  notes=items;const ul=document.createElement('ul');ul.className='detail-list reference-details';
  notes.forEach(n=>{
   const li=document.createElement('li'),strong=document.createElement('strong'),body=document.createElement('span');
   li.id='inspector-note-'+n.id;li.dataset.note=n.id;strong.innerHTML=fa(n.icon);strong.append(document.createTextNode(' '+n.title));
   if(n.color!==undefined){strong.style.setProperty('--part-color','#'+n.color.toString(16).padStart(6,'0'));strong.classList.add('has-color');}
   body.textContent=n.body;li.append(strong,body);ul.append(li);
  });$('#viewDetails').replaceChildren(ul);
 }
 function emphasize(id){
  $('#viewDetails').querySelectorAll('[data-note]').forEach(n=>n.classList.toggle('is-active',n.dataset.note===id));
  hotspots.forEach(h=>{const active=h.id===id;h.button.classList.toggle('is-active',active);h.line.classList.toggle('is-active',active);h.dot.classList.toggle('is-active',active);});
 }
 function showNote(id){if(!notes.some(n=>n.id===id))return;selectedNote=id;emphasize(id);}
 function info(){
  selectedNote=null;$('#viewName').textContent=titles[mode];$('#viewHelp').textContent=help[mode];$('#inspectorBack').hidden=mode==='explosion';$('#inspectorBack').innerHTML=`${fa('arrow-left')} ${mode==='zoom'?'Volver al módulo':'Volver a la explosión'}`;
  $('#explosionControls').hidden=mode!=='explosion';$('#disassemblyControls').hidden=mode!=='disassembly';$('#zoomControls').hidden=mode!=='zoom';
  if(mode==='explosion'){text('Chip de Reencarnación, alias NEXUS','Las cinco partes del chip, según el instructivo.');details(generalNotes());}
  else if(mode==='cut'){text('Corte del conector USB','La apertura lateral permite ver las dos partes señaladas en el instructivo.');details(cutNotes());}
  else if(mode==='transparency'){text('Cerebro',brainDescription);details(brainNotes());}
  else if(mode==='disassembly'){text('Despiece del módulo',MODULES[selected].name+' · '+MODULES[selected].items.join(' · '));details(moduleNotes());}
  else{text(MODULE_PARTS[selectedPart][0],moduleBody(selectedPart));details([]);}
  hotspots.forEach(h=>{const n=notes.find(n=>n.id===h.id);setVisible(h,h.visible());if(n){h.button.setAttribute('aria-describedby','inspector-note-'+n.id);}else h.button.removeAttribute('aria-describedby');});
  $('#viewDetails').scrollTop=0;emphasize(selectedNote);if(selectedNote)showNote(selectedNote);stage.dataset.view=mode;if(!scene)layoutFallback();
 }
 function clearHighlight(){originalMaterials.forEach((v,m)=>{m.emissive.copy(v.color);m.emissiveIntensity=v.intensity;});}
 function apply(){if(!artifact)return;clearHighlight();if(mode==='explosion')artifact.explode(amount.v);else if(mode==='cut')artifact.cutaway();else if(mode==='transparency')artifact.transparency();else artifact.detailModule(selected,mode==='zoom'?100:amount.v);artifact.g.scale.setScalar(+$('#chipScale').value/100);}
 function fitPart(){if(!scene||!artifact||!selectedPart)return;artifact.g.updateMatrixWorld(true);const box=new THREE.Box3();artifact.modules[selected].parts.filter(p=>p.detail===selectedPart).forEach(p=>{p.mesh.geometry.computeBoundingBox();box.union(p.mesh.geometry.boundingBox.clone().applyMatrix4(p.mesh.matrixWorld));});const size=box.getSize(new THREE.Vector3()),center=box.getCenter(new THREE.Vector3());const tan=Math.tan(THREE.MathUtils.degToRad(scene.camera.fov/2));const dist=Math.max(.42,Math.max(size.y/(2*tan),size.x/(2*tan*scene.camera.aspect))*1.35+size.z*.6);zoomFit={center,dist};}
 function frame(){if(!scene)return;gsap.killTweensOf(scene.camera.position);const aspect=scene.camera.aspect||1,scale=+$('#chipScale').value/100;let target=new THREE.Vector3(0,mode==='explosion'?-.3:0,0),pos;
  if(mode==='zoom'){fitPart();target=zoomFit.center;const dist=zoomFit.dist*(1.6-(+$('#zoomRange').value)/100*.9);pos=target.clone().add(new THREE.Vector3(dist*.13,dist*.07,dist));}
  else{const d=(mode==='explosion'?17:mode==='cut'?3.4:mode==='transparency'?4.2:4)*Math.max(.85,scale)*(mode==='explosion'?1:Math.max(1,.64/aspect));pos=mode==='cut'?new THREE.Vector3(d,.08,.08):new THREE.Vector3(mode==='explosion'?1.7:.28,mode==='explosion'?.5:.1,d);}
  scene.controls.target.copy(target);gsap.to(scene.camera.position,{x:pos.x,y:pos.y,z:pos.z,duration:isReduced()?0:.7,ease:'power2.inOut'});
 }
 function sync(){ $('#explode').value=mode==='explosion'?amount.v:100;$('#explodeValue').value=`${Math.round(+$('#explode').value)}%`;$('#disassembly').value=mode==='disassembly'?amount.v:100;$('#disassemblyValue').value=`${Math.round(+$('#disassembly').value)}%`;}
 function setMode(next,{index=selected,part=null,animate=true}={}){const active=document.activeElement,restoreFocus=active?.classList?.contains('chip-hotspot')||active===$('#inspectorBack');tween?.kill();selected=index;selectedPart=part;mode=next;$('#chipTooltip').hidden=true;amount.v=100;info();if(['explosion','disassembly'].includes(mode)&&animate&&!isReduced()){amount.v=0;apply();tween=gsap.to(amount,{v:100,duration:mode==='explosion'?2.2:1.6,ease:'power2.inOut',onUpdate:()=>{apply();sync();}});}else apply();sync();frame();if(restoreFocus){const node=mode==='explosion'?hotspots.find(h=>h.visible())?.button:$('#inspectorBack');node?.focus({preventScroll:true});}}
 function openPart(key){if(MODULE_PARTS[key])setMode('zoom',{part:key,animate:false});}
 function componentInfo(key){if(mode==='explosion')showNote(key);}
 function representative(detail){const ps=artifact?.modules[selected].parts.filter(p=>p.detail===detail);if(!ps?.length)return null;return ps[detail==='shell'?ps.length-1:Math.floor(ps.length/2)].mesh;}
 function meshFor(detail){return artifact?.parts.find(p=>p.detail===detail)?.mesh;}
 function addHotspot({id,icon,label,title,side=0,visible,target,click,fallback}){
  const button=document.createElement('button'),line=document.createElementNS(svgNS,'polyline'),dot=document.createElementNS(svgNS,'circle');
  button.className='chip-hotspot chip-annotation';button.dataset.hotspot=id;button.setAttribute('aria-label',title);button.setAttribute('aria-controls','moduleTitle moduleText viewDetails');button.innerHTML=`${fa(icon)}<span class="annotation-label">${label}</span>`;
  button.onclick=e=>{e.stopPropagation();if(!button.hidden&&!button.disabled)click();};button.onmouseenter=button.onfocus=()=>{if(!button.hidden)emphasize(id);};button.onmouseleave=button.onblur=()=>emphasize(selectedNote);
  line.classList.add('annotation-line');dot.classList.add('annotation-dot');dot.setAttribute('r','2.5');leaders.append(line,dot);stage.append(button);hotspots.push({id,button,line,dot,side,visible,target,fallback});
 }
 addHotspot({id:'usb',icon:'scissors',label:'Conector USB',title:'Conector USB · Abrir corte lateral',side:0,visible:()=>mode==='explosion',target:()=>artifact?.groups.usb.g,click:()=>setMode('cut'),fallback:[50,15]});
 addHotspot({id:'cables',icon:'diagram-project',label:'Cables',title:'Cables de enlace · Consultar descripción',side:0,visible:()=>mode==='explosion',target:()=>meshFor('wire'),click:()=>componentInfo('cables'),fallback:[50,30]});
 addHotspot({id:'brain',icon:'eye',label:'Cerebro',title:'Cerebro · Revelar interior',side:1,visible:()=>mode==='explosion',target:()=>artifact?.groups.brain.g,click:()=>setMode('transparency'),fallback:[50,42]});
 addHotspot({id:'modules',icon:'layer-group',label:'Módulos',title:'Módulos · Abrir despiece',side:1,visible:()=>mode==='explosion',target:()=>artifact?.groups.modules.g,click:()=>setMode('disassembly'),fallback:[50,68]});
 addHotspot({id:'life',icon:'battery-half',label:'Vida',title:'Indicador de vida · Consultar descripción',side:0,visible:()=>mode==='explosion',target:()=>artifact?.groups.life.g,click:()=>componentInfo('life'),fallback:[50,88]});
 Object.entries(MODULE_PARTS).forEach(([key,[name]],i)=>addHotspot({id:'part-'+key,icon:'magnifying-glass-plus',label:{shell:'Carcasa',receiver:'Receptores',link:'Enlace',copper:'Cobre',core:'Núcleo',lens:'Lente'}[key],title:name+' · Acercar',side:i%2,visible:()=>mode==='disassembly',target:()=>representative(key),click:()=>openPart(key),fallback:[50,15+i*12]}));
 cutNotes().forEach((n,i)=>addHotspot({id:n.id,icon:n.icon,label:i===0?'Conexión de cables':'Componentes',title:n.title+' · Consultar descripción',side:i,visible:()=>mode==='cut',target:()=>i===0?meshFor('cable-link'):artifact?.usbContacts,click:()=>showNote(n.id),fallback:[50,30+i*30]}));
 function visibleParts(){return artifact.parts.filter(p=>{if(mode==='transparency'&&p.detail==='brain-front')return false;let n=p.mesh;while(n){if(!n.visible)return false;n=n.parent;}return true;});}
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();
 function pick(e){if(!scene||!artifact)return null;const r=scene.renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,scene.camera);return ray.intersectObjects(visibleParts().map(p=>p.mesh))[0];}
 function usbKey(d){return d.detail==='contact'||d.detail==='contact-backing'?'contacts':d.detail==='cable-link'||d.detail==='usb-wire'?'cable-link':null;}
 function brainKey(hit){const d=hit.object.userData;if(d.detail==='brain-shell'||d.detail==='brain-front')return null;if(d.category!==undefined)return'category-'+d.category;const local=artifact.groups.brain.g.worldToLocal(hit.point.clone());return'category-'+Math.max(0,Math.min(3,Math.floor((.8-local.y)/.4)));}
 function describeHit(hit){const d=hit.object.userData;
  if(d.module!==undefined)return mode==='explosion'?`Módulo de ${MODULES[d.module].name} · Abrir despiece`:(MODULE_PARTS[d.detail]?.[0]??'Componente')+' · Acercar';
  if(mode==='cut')return notes.find(n=>n.id===usbKey(d))?.title??'Conector USB';
  if(mode==='transparency')return notes.find(n=>n.id===brainKey(hit))?.title??'Cerebro';
  return d.region==='usb'?'Conector USB · Abrir corte lateral':d.region==='brain'?'Cerebro · Revelar interior':COMPONENTS[d.region]?.[0]??'';
 }
 function activateHit(hit){const d=hit.object.userData;
  if(d.module!==undefined){if(mode==='explosion')setMode('disassembly',{index:d.module});else if(MODULE_PARTS[d.detail])openPart(d.detail);}
  else if(d.region==='usb'){if(mode!=='cut')setMode('cut');else showNote(usbKey(d));}
  else if(d.region==='brain'){if(mode!=='transparency')setMode('transparency');else showNote(brainKey(hit));}
  else componentInfo(d.region);
 }
 // Mesh positions are not geometry centres for curved wires; transform the bounding-box centre instead.
 function anchor(obj){const v=new THREE.Vector3();if(Array.isArray(obj)){const box=new THREE.Box3();obj.forEach(mesh=>box.expandByObject(mesh));return box.getCenter(v);}if(obj.isMesh){if(!obj.geometry.boundingBox)obj.geometry.computeBoundingBox();obj.geometry.boundingBox.getCenter(v);return obj.localToWorld(v);}return new THREE.Box3().setFromObject(obj).getCenter(v);}
 function placeAnnotations(entries,width,height){
  leaders.setAttribute('viewBox',`0 0 ${width} ${height}`);const labelWidth=Math.min(124,Math.max(67,width*.27)),minY=mode==='explosion'?35:77,maxY=height-65,gap=36;
  for(const side of [0,1]){
   const rail=entries.filter(e=>e.h.side===side).sort((a,b)=>a.y-b.y),x=side?width-labelWidth/2-4:labelWidth/2+4;
   rail.forEach((e,i)=>e.labelY=Math.max(minY,Math.min(maxY,e.y),i?rail[i-1].labelY+gap:minY));
   for(let i=rail.length-1;i>=0;i--)rail[i].labelY=Math.min(rail[i].labelY,maxY-(rail.length-1-i)*gap);
   rail.forEach(e=>{
    const {h,labelY}=e,endX=x+(side?-1:1)*labelWidth/2,elbowX=endX+(side?-10:10),ax=Math.max(2,Math.min(width-2,e.x)),ay=Math.max(2,Math.min(height-2,e.y));
    h.button.style.width=labelWidth+'px';h.button.style.left=x+'px';h.button.style.top=labelY+'px';h.line.setAttribute('points',`${ax},${ay} ${elbowX},${labelY} ${endX},${labelY}`);h.dot.setAttribute('cx',ax);h.dot.setAttribute('cy',ay);
   });
  }
 }
 function setVisible(h,visible){h.button.hidden=!visible;h.button.disabled=!visible;h.button.setAttribute('aria-hidden',String(!visible));h.button.tabIndex=visible?0:-1;h.line.style.display=h.dot.style.display=visible?'':'none';}
 function layoutFallback(){const width=stage.clientWidth||400,height=stage.clientHeight||600,entries=[];hotspots.forEach(h=>{const visible=h.visible();setVisible(h,visible);if(visible)entries.push({h,x:h.fallback[0]/100*width,y:h.fallback[1]/100*height});});placeAnnotations(entries,width,height);}
 if(scene){
  const canvas=scene.renderer.domElement;
  canvas.addEventListener('pointerdown',e=>{pointer={x:e.clientX,y:e.clientY};dragged=false;});
  canvas.addEventListener('pointermove',e=>{if(pointer&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)>7)dragged=true;clearHighlight();const hit=dragged?null:pick(e);canvas.style.cursor=hit?'pointer':'grab';const tip=$('#chipTooltip');tip.hidden=!hit;if(hit){const m=hit.object.material;if(m.emissive){m.emissive.setHex(0x6b8d48);m.emissiveIntensity=.3;}const r=stage.getBoundingClientRect();tip.textContent=describeHit(hit);tip.style.left=`${Math.min(r.width-170,Math.max(8,e.clientX-r.left+12))}px`;tip.style.top=`${Math.max(8,e.clientY-r.top-30)}px`;}});
  canvas.addEventListener('pointerleave',()=>{clearHighlight();$('#chipTooltip').hidden=true;});
  canvas.addEventListener('pointerup',e=>{const click=pointer&&!dragged&&Math.hypot(e.clientX-pointer.x,e.clientY-pointer.y)<7;pointer=null;dragged=false;if(click){const hit=pick(e);if(hit)activateHit(hit);}});
  scene.update=()=>{artifact.g.updateMatrixWorld(true);const entries=[];hotspots.forEach(h=>{let visible=h.visible()&&!(mode==='explosion'&&amount.v<20);const obj=visible?h.target():null,v=obj?anchor(obj).project(scene.camera):null;visible=visible&&v!==null&&v.z<=1&&v.z>=-1;setVisible(h,visible);if(visible)entries.push({h,x:(v.x*.5+.5)*scene.el.clientWidth,y:(-v.y*.5+.5)*scene.el.clientHeight});});placeAnnotations(entries,scene.el.clientWidth,scene.el.clientHeight);};
 }else{new ResizeObserver(layoutFallback).observe(stage);}
 $('#inspectorBack').onclick=()=>setMode(mode==='zoom'?'disassembly':'explosion',{animate:false});$('#resetChip').onclick=()=>{$('#chipScale').value=100;$('#scaleValue').value='100%';setMode('explosion');};
 $('#chipScale').oninput=e=>{$('#scaleValue').value=e.target.value+'%';apply();if(mode==='zoom')frame();};$('#explode').oninput=e=>{tween?.kill();amount.v=+e.target.value;apply();sync();};$('#disassembly').oninput=e=>{tween?.kill();amount.v=+e.target.value;apply();sync();};$('#zoomRange').oninput=e=>{$('#zoomValue').value=e.target.value+'%';frame();};
 $('#autoExplode').onclick=()=>{tween?.kill();tween=gsap.to(amount,{v:amount.v>80?0:100,duration:isReduced()?0:2.2,onUpdate:()=>{apply();sync();}});};
 setMode('explosion',{animate:false});new IntersectionObserver(([e])=>{if(e.isIntersecting&&!firstPlayed){firstPlayed=true;setMode('explosion');}},{threshold:.2}).observe(stage);
 return{scene,extract:()=>{if(!firstPlayed){firstPlayed=true;setMode('explosion');}},setMode,getMode:()=>mode};
}
