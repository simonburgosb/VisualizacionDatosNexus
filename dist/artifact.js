import * as THREE from './vendor/three.module.js';
export const MODULES=[
 {name:'Memoria',color:0x66d575,items:['Sensorial','A largo plazo','A corto plazo']},
 {name:'Consciencia',color:0x3dadff,items:['Superyó','Yo']},
 {name:'Habilidades',color:0xff9e42,items:['Conocimientos','Experiencias']},
 {name:'Personalidad',color:0x874fff,items:['Carácter','Valores']}
];
export const STATES=[{name:'Óptimo',color:0x3dadff},{name:'Estable',color:0x66d575},{name:'Fallas',color:0xff9e42},{name:'Inactivo / faltante',color:0x874fff}];
export const COMPONENTS={
 usb:['Conector USB','Se conecta al cuello de los SOMA, permitiendo establecer una conexión.'],
 cables:['Cables de enlace','Comunican el conector con el cerebro, permitiendo la transferencia de los módulos entrantes.'],
 brain:['Cerebro','Recibe los cuatro elementos principales del SOMA anfitrión.'],
 modules:['Módulos','Los cuatro elementos principales de un SOMA.'],
 life:['Indicador de vida','Indica el estado actual del chip y cuándo requiere un cambio.']
};
export const MODULE_PARTS={
 shell:['Carcasa protectora','Protege el interior del módulo.'],
 receiver:['Módulos de recepción de elementos','Reciben los elementos transferidos desde el cerebro.'],
 link:['Enlace del elemento (cerebro–módulo)','Une el cerebro con el módulo para transferir el elemento.'],
 copper:['Contactos de conexión de cobre','Conexiones de cobre entre los receptores y el interior del módulo.'],
 core:['Núcleo del módulo','Conjunto central situado bajo los receptores de elementos.'],
 lens:['Lente luminoso del módulo','Notifica la estabilidad de cada elemento: azul, óptimo; verde, estable; naranja, fallas; morado, inactivo o faltante.']
};
export const USB_CONTACT_COLORS=[0x1e1e1e,0x757575,0xb3b3b3,0xd9d9d9];
// These are the two callouts in the reference's lateral cut; the four contacts form one group.
export const USB_PARTS={
 'cable-link':['Conexión de cables','Conexión del cableado en el interior del conector USB.'],
 contacts:['Componentes de conexión','Los cuatro componentes de conexión hacen referencia a los módulos.']
};
export function createNexus({lightweight=false}={}){
 const g=new THREE.Group(),parts=[],groups={},modules=[];
 const white=new THREE.MeshStandardMaterial({color:0x757575,metalness:.25,roughness:.35,side:THREE.DoubleSide});
 const grey=new THREE.MeshStandardMaterial({color:0x424242,metalness:.6,roughness:.3,side:THREE.DoubleSide});
 const copper=new THREE.MeshStandardMaterial({color:0xd99555,metalness:.8,roughness:.22,side:THREE.DoubleSide});
 const dark=new THREE.MeshStandardMaterial({color:0x182c25,roughness:.65,side:THREE.DoubleSide});
 function group(key,position,offset){const o=new THREE.Group();o.position.set(...position);g.add(o);groups[key]={g:o,base:o.position.clone(),offset:new THREE.Vector3(...offset)};return o;}
 function add(parent,geo,mat,position,key,detail,offset=[0,0,0],module){const m=new THREE.Mesh(geo,mat.clone());m.position.set(...position);parent.add(m);m.userData={region:key,detail,module};parts.push({mesh:m,base:m.position.clone(),offset:new THREE.Vector3(...offset),region:key,detail,module});return m;}
 function box(parent,size,pos,key,detail,mat=white,offset,module){return add(parent,new THREE.BoxGeometry(...size),mat,pos,key,detail,offset,module);}
 function tube(parent,points,r,mat,key,detail,offset,module){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));return add(parent,new THREE.TubeGeometry(curve,lightweight?10:28,r,lightweight?5:8,false),mat,[0,0,0],key,detail,offset,module);}
 function panelTexture(draw,w=768,h=768){if(typeof document==='undefined'||lightweight)return null;const c=document.createElement('canvas');c.width=w;c.height=h;const ctx=c.getContext('2d');if(!ctx)return null;draw(ctx,w,h);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}
 const usb=group('usb',[0,1.86,0],[0,1.15,0]);
 box(usb,[.72,.12,.2],[0,.68,0],'usb','connector');
 // The USB cut is lateral (+X). The front face remains intact in every view.
 box(usb,[1.05,1.28,.045],[0,0,-.35],'usb','usb-shell');
 box(usb,[.045,1.28,.7],[-.51,0,0],'usb','usb-shell');
 const usbSide=box(usb,[.045,1.28,.7],[.51,0,0],'usb','usb-side');
 box(usb,[1.05,.045,.7],[0,.62,0],'usb','usb-shell');box(usb,[1.05,.045,.7],[0,-.62,0],'usb','usb-shell');
 const usbFront=box(usb,[1.05,1.28,.04],[0,0,.35],'usb','usb-front');
 const shape=new THREE.Shape();shape.moveTo(-.35,-.64);shape.lineTo(.35,-.64);shape.lineTo(.35,.64);shape.lineTo(-.35,.64);shape.closePath();
 const hole=new THREE.Path();hole.moveTo(-.3,-.53);hole.lineTo(-.3,.49);hole.lineTo(.3,.49);hole.lineTo(.3,-.53);hole.closePath();shape.holes.push(hole);
 const cutSide=add(usb,new THREE.ExtrudeGeometry(shape,{depth:.045,bevelEnabled:false}),white,[.49,0,0],'usb','cut-surface');cutSide.rotation.y=Math.PI/2;cutSide.visible=false;
 [-.29,.29].forEach(x=>{const ring=add(usb,new THREE.RingGeometry(.115,.143,32),grey,[x,.27,.375],'usb','oval');ring.scale.y=1.65;const inside=add(usb,new THREE.CircleGeometry(.114,32),white,[x,.27,.376],'usb','oval');inside.scale.y=1.65;});
 box(usb,[.68,.065,.025],[0,.055,.375],'usb','slot',grey);
 const usbContacts=[];
 const panel=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.65,side:THREE.DoubleSide});box(usb,[.035,.72,.58],[.305,-.19,0],'usb','contact-backing',panel);
 // Four neutral contacts under the separate orange cable connection, as in the PDF.
 for(let i=0;i<4;i++){const mat=new THREE.MeshStandardMaterial({color:USB_CONTACT_COLORS[i],metalness:.15,roughness:.6});const contact=box(usb,[.08,.145,.31],[.37,.065-i*.155,.115],'usb','contact',mat);contact.userData.contact=i;usbContacts.push(contact);}
 const cableOrange=new THREE.MeshStandardMaterial({color:0xff9e42,roughness:.4,metalness:.15});box(usb,[.095,.11,.22],[.38,.32,.14],'usb','cable-link',cableOrange);
 tube(usb,[[.42,.32,.015],[.42,.37,-.09],[.42,.49,-.2],[.42,.46,-.3]],.014,new THREE.MeshStandardMaterial({color:0x1e1e1e,roughness:.6}),'usb','usb-wire');
 const cableGroup=group('cables',[0,0,0],[0,.52,0]);const startX=[-.48,-.36,-.22,.14,.34,.49],endX=[-.51,-.16,.07,.16,.3,.47];
 startX.forEach((x,i)=>{tube(cableGroup,[[x,1.23,.02],[x+(i%2?.1:-.1),1.05,.1],[endX[i],.74,.09],[endX[i],.57,.02]],.014,grey,'cables','wire');add(cableGroup,new THREE.SphereGeometry(.045,12,10),grey,[x,1.23,.02],'cables','socket');add(cableGroup,new THREE.SphereGeometry(.045,12,10),grey,[endX[i],.57,.02],'cables','socket');});
 const brain=group('brain',[0,-.31,0],[0,.05,0]),brainShell=[];
 brainShell.push(box(brain,[1.24,1.72,.04],[0,0,-.16],'brain','brain-shell'));
 [-1,1].forEach(side=>brainShell.push(box(brain,[.035,1.72,.33],[side*.607,0,0],'brain','brain-shell')));
 const brainFront=box(brain,[1.24,1.72,.045],[0,0,.185],'brain','brain-front');brainShell.push(brainFront);
 const channels=[];
 MODULES.forEach((m,i)=>{const tray=box(brain,[1.09,.35,.035],[0,.6-i*.4,.02],'brain','category',grey);tray.userData.category=i;channels.push(tray);const c=new THREE.MeshStandardMaterial({color:m.color,emissive:m.color,emissiveIntensity:.12,roughness:.5});const block=box(brain,[.32,.23,.035],[.32,.6-i*.4,.05],'brain','category',c);block.userData.category=i;});
 const brainTex=panelTexture((c,w,h)=>{c.fillStyle='#b3b3b3';c.fillRect(0,0,w,h);MODULES.forEach((m,i)=>{const yy=15+i*188;c.fillStyle='#e6e6e6';c.fillRect(15,yy,738,172);c.strokeStyle='#757575';c.lineWidth=3;c.strokeRect(15,yy,738,172);c.fillStyle='#1e1e1e';c.font='bold 34px sans-serif';c.textAlign='left';c.fillText(m.name,35,yy+94);const color='#'+m.color.toString(16).padStart(6,'0');m.items.forEach((name,j)=>{const sy=yy+19+j*(142/m.items.length);c.strokeStyle=color;c.lineWidth=4;c.beginPath();c.moveTo(265,yy+83);c.lineTo(365,sy+18);c.lineTo(390,sy+18);c.stroke();c.fillStyle=color;c.fillRect(395,sy,335,36);c.fillStyle='#11241b';c.font='25px sans-serif';c.fillText(name,410,sy+27);});});});
 const brainDiagram=add(brain,new THREE.PlaneGeometry(1.11,1.6),new THREE.MeshBasicMaterial({map:brainTex,color:brainTex?0xffffff:0x3b8962,side:THREE.DoubleSide}),[0,0,.105],'brain','diagram');
 const modGroup=group('modules',[0,0,0],[0,-.75,0]);const xs=[-.74,-.25,.25,.74];
 xs.forEach((x,i)=>{const root=new THREE.Group();root.position.set(x,-1.55,.01);modGroup.add(root);modules.push({g:root,base:root.position.clone(),offset:new THREE.Vector3((i-1.5)*.23,-.12,.05),parts:[]});
 const member=(size,pos,detail,mat,off)=>{const m=box(root,size,pos,'modules',detail,mat,off,i);modules[i].parts.push(parts[parts.length-1]);return m;};
 member([.17,1.35,.025],[0,0,-.1],'shell',white,[-.18,0,-.08]);member([.022,1.35,.2],[-.083,0,0],'shell',white,[-.22,0,0]);member([.022,1.35,.2],[.083,0,0],'shell',white,[.22,0,0]);member([.17,1.35,.025],[0,0,.11],'shell',white,[.27,0,.25]);
 const recMat=new THREE.MeshStandardMaterial({color:0xffc943,metalness:.45,roughness:.3});
 for(let r=0;r<3;r++)member([.035,.26,.05],[(r-1)*.047,.43,.005],'receiver',recMat,[(r-1)*.13,.29,.03]);
 member([.14,.075,.05],[0,.635,.01],'link',new THREE.MeshStandardMaterial({color:0xff9e42,roughness:.4}),[0,.51,0]);
 for(let j=0;j<3;j++){const xx=(j-1)*.045;tube(root,[[xx,.28,.01],[xx*.6,.2,.015],[xx,.12,.02],[xx,-.22,.02]],.006,new THREE.MeshStandardMaterial({color:0xffc943,roughness:.35,metalness:.5}),'modules','copper',[.13+j*.03,.06,.17],i);modules[i].parts.push(parts[parts.length-1]);}
 const coreMat=new THREE.MeshStandardMaterial({color:0x5ad8cc,emissive:0x2a7c73,emissiveIntensity:.2,metalness:.2,roughness:.25});
 for(let j=0;j<5;j++){const m=add(root,new THREE.SphereGeometry(.039,lightweight?8:16,12),coreMat,[(j%2?1:-1)*.032,.16-j*.083,.02],'modules','core',[0,0,.32],i);modules[i].parts.push(parts[parts.length-1]);}
 const lensMat=new THREE.MeshStandardMaterial({color:STATES[i].color,emissive:STATES[i].color,emissiveIntensity:.65,roughness:.18,metalness:.1});member([.085,.31,.035],[0,-.48,.132],'lens',lensMat,[0,-.28,.1]);
 });
 box(modGroup,[.07,1.25,.08],[0,-1.72,-.04],'modules','central-stem',grey);box(modGroup,[.3,.08,.14],[0,-2.34,0],'modules','connector',white);
 const life=group('life',[0,-2.86,0],[0,-1.2,0]);const display=add(life,new THREE.CapsuleGeometry(.37,.99,8,24),white,[0,0,0],'life','display');display.rotation.z=Math.PI/2;display.scale.z=.22;
 const lifeTex=panelTexture((c,w,h)=>{c.fillStyle='#b3b3b3';c.fillRect(0,0,w,h);c.textAlign='center';c.fillStyle='#26362e';c.font='24px sans-serif';c.fillText('Tiempo de vida restante',384,45);c.strokeStyle='#8e9890';c.lineWidth=3;c.beginPath();c.moveTo(20,65);c.lineTo(748,65);c.stroke();c.font='30px sans-serif';c.fillText('1 día 15 horas',384,123);c.strokeRect(70,171,490,24);c.fillStyle='#61d875';c.fillRect(73,174,68,18);c.fillStyle='#26362e';c.font='25px sans-serif';c.fillText('15%',659,193);},768,256);
 add(life,new THREE.PlaneGeometry(1.43,.46),new THREE.MeshBasicMaterial({map:lifeTex,color:lifeTex?0xffffff:0xdce5db,side:THREE.DoubleSide}),[0,0,.115],'life','screen');
 function assembled(){for(const {g,base}of Object.values(groups)){g.visible=true;g.position.copy(base);}modules.forEach(m=>{m.g.visible=true;m.g.position.copy(m.base);m.parts.forEach(p=>{p.mesh.position.copy(p.base);p.mesh.visible=true;});});parts.forEach(p=>{p.mesh.material.opacity=1;p.mesh.material.transparent=false;p.mesh.material.depthWrite=true;p.mesh.material.needsUpdate=true;});usbFront.visible=true;usbSide.visible=true;cutSide.visible=false;}
 function explode(v){assembled();const t=v/100;Object.values(groups).forEach(p=>p.g.position.copy(p.base).addScaledVector(p.offset,t));}
 function detailModule(index,v=100,{zoom=false}={}){assembled();Object.values(groups).forEach(p=>p.g.visible=false);groups.modules.g.visible=true;groups.modules.g.children.forEach(child=>child.visible=false);const m=modules[index];m.g.visible=true;m.g.position.set(0,0,0);m.parts.forEach(p=>{p.mesh.position.copy(p.base).addScaledVector(p.offset,zoom?0:v/100);if(zoom&&p.detail==='shell'){p.mesh.material.transparent=true;p.mesh.material.opacity=.12;p.mesh.material.depthWrite=false;}});}
 function cutaway(){assembled();Object.entries(groups).forEach(([k,p])=>p.g.visible=k==='usb');usb.position.set(0,0,0);usbSide.visible=false;cutSide.visible=true;}
 function transparency(){assembled();Object.entries(groups).forEach(([k,p])=>p.g.visible=k==='brain');brain.position.set(0,0,0);brainShell.forEach(m=>{m.material.transparent=true;m.material.opacity=.12;m.material.depthWrite=false;});}
 function restore(){assembled();groups.modules.g.children.forEach(child=>child.visible=true);}
 // Restore non-module children hidden by the previous detail view on every mode change.
 const wrap=f=>(...a)=>{restore();return f(...a)};
 return{g,parts,groups,modules,usbContacts,brainDiagram,colors:STATES.map(s=>s.color),assembled:restore,explode:wrap(explode),detailModule:wrap(detailModule),cutaway:wrap(cutaway),transparency:wrap(transparency)};
}
