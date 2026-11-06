import * as THREE from './vendor/three.module.js';
import {createNexus} from './artifact.js';
export function createSoma({surfaceData}={}){
 const g=new THREE.Group(),rig={arms:[],legs:[]},motion={wave:0,energy:0,walk:0};let loaded=false,surface;
 const bones=[];function bone(name,parent,position){const b=new THREE.Bone();b.name=name;b.position.set(...position);(parent??g).add(b);bones.push(b);return b;}
 const pelvis=bone('Pelvis',null,[0,-.25,0]);rig.body=pelvis;
 const spine=bone('Spine',pelvis,[0,.4,0]),chest=bone('Chest',spine,[0,.48,0]),neck=bone('Neck',chest,[0,.45,0]),head=bone('Head',neck,[0,.20,0]);rig.head=head;
 const torsoIndices={pelvis:0,spine:1,chest:2,neck:3,head:4};
 for(const side of [-1,1]){const shoulder=bone(`UpperArm_${side}`,chest,[side*.48,.17,0]);const elbow=bone(`Forearm_${side}`,shoulder,[side*.11,-.67,.012]);const hand=bone(`Hand_${side}`,elbow,[side*.07,-.62,.023]);rig.arms.push({side,shoulder,elbow,hand,ids:[bones.indexOf(shoulder),bones.indexOf(elbow),bones.indexOf(hand)]});
 const hip=bone(`Thigh_${side}`,pelvis,[side*.19,-.1,0]),knee=bone(`Shin_${side}`,hip,[side*.025,-.79,.022]),foot=bone(`Foot_${side}`,knee,[side*.013,-.80,-.022]);rig.legs.push({side,hip,knee,foot,ids:[bones.indexOf(hip),bones.indexOf(knee),bones.indexOf(foot)]});}
 const white=new THREE.MeshStandardMaterial({color:0xf1f0e9,roughness:.61,metalness:.01});
 function attachGeometry(buffer){const header=new DataView(buffer);if(header.getUint32(0,true)!==0x534f4d41)throw Error('Formato de SOMA incorrecto');const n=header.getUint32(8,true),num=header.getUint32(12,true),bits=header.getUint32(16,true);const raw=new Int16Array(buffer,24,n*6),positions=new Float32Array(n*3),normals=new Float32Array(n*3),skinIndex=new Uint16Array(n*4),skinWeight=new Float32Array(n*4);
 const clamp=t=>Math.max(0,Math.min(1,t));const blend=(a,b,t)=>[a,b,clamp(t)];
 for(let i=0;i<n;i++){for(let j=0;j<3;j++){positions[i*3+j]=raw[i*6+j]/10000;normals[i*3+j]=raw[i*6+3+j]/32767;}const x=positions[i*3],y=positions[i*3+1],xx=Math.abs(x),side=x<0?0:1;let pair;
 if(y>1.23)pair=blend(torsoIndices.neck,torsoIndices.head,(y-1.23)/.1);
 else if(y>.98)pair=blend(torsoIndices.chest,torsoIndices.neck,(y-.98)/.1);
 else if((xx>.40&&y>.08&&y<.89)||(xx>.48&&y<=.08&&y>-.99)){const a=rig.arms[side].ids;if(y>.25)pair=[a[0],a[0],0];else if(y>-.36)pair=blend(a[0],a[1],(.25-y)/.25);else pair=blend(a[1],a[2],(-.36-y)/.18);}
 else if(y<-.38){const a=rig.legs[side].ids;if(y>-.6)pair=blend(torsoIndices.pelvis,a[0],(-.38-y)/.22);else if(y>-1.0)pair=[a[0],a[0],0];else if(y>-1.83)pair=blend(a[0],a[1],(-1-y)/.27);else pair=blend(a[1],a[2],(-1.83-y)/.18);}
 else if(y>.18)pair=blend(torsoIndices.spine,torsoIndices.chest,(y-.18)/.48);else pair=blend(torsoIndices.pelvis,torsoIndices.spine,(y+.1)/.4);
 skinIndex[i*4]=pair[0];skinIndex[i*4+1]=pair[1];skinWeight[i*4]=1-pair[2];skinWeight[i*4+1]=pair[2];}
 const offset=24+n*12;const indices=bits===32?new Uint32Array(buffer,offset,num):new Uint16Array(buffer,offset,num);const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(normals,3));geo.setAttribute('skinIndex',new THREE.BufferAttribute(skinIndex,4));geo.setAttribute('skinWeight',new THREE.BufferAttribute(skinWeight,4));geo.setIndex(new THREE.BufferAttribute(indices,1));geo.computeBoundingSphere();
 surface=new THREE.SkinnedMesh(geo,white);surface.name='SOMA — continuous human surface';g.add(surface);surface.add(pelvis);g.updateMatrixWorld(true);surface.bind(new THREE.Skeleton(bones));surface.frustumCulled=false;loaded=true;socket.visible=true;g.userData.loaded=true;return surface;
 }
 // The aperture is subtracted from the skin surface; only its recessed interior is added.
 const socket=new THREE.Group();socket.name='Embedded neck socket';socket.visible=false;socket.position.set(0,.05,.067);neck.add(socket);
 const dark=new THREE.MeshStandardMaterial({color:0x0d1612,roughness:.8});const metal=new THREE.MeshStandardMaterial({color:0xa9b0a8,metalness:.6,roughness:.4});const add=(geo,mat,p)=>{const m=new THREE.Mesh(geo,mat);m.position.set(...p);socket.add(m);return m;};
 add(new THREE.BoxGeometry(.135,.059,.008),dark,[0,0,0]);for(const side of [-1,1])add(new THREE.BoxGeometry(.006,.061,.034),dark,[side*.067,0,.018]);for(const side of [-1,1])add(new THREE.BoxGeometry(.135,.005,.034),dark,[0,side*.029,.018]);const gold=new THREE.MeshStandardMaterial({color:0xb99354,metalness:.75,roughness:.35});for(let i=0;i<4;i++)add(new THREE.BoxGeometry(.012,.007,.023),gold,[(i-1.5)*.026,-.02,.012]);
 const socketAnchor=new THREE.Object3D();socketAnchor.position.set(0,0,.043);socket.add(socketAnchor);
 const chip=createNexus({lightweight:true}).g;chip.scale.setScalar(.05);const chipHome=new THREE.Vector3(0,.05-2.54*.05,.056);chip.position.copy(chipHome);chip.visible=false;neck.add(chip);
 // A small inserted connector lip stays inside the recess, without a raised housing.
 const insertedLip=add(new THREE.BoxGeometry(.10,.027,.009),metal,[0,0,.025]);insertedLip.visible=false;
 function socketHover(on){dark.emissive.setHex(on?0x5f9e32:0);dark.emissiveIntensity=on?.5:0;}
 function pose(t,{reduced=false,active=false}={}){if(!loaded)return;const stride=Math.sin(t*5),breath=Math.sin(t*1.5),walk=reduced?0:motion.walk,wave=reduced?0:motion.wave;
 pelvis.position.y=-.25+(reduced?0:Math.abs(stride)*.025*walk+motion.energy*.035);pelvis.rotation.z=reduced?0:Math.sin(t*.7)*.009;spine.rotation.x=reduced?0:breath*.009;chest.rotation.y=reduced?0:Math.sin(t*.45)*.025;head.rotation.y=reduced?0:Math.sin(t*.6)*.12;head.rotation.z=reduced?0:Math.sin(t*.8)*.02;
 rig.arms.forEach(({side,shoulder,elbow},i)=>{shoulder.rotation.x=-stride*.34*walk*(i?1:-1);shoulder.rotation.z=side*(.025+(reduced?0:breath*.012));elbow.rotation.x=-.025-Math.max(0,stride)*.15*walk;elbow.rotation.z=0;if(side===1){shoulder.rotation.z+=wave*1.5;shoulder.rotation.x-=wave*.15;elbow.rotation.z=wave*(.3+Math.sin(t*7)*.12);}});
 rig.legs.forEach(({hip,knee,foot},i)=>{const v=stride*(i?1:-1);hip.rotation.x=v*.35*walk;knee.rotation.x=Math.max(0,-v)*.45*walk;foot.rotation.x=-v*.10*walk;});g.position.y=active&&!reduced?Math.sin(t*.9)*.005:0;insertedLip.visible=chip.visible&&Math.abs(chip.position.z-chipHome.z)<.015;
 }
 const ready=surfaceData?Promise.resolve(attachGeometry(surfaceData)):fetch(new URL('./assets/soma-surface.bin',import.meta.url)).then(r=>{if(!r.ok)throw Error('No se pudo cargar SOMA');return r.arrayBuffer();}).then(attachGeometry);
 return{g,chip,chipHome,socket,socketAnchor,socketHover,rig,motion,pose,ready,get surface(){return surface;}};
}
