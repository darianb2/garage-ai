import{g as e,p as t,u as n}from"./index-DPOfLkq1.js";import{A as r,E as i,M as a,N as o,a as s,b as c,c as l,d as u,i as d,k as f,m as p,n as m,o as h,r as g,s as _,t as v,y}from"./webgl-CDtnD5pp.js";var b={uniforms:{tDiffuse:{value:null},h:{value:1/512}},vertexShader:`
      varying vec2 vUv;

      void main() {

        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

      }
  `,fragmentShader:`
    uniform sampler2D tDiffuse;
    uniform float h;

    varying vec2 vUv;

    void main() {

    	vec4 sum = vec4( 0.0 );

    	sum += texture2D( tDiffuse, vec2( vUv.x - 4.0 * h, vUv.y ) ) * 0.051;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x - 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 1.0 * h, vUv.y ) ) * 0.1531;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 2.0 * h, vUv.y ) ) * 0.12245;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 3.0 * h, vUv.y ) ) * 0.0918;
    	sum += texture2D( tDiffuse, vec2( vUv.x + 4.0 * h, vUv.y ) ) * 0.051;

    	gl_FragColor = sum;

    }
  `},x={uniforms:{tDiffuse:{value:null},v:{value:1/512}},vertexShader:`
    varying vec2 vUv;

    void main() {

      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );

    }
  `,fragmentShader:`

  uniform sampler2D tDiffuse;
  uniform float v;

  varying vec2 vUv;

  void main() {

    vec4 sum = vec4( 0.0 );

    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 4.0 * v ) ) * 0.051;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y - 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y ) ) * 0.1633;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 1.0 * v ) ) * 0.1531;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 2.0 * v ) ) * 0.12245;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 3.0 * v ) ) * 0.0918;
    sum += texture2D( tDiffuse, vec2( vUv.x, vUv.y + 4.0 * v ) ) * 0.051;

    gl_FragColor = sum;

  }
  `},S=e(t()),C=1e-5;function w(e,t,n){let i=new r,a=n-C;return i.absarc(C,C,C,-Math.PI/2,-Math.PI,!0),i.absarc(C,t-a*2,C,Math.PI,Math.PI/2,!0),i.absarc(e-a*2,t-a*2,C,Math.PI/2,0,!0),i.absarc(e-a*2,C,C,0,-Math.PI/2,!0),i}var T=S.forwardRef(function({args:[e=1,t=1,n=1]=[],radius:r=.05,steps:i=1,smoothness:a=4,bevelSegments:o=4,creaseAngle:c=.4,children:l,...u},d){return S.createElement(`mesh`,s({ref:d},u),S.createElement(E,{args:[e,t,n],radius:r,steps:i,smoothness:a,bevelSegments:o,creaseAngle:c}),l)}),E=S.forwardRef(function({args:[e=1,t=1,n=1]=[],radius:r=.05,steps:i=1,smoothness:a=4,bevelSegments:o=4,creaseAngle:c=.4,...l},u){let f=S.useMemo(()=>w(e,t,r),[e,t,r]),p=S.useMemo(()=>({depth:n-r*2,bevelEnabled:!0,bevelSegments:o*2,steps:i,bevelSize:r-C,bevelThickness:r,curveSegments:a}),[n,r,a,o,i]),m=S.useRef(null);return S.useLayoutEffect(()=>{m.current&&(m.current.center(),d(m.current,c))},[f,p,c]),S.useImperativeHandle(u,()=>m.current),S.createElement(`extrudeGeometry`,s({ref:m,args:[f,p]},l))}),D=S.forwardRef(({scale:e=10,frames:t=1/0,opacity:n=1,width:r=1,height:a=1,blur:u=1,near:d=0,far:m=10,resolution:h=512,smooth:g=!0,color:v=`#000000`,depthWrite:C=!1,renderOrder:w,...T},E)=>{let D=S.useRef(null),O=l(e=>e.scene),k=l(e=>e.gl),A=S.useRef(null);r*=Array.isArray(e)?e[0]:e||1,a*=Array.isArray(e)?e[1]:e||1;let[j,M,N,P,F,I,L]=S.useMemo(()=>{let e=new o(h,h),t=new o(h,h);t.texture.generateMipmaps=e.texture.generateMipmaps=!1;let n=new i(r,a).rotateX(Math.PI/2),s=new y(n),l=new c;l.depthTest=l.depthWrite=!1,l.onBeforeCompile=e=>{e.uniforms={...e.uniforms,ucolor:{value:new p(v)}},e.fragmentShader=e.fragmentShader.replace(`void main() {`,`uniform vec3 ucolor;
           void main() {
          `),e.fragmentShader=e.fragmentShader.replace(`vec4( vec3( 1.0 - fragCoordZ ), opacity );`,`vec4( ucolor * fragCoordZ * 2.0, ( 1.0 - fragCoordZ ) * 1.0 );`)};let u=new f(b),d=new f(x);return d.depthTest=u.depthTest=!1,[e,n,l,s,u,d,t]},[h,r,a,e,v]),R=e=>{P.visible=!0,P.material=F,F.uniforms.tDiffuse.value=j.texture,F.uniforms.h.value=e*1/256,k.setRenderTarget(L),k.render(P,A.current),P.material=I,I.uniforms.tDiffuse.value=L.texture,I.uniforms.v.value=e*1/256,k.setRenderTarget(j),k.render(P,A.current),P.visible=!1},z=0,B,V;return _(()=>{A.current&&(t===1/0||z<t)&&(z++,B=O.background,V=O.overrideMaterial,D.current.visible=!1,O.background=null,O.overrideMaterial=N,k.setRenderTarget(j),k.render(O,A.current),R(u),g&&R(u*.4),k.setRenderTarget(null),D.current.visible=!0,O.overrideMaterial=V,O.background=B)}),S.useImperativeHandle(E,()=>D.current,[]),S.createElement(`group`,s({"rotation-x":Math.PI/2},T,{ref:D}),S.createElement(`mesh`,{renderOrder:w,geometry:M,scale:[1,-1,1],rotation:[-Math.PI/2,0,0]},S.createElement(`meshBasicMaterial`,{transparent:!0,map:j.texture,opacity:n,depthWrite:C})),S.createElement(`orthographicCamera`,{ref:A,args:[-r/2,r/2,a/2,-a/2,d,m]}))}),O=n();function k({position:e}){return(0,O.jsxs)(`mesh`,{position:e,rotation:[Math.PI/2,0,0],castShadow:!0,children:[(0,O.jsx)(`cylinderGeometry`,{args:[.36,.36,.26,28]}),(0,O.jsx)(`meshStandardMaterial`,{color:`#0f0f11`,metalness:.4,roughness:.5})]})}function A({system:e,selected:t,onSelect:n}){let r=t===e.key;return(0,O.jsxs)(`mesh`,{position:e.hotspot,onClick:t=>{t.stopPropagation(),n(r?null:e.key)},onPointerOver:e=>{e.stopPropagation(),document.body.style.cursor=`pointer`},onPointerOut:()=>{document.body.style.cursor=`auto`},children:[(0,O.jsx)(`sphereGeometry`,{args:[r?.14:.1,16,16]}),(0,O.jsx)(`meshStandardMaterial`,{color:r?`#5a8cf0`:`#7ba3f4`,emissive:r?`#5a8cf0`:`#22376e`,emissiveIntensity:r?1:.5})]})}function j(){return(0,O.jsxs)(O.Fragment,{children:[(0,O.jsx)(T,{args:[3.6,.55,1.7],radius:.12,smoothness:4,position:[0,.5,0],castShadow:!0,children:(0,O.jsx)(`meshStandardMaterial`,{color:`#5a8cf0`,metalness:.5,roughness:.35})}),(0,O.jsx)(T,{args:[1.9,.5,1.45],radius:.14,smoothness:4,position:[-.15,.95,0],castShadow:!0,children:(0,O.jsx)(`meshStandardMaterial`,{color:`#18181b`,metalness:.3,roughness:.2})}),(0,O.jsx)(T,{args:[1.2,.07,.32],radius:.03,smoothness:2,position:[1.05,.79,0],children:(0,O.jsx)(`meshStandardMaterial`,{color:`#27272a`,metalness:.6,roughness:.4})}),(0,O.jsx)(k,{position:[1.15,.35,.85]}),(0,O.jsx)(k,{position:[1.15,.35,-.85]}),(0,O.jsx)(k,{position:[-1.15,.35,.85]}),(0,O.jsx)(k,{position:[-1.15,.35,-.85]})]})}function M({model:e,config:t}){let{scene:n}=g(e.url),r=l(e=>e.invalidate),i=e.rotation??[0,0,0],o=(0,S.useMemo)(()=>{let e=n.clone(!0);return e.rotation.set(i[0],i[1],i[2]),e.updateMatrixWorld(!0),e},[n,i[0],i[1],i[2]]),s=(0,S.useMemo)(()=>{if(e.scale!=null)return{scale:e.scale,position:e.position??[0,0,0]};let t=new u().setFromObject(o),n=new a,r=new a;t.getSize(n),t.getCenter(r);let i=3.4/(Math.max(n.x,n.y,n.z)||1);return{scale:i,position:[-r.x*i,-t.min.y*i,-r.z*i]}},[o,e]),c=t?.paint??null,d=t?.paintTargets??null;return(0,S.useLayoutEffect)(()=>{if(!d?.length)return;let e=new Set(d),t=t=>{if(!e.has(t.name)||!c&&!t.userData?.__paintClone)return t;let n=t;return t.userData?.__paintClone||(n=t.clone(),n.userData={...n.userData,__paintClone:!0,__origColor:t.color.clone(),__origMetal:t.metalness}),c?(n.color.set(c),n.metalness=0):(n.color.copy(n.userData.__origColor),n.metalness=n.userData.__origMetal),n.needsUpdate=!0,n};o.traverse(e=>{!e.isMesh||!e.material||(e.material=Array.isArray(e.material)?e.material.map(t):t(e.material))}),r()},[o,c,d,r]),(0,O.jsx)(`primitive`,{object:o,scale:s.scale,position:s.position})}var N=class extends S.Component{state={failed:!1};static getDerivedStateFromError(){return{failed:!0}}componentDidUpdate(e){e.modelKey!==this.props.modelKey&&this.state.failed&&this.setState({failed:!1})}render(){return this.state.failed?this.props.fallback:this.props.children}};function P({spin:e=!0,systems:t=null,selected:n=null,onSelect:r=()=>{},model:i=null,config:a=null}){let o=(0,S.useRef)();return _((t,n)=>{e&&o.current&&(o.current.rotation.y+=n*.3)}),(0,O.jsxs)(`group`,{ref:o,children:[i?(0,O.jsx)(N,{modelKey:i.url,fallback:(0,O.jsx)(j,{}),children:(0,O.jsx)(S.Suspense,{fallback:null,children:(0,O.jsx)(M,{model:i,config:a})})}):(0,O.jsx)(j,{}),t&&t.filter(e=>e.hotspot).map(e=>(0,O.jsx)(A,{system:e,selected:n,onSelect:r},e.key))]})}function F(){return(0,O.jsx)(`div`,{className:`flex h-full items-center justify-center p-8 text-center`,children:(0,O.jsxs)(`div`,{className:`max-w-md`,children:[(0,O.jsx)(`p`,{className:`text-lg font-semibold text-zinc-200`,children:`3D viewer needs WebGL`}),(0,O.jsxs)(`p`,{className:`mt-2 text-sm text-zinc-400`,children:[`Your browser couldn't start a WebGL context, so the 3D model can't render here. Turn on hardware acceleration (or WebGL) and reload, or open the app in a different browser. In Chrome, visit`,` `,(0,O.jsx)(`span`,{className:`text-marble-accent`,children:`chrome://gpu`}),` to check WebGL status.`]})]})})}function I({systems:e=null,selected:t=null,onSelect:n=()=>{},model:r=null,spin:i=null,dark:a=!1,config:o=null}){let[s]=(0,S.useState)(v);if(!s)return(0,O.jsx)(F,{});let c=i??!e;return(0,O.jsxs)(h,{shadows:!0,dpr:[1,2],frameloop:c?`always`:`demand`,gl:{alpha:!0},camera:{position:[4.6,1.5,1.9],fov:45},onPointerMissed:()=>n(null),children:[!a&&(0,O.jsx)(`color`,{attach:`background`,args:[`#52525b`]}),(0,O.jsx)(`ambientLight`,{intensity:a?.7:.85}),(0,O.jsx)(`directionalLight`,{position:[5,8,5],intensity:1.2,castShadow:!0}),(0,O.jsx)(`directionalLight`,{position:[-6,4,-4],intensity:.4,color:`#5a8cf0`}),(0,O.jsx)(P,{spin:c,systems:e,selected:t,onSelect:n,model:r,config:o}),(0,O.jsx)(D,{position:[0,0,0],opacity:a?.75:.6,scale:7,blur:2.5,far:2.5}),!a&&(0,O.jsx)(`gridHelper`,{args:[24,24,`#8b8b92`,`#52525b`],position:[0,-.001,0]}),(0,O.jsx)(m,{enablePan:!1,target:[0,.45,0],minDistance:2.5,maxDistance:12})]})}export{I as default};