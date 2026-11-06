// Rebuild the authored continuous SOMA surface. No runtime remeshing is required.
import * as THREE from '../dist/vendor/three.module.js';
import {MarchingCubes} from '../dist/vendor/MarchingCubes.js';
import fs from 'node:fs';
const N=160, scale=[1.18,2.25,.57], cy=-.05;
const mc=new MarchingCubes(N,new THREE.MeshBasicMaterial(),false,false,180000);mc.isolation=0;
const ellipsoids=[],segments=[];
const ell=(x,y,z,rx,ry,rz,k=.035)=>ellipsoids.push({x,y,z,rx,ry,rz,k,minX:x-rx-.15,maxX:x+rx+.15,minY:y-ry-.15,maxY:y+ry+.15,minZ:z-rz-.15,maxZ:z+rz+.15});
const seg=(a,b,r1,r2,k=.035)=>{const dx=b[0]-a[0],dy=b[1]-a[1],dz=b[2]-a[2];segments.push({a,b,r1,r2,k,dx,dy,dz,len:dx*dx+dy*dy+dz*dz,minX:Math.min(a[0],b[0])-Math.max(r1,r2)-.1,maxX:Math.max(a[0],b[0])+Math.max(r1,r2)+.1,minY:Math.min(a[1],b[1])-Math.max(r1,r2)-.1,maxY:Math.max(a[1],b[1])+Math.max(r1,r2)+.1,minZ:Math.min(a[2],b[2])-Math.max(r1,r2)-.1,maxZ:Math.max(a[2],b[2])+Math.max(r1,r2)+.1});};
// Human proportions: rib cage, waist, pelvis, trapezius and neck blend continuously.
ell(0,-.27,0,.345,.29,.22,.07);ell(0,.10,0,.275,.4,.185,.07);ell(0,.57,0,.395,.39,.22,.075);
ell(0,.84,-.01,.39,.16,.17,.065);seg([0,.88,0],[0,1.08,0],.18,.108,.065);ell(0,1.13,0,.115,.17,.108,.025);
// Skull, jaw, chin, nose, cheekbones and ears form a neutral human face.
ell(0,1.55,-.015,.218,.302,.204,.024);ell(0,1.36,.01,.168,.135,.166,.022);ell(0,1.275,.09,.105,.045,.074,.012);
ell(0,1.535,.185,.027,.053,.045,.03);
for(const side of [-1,1]){
 ell(side*.22,1.535,-.017,.032,.066,.044,.012);
 ell(side*.445,.78,0,.15,.17,.15,.06);
 seg([side*.45,.78,0],[side*.59,.13,.012],.137,.096,.04);ell(side*.535,.43,.015,.128,.22,.115,.025);
 seg([side*.59,.13,.012],[side*.66,-.49,.035],.105,.06,.025);ell(side*.62,-.10,.025,.094,.20,.09,.025);
 ell(side*.667,-.62,.04,.068,.13,.046,.02);
 for(let finger=0;finger<4;finger++){const fx=side*(.626+finger*.026);const yy=-.84+[.015,-.008,0,.045][finger];seg([fx,-.68,.047],[fx+side*.004,yy,.048],.018,.013,.006);}
 seg([side*.612,-.56,.061],[side*.574,-.68,.08],.023,.017,.008);
 seg([side*.19,-.35,0],[side*.215,-1.14,.022],.187,.112,.048);ell(side*.20,-.64,.0,.174,.27,.165,.025);
 seg([side*.215,-1.14,.022],[side*.228,-1.94,0],.112,.066,.03);ell(side*.222,-1.49,-.025,.115,.225,.111,.022);
 ell(side*.23,-2.025,.105,.1,.083,.215,.025);ell(side*.23,-2.045,.23,.102,.061,.111,.02);
}
function smin(a,b,k){const h=Math.max(k-Math.abs(a-b),0)/k;return Math.min(a,b)-h*h*k*.25;}
function box(x,y,z,cx,yy,cz,rx,ry,rz){const qx=Math.abs(x-cx)-rx,qy=Math.abs(y-yy)-ry,qz=Math.abs(z-cz)-rz;return Math.hypot(Math.max(qx,0),Math.max(qy,0),Math.max(qz,0))+Math.min(Math.max(qx,qy,qz),0);}
for(let iz=0;iz<N;iz++){const z=(iz/(N/2)-1)*scale[2];for(let iy=0;iy<N;iy++){const y=(iy/(N/2)-1)*scale[1]+cy;for(let ix=0;ix<N;ix++){const x=(ix/(N/2)-1)*scale[0];let d=2;
 for(const e of ellipsoids){if(x<e.minX||x>e.maxX||y<e.minY||y>e.maxY||z<e.minZ||z>e.maxZ)continue;const xx=(x-e.x)/e.rx,yy=(y-e.y)/e.ry,zz=(z-e.z)/e.rz;const dd=(Math.sqrt(xx*xx+yy*yy+zz*zz)-1)*Math.min(e.rx,e.ry,e.rz);d=smin(d,dd,e.k);}
 for(const s of segments){if(x<s.minX||x>s.maxX||y<s.minY||y>s.maxY||z<s.minZ||z>s.maxZ)continue;const t=Math.max(0,Math.min(1,((x-s.a[0])*s.dx+(y-s.a[1])*s.dy+(z-s.a[2])*s.dz)/s.len));const dd=Math.hypot(x-s.a[0]-t*s.dx,y-s.a[1]-t*s.dy,z-s.a[2]-t*s.dz)-(s.r1+(s.r2-s.r1)*t);d=smin(d,dd,s.k);}
 // A shallow, rounded horizontal opening is subtracted directly from neck skin.
 if(Math.abs(x)<.11&&y>1.05&&y<1.21&&z>.035){const cavity=box(x,y,z,0,1.13,.125,.071,.034,.068)-.006;d=Math.max(d,-cavity);}
 // Subtle eye sockets, no separate eyes or robot panels.
 if(y>1.54&&y<1.66&&z>.15){for(const sx of [-.08,.08]){const e=(Math.sqrt(((x-sx)/.046)**2+((y-1.60)/.025)**2+((z-.193)/.026)**2)-1)*.025;d=Math.max(d,-e);}}
 d=Math.max(d,-2.116-y);mc.field[iz*N*N+iy*N+ix]=-d;
}}}
mc.update();const count=mc.count;const p=mc.geometry.attributes.position.array;const normals=mc.geometry.attributes.normal.array;
const vertices=[],normalsOut=[],indices=[],lookup=new Map();
for(let i=0;i<count;i++){const x=p[i*3]*scale[0],y=p[i*3+1]*scale[1]+cy,z=p[i*3+2]*scale[2];const key=`${Math.round(x*1e5)},${Math.round(y*1e5)},${Math.round(z*1e5)}`;let id=lookup.get(key);if(id===undefined){id=vertices.length/3;lookup.set(key,id);vertices.push(x,y,z);const n=new THREE.Vector3(normals[i*3]/scale[0],normals[i*3+1]/scale[1],normals[i*3+2]/scale[2]).normalize();normalsOut.push(n.x,n.y,n.z);}indices.push(id);}
const vertexCount=vertices.length/3,index32=vertexCount>65535;const header=Buffer.alloc(24);header.writeUInt32LE(0x534f4d41,0);header.writeUInt32LE(1,4);header.writeUInt32LE(vertexCount,8);header.writeUInt32LE(indices.length,12);header.writeUInt32LE(index32?32:16,16);
const packed=new Int16Array(vertexCount*6);for(let i=0;i<vertexCount;i++){for(let j=0;j<3;j++){packed[i*6+j]=Math.round(vertices[i*3+j]*10000);packed[i*6+3+j]=Math.round(normalsOut[i*3+j]*32767);}}
const packedIndices=index32?new Uint32Array(indices):new Uint16Array(indices);const buffer=Buffer.concat([header,Buffer.from(packed.buffer),Buffer.from(packedIndices.buffer)]);fs.writeFileSync(new URL('../dist/assets/soma-surface.bin',import.meta.url),buffer);console.log(JSON.stringify({vertices:vertexCount,triangles:indices.length/3,bytes:buffer.length,resolution:N,index32}));
